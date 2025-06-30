import { useStore } from '@nanostores/react';
import { useAnimate } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useSnapScroll } from '~/lib/hooks';
import { handleChatTitleUpdate, type ResumeChatInfo } from '~/lib/persistence';
import { database } from '~/lib/persistence/chats';
import { chatStore } from '~/lib/stores/chat';
import { cubicEasingFn } from '~/utils/easings';
import { BaseChat } from '~/components/chat/BaseChat/BaseChat';
import Cookies from 'js-cookie';
import { useSearchParams } from '@remix-run/react';
import {
  simulationFinishData,
  simulationRepositoryUpdated,
  sendChatMessage,
  type ChatReference,
  abortChatMessage,
  resumeChatMessage,
} from '~/lib/replay/ChatManager';
import { getCurrentMouseData } from '~/components/workbench/PointSelector';
import { anthropicNumFreeUsesCookieName, maxFreeUses } from '~/utils/freeUses';
import { ChatMessageTelemetry, pingTelemetry } from '~/lib/hooks/pingTelemetry';
import type { RejectChangeData } from '~/components/chat/ApproveChange';
import { generateRandomId } from '~/lib/replay/ReplayProtocolClient';
import { getMessagesRepositoryId, getPreviousRepositoryId, type Message } from '~/lib/persistence/message';
import { useAuthStatus } from '~/lib/stores/auth';
import { debounce } from '~/utils/debounce';
import { supabaseSubmitFeedback } from '~/lib/supabase/feedback';
import { supabaseAddRefund } from '~/lib/supabase/peanuts';
import mergeResponseMessage from '~/components/chat/ChatComponent/functions/mergeResponseMessages';
import flushSimulationData from '~/components/chat/ChatComponent/functions/flushSimulation';
import getRewindMessageIndexAfterReject from '~/components/chat/ChatComponent/functions/getRewindMessageIndexAfterReject';
import flashScreen from '~/components/chat/ChatComponent/functions/flashScreen';
import { usingMockChat } from '~/lib/replay/MockChat';
import { pendingMessageStatusStore, setPendingMessageStatus, clearPendingMessageStatus } from '~/lib/stores/status';

interface ChatProps {
  initialMessages: Message[];
  resumeChat: ResumeChatInfo | undefined;
  storeMessageHistory: (messages: Message[]) => Promise<void>;
}

let gNumAborts = 0;

let gActiveChatMessageTelemetry: ChatMessageTelemetry | undefined;

function clearActiveChat() {
  gActiveChatMessageTelemetry = undefined;
}

let gLastChatMessages: Message[] | undefined;

export function getLastChatMessages() {
  return gLastChatMessages;
}

const ChatImplementer = memo((props: ChatProps) => {
  const { initialMessages, resumeChat: initialResumeChat, storeMessageHistory } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Move here
  const [imageDataList, setImageDataList] = useState<string[]>([]); // Move here
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useAuthStatus();
  const [input, setInput] = useState('');

  const [pendingMessageId, setPendingMessageId] = useState<string | undefined>(undefined);

  const pendingMessageStatus = useStore(pendingMessageStatusStore);

  const [resumeChat, setResumeChat] = useState<ResumeChatInfo | undefined>(initialResumeChat);

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const showChat = useStore(chatStore.showChat);

  const [animationScope, animate] = useAnimate();

  useEffect(() => {
    const prompt = searchParams.get('prompt');

    if (prompt) {
      setInput(prompt);
    }
  }, [searchParams]);

  useEffect(() => {
    const repositoryId = getMessagesRepositoryId(initialMessages);

    if (repositoryId) {
      simulationRepositoryUpdated(repositoryId);
    }
  }, [initialMessages]);

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

  useEffect(() => {
    chatStore.started.set(initialMessages.length > 0);
  }, []);

  useEffect(() => {
    storeMessageHistory(messages);
  }, [messages]);

  const abort = () => {
    stop();
    gNumAborts++;
    chatStore.aborted.set(true);
    setPendingMessageId(undefined);
    clearPendingMessageStatus();
    setResumeChat(undefined);

    const chatId = chatStore.currentChat.get()?.id;
    if (chatId) {
      database.updateChatLastMessage(chatId, null, null);
    }

    if (gActiveChatMessageTelemetry) {
      gActiveChatMessageTelemetry.abort('StopButtonClicked');
      clearActiveChat();
      abortChatMessage();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = 'auto';

      const scrollHeight = textarea.scrollHeight;

      textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
      textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    }
  }, [input, textareaRef]);

  const runAnimation = async () => {
    if (chatStarted) {
      return;
    }

    await Promise.all([
      animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
      animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
    ]);

    chatStore.started.set(true);

    setChatStarted(true);
  };

  const sendMessage = async (messageInput?: string) => {
    const _input = messageInput || input;
    const numAbortsAtStart = gNumAborts;

    if (_input.length === 0 || pendingMessageId || resumeChat) {
      return;
    }

    gActiveChatMessageTelemetry = new ChatMessageTelemetry(messages.length);

    if (!isLoggedIn && !usingMockChat()) {
      const numFreeUses = +(Cookies.get(anthropicNumFreeUsesCookieName) || 0);

      if (numFreeUses >= maxFreeUses) {
        toast.error('Please login to continue using Nut.');
        gActiveChatMessageTelemetry.abort('NoFreeUses');
        clearActiveChat();
        return;
      }

      Cookies.set(anthropicNumFreeUsesCookieName, (numFreeUses + 1).toString());
    }

    const chatId = generateRandomId();
    setPendingMessageId(chatId);
    setPendingMessageStatus('');

    const userMessage: Message = {
      id: `user-${chatId}`,
      role: 'user',
      type: 'text',
      content: _input,
    };

    let newMessages = [...messages, userMessage];

    imageDataList.forEach((imageData, index) => {
      const imageMessage: Message = {
        id: `image-${chatId}-${index}`,
        role: 'user',
        type: 'image',
        dataURL: imageData,
      };
      newMessages.push(imageMessage);
    });

    await storeMessageHistory(newMessages);

    if (!chatStore.currentChat.get()) {
      toast.error('Failed to initialize chat');
      setPendingMessageId(undefined);
      return;
    }

    setMessages(newMessages);
    setUploadedFiles([]);
    setImageDataList([]);

    await flushSimulationData();
    simulationFinishData();

    chatStore.aborted.set(false);

    runAnimation();

    const addResponseMessage = (msg: Message) => {
      if (gNumAborts != numAbortsAtStart) {
        return;
      }

      gActiveChatMessageTelemetry?.onResponseMessage();

      const existingRepositoryId = getMessagesRepositoryId(newMessages);

      newMessages = mergeResponseMessage(msg, [...newMessages]);
      setMessages(newMessages);

      const responseRepositoryId = getMessagesRepositoryId(newMessages);

      if (responseRepositoryId && existingRepositoryId != responseRepositoryId) {
        simulationRepositoryUpdated(responseRepositoryId);
      }
    };

    const onChatTitle = (title: string) => {
      if (gNumAborts != numAbortsAtStart) {
        return;
      }

      console.log('ChatTitle', title);
      const currentChat = chatStore.currentChat.get();
      if (currentChat) {
        handleChatTitleUpdate(currentChat.id, title);
      }
    };

    const onChatStatus = debounce((status: string) => {
      if (gNumAborts != numAbortsAtStart) {
        return;
      }

      console.log('ChatStatus', status);
      setPendingMessageStatus(status);
    }, 500);

    const references: ChatReference[] = [];

    const mouseData = getCurrentMouseData();

    if (mouseData) {
      references.push({
        kind: 'element',
        selector: mouseData.selector,
        x: mouseData.x,
        y: mouseData.y,
        width: mouseData.width,
        height: mouseData.height,
      });
    }

    let normalFinish = false;
    try {
      await sendChatMessage(newMessages, references, {
        onResponsePart: addResponseMessage,
        onTitle: onChatTitle,
        onStatus: onChatStatus,
      });
      normalFinish = true;
    } catch (e) {
      if (gNumAborts == numAbortsAtStart) {
        toast.error('Error sending message');
        console.error('Error sending message', e);
      }
    }

    if (gNumAborts != numAbortsAtStart) {
      return;
    }

    gActiveChatMessageTelemetry.finish(gLastChatMessages?.length ?? 0, normalFinish);
    clearActiveChat();

    setPendingMessageId(undefined);

    setInput('');

    textareaRef.current?.blur();
  };

  useEffect(() => {
    (async () => {
      if (!initialResumeChat) {
        return;
      }

      const numAbortsAtStart = gNumAborts;

      let newMessages = messages;

      const hasReceivedResponse = new Set<string>();

      const addResponseMessage = (msg: Message) => {
        if (gNumAborts != numAbortsAtStart) {
          return;
        }

        if (!hasReceivedResponse.has(msg.id)) {
          hasReceivedResponse.add(msg.id);
          newMessages = newMessages.filter((m) => m.id != msg.id);
        }

        const existingRepositoryId = getMessagesRepositoryId(newMessages);

        newMessages = mergeResponseMessage(msg, [...newMessages]);
        setMessages(newMessages);

        const responseRepositoryId = getMessagesRepositoryId(newMessages);

        if (responseRepositoryId && existingRepositoryId != responseRepositoryId) {
          simulationRepositoryUpdated(responseRepositoryId);
        }
      };

      const onChatTitle = (title: string) => {
        if (gNumAborts != numAbortsAtStart) {
          return;
        }

        console.log('ChatTitle', title);
        const currentChat = chatStore.currentChat.get();
        if (currentChat) {
          handleChatTitleUpdate(currentChat.id, title);
        }
      };

      const onChatStatus = debounce((status: string) => {
        if (gNumAborts != numAbortsAtStart) {
          return;
        }

        console.log('ChatStatus', status);
        setPendingMessageStatus(status);
      }, 500);

      try {
        await resumeChatMessage(initialResumeChat.protocolChatId, initialResumeChat.protocolChatResponseId, {
          onResponsePart: addResponseMessage,
          onTitle: onChatTitle,
          onStatus: onChatStatus,
        });
      } catch (e) {
        toast.error('Error resuming chat');
        console.error('Error resuming chat', e);
      }

      if (gNumAborts != numAbortsAtStart) {
        return;
      }

      setResumeChat(undefined);

      const chatId = chatStore.currentChat.get()?.id;
      if (chatId) {
        database.updateChatLastMessage(chatId, null, null);
      }
    })();
  }, [initialResumeChat]);

  const onApproveChange = async (messageId: string) => {
    console.log('ApproveChange', messageId);

    setMessages(
      messages.map((message) => {
        if (message.id == messageId) {
          return {
            ...message,
            approved: true,
          };
        }
        return message;
      }),
    );

    await flashScreen();

    pingTelemetry('ApproveChange', {
      numMessages: messages.length,
    });
  };

  const onRejectChange = async (messageId: string, data: RejectChangeData) => {
    console.log('RejectChange', messageId, data);

    const messageIndex = getRewindMessageIndexAfterReject(messages, messageId);

    if (messageIndex < 0) {
      toast.error('Rewind message not found');
      return;
    }

    const message = messages.find((m) => m.id == messageId);

    if (!message) {
      toast.error('Message not found');
      return;
    }

    if (message.peanuts) {
      await supabaseAddRefund(message.peanuts);
    }

    const previousRepositoryId = getPreviousRepositoryId(messages, messageIndex + 1);

    setMessages(messages.slice(0, messageIndex + 1));

    simulationRepositoryUpdated(previousRepositoryId);

    let shareProjectSuccess = false;

    if (data.shareProject) {
      const feedbackData: any = {
        explanation: data.explanation,
        chatMessages: messages,
      };

      shareProjectSuccess = await supabaseSubmitFeedback(feedbackData);
    }

    pingTelemetry('RejectChange', {
      shareProject: data.shareProject,
      shareProjectSuccess,
      numMessages: messages.length,
    });
  };

  /**
   * Handles the change event for the textarea and updates the input state.
   * @param event - The change event from the textarea.
   */
  const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const [messageRef, scrollRef] = useSnapScroll();

  gLastChatMessages = messages;

  return (
    <BaseChat
      ref={animationScope}
      textareaRef={textareaRef}
      input={input}
      showChat={showChat}
      chatStarted={chatStarted}
      hasPendingMessage={pendingMessageId !== undefined || resumeChat !== undefined}
      pendingMessageStatus={pendingMessageStatus}
      sendMessage={sendMessage}
      messageRef={messageRef}
      scrollRef={scrollRef}
      handleInputChange={(e) => {
        onTextareaChange(e);
      }}
      handleStop={abort}
      messages={messages}
      uploadedFiles={uploadedFiles}
      setUploadedFiles={setUploadedFiles}
      imageDataList={imageDataList}
      setImageDataList={setImageDataList}
      onApproveChange={onApproveChange}
      onRejectChange={onRejectChange}
    />
  );
});

export default ChatImplementer;
