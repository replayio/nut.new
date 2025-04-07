/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import { useAnimate } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useSnapScroll } from '~/lib/hooks';
import { database, handleChatTitleUpdate, useChatHistory, type ResumeChatInfo } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { useSearchParams } from '@remix-run/react';
import {
  simulationAddData,
  simulationFinishData,
  simulationRepositoryUpdated,
  sendChatMessage,
  type ChatReference,
  abortChatMessage,
  resumeChatMessage,
} from '~/lib/replay/ChatManager';
import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { getCurrentIFrame } from '~/components/workbench/Preview';
import { getCurrentMouseData } from '~/components/workbench/PointSelector';
import { anthropicNumFreeUsesCookieName, maxFreeUses } from '~/utils/freeUses';
import { ChatMessageTelemetry, pingTelemetry } from '~/lib/hooks/pingTelemetry';
import type { RejectChangeData } from './ApproveChange';
import { assert, generateRandomId } from '~/lib/replay/ReplayProtocolClient';
import { getMessagesRepositoryId, getPreviousRepositoryId, type Message } from '~/lib/persistence/message';
import { useAuthStatus } from '~/lib/stores/auth';
import { debounce } from '~/utils/debounce';
import { supabaseSubmitFeedback } from '~/lib/supabase/feedback';
import { supabaseAddRefund } from '~/lib/supabase/peanuts';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

let gLastChatMessages: Message[] | undefined;

export function getLastChatMessages() {
  return gLastChatMessages;
}

async function flushSimulationData() {
  //console.log("FlushSimulationData");

  const iframe = getCurrentIFrame();

  if (!iframe) {
    return;
  }

  const simulationData = await getIFrameSimulationData(iframe);

  if (!simulationData.length) {
    return;
  }

  //console.log("HaveSimulationData", simulationData.length);

  // Add the simulation data to the chat.
  simulationAddData(simulationData);
}

setInterval(async () => {
  flushSimulationData();
}, 1000);

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, resumeChat, storeMessageHistory } = useChatHistory();

  return (
    <>
      {ready && (
        <ChatImpl initialMessages={initialMessages} resumeChat={resumeChat} storeMessageHistory={storeMessageHistory} />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}

interface ChatProps {
  initialMessages: Message[];
  resumeChat: ResumeChatInfo | undefined;
  storeMessageHistory: (messages: Message[]) => void;
}

let gNumAborts = 0;

let gActiveChatMessageTelemetry: ChatMessageTelemetry | undefined;

async function clearActiveChat() {
  gActiveChatMessageTelemetry = undefined;
}

function mergeResponseMessage(msg: Message, messages: Message[]): Message[] {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.id == msg.id) {
    messages.pop();
    assert(lastMessage.type == 'text', 'Last message must be a text message');
    assert(msg.type == 'text', 'Message must be a text message');
    messages.push({
      ...msg,
      content: lastMessage.content + msg.content,
    });
  } else {
    messages.push(msg);
  }
  return messages;
}

// Get the index of the last message that will be present after rewinding.
// This is the last message which is either a user message or has a repository change.
function getRewindMessageIndexAfterReject(messages: Message[], messageId: string): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const { id, role, repositoryId } = messages[i];
    if (role == 'user') {
      return i;
    }
    if (repositoryId && id != messageId) {
      return i;
    }
  }
  console.error('No rewind message found', messages, messageId);
  return -1;
}

export const ChatImpl = memo((props: ChatProps) => {
  const { initialMessages, resumeChat: initialResumeChat, storeMessageHistory } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Move here
  const [imageDataList, setImageDataList] = useState<string[]>([]); // Move here
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useAuthStatus();

  // Input currently in the textarea.
  const [input, setInput] = useState('');

  /*
   * This is set when the user has triggered a chat message and the response hasn't finished
   * being generated.
   */
  const [pendingMessageId, setPendingMessageId] = useState<string | undefined>(undefined);

  // Last status we heard for the pending message.
  const [pendingMessageStatus, setPendingMessageStatus] = useState('');

  // If we are listening to responses from a chat started in an earlier session,
  // this will be set. This is equivalent to having a pending message but is
  // handled differently.
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

  // Load any repository in the initial messages.
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
    setPendingMessageStatus('');
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

    if (!isLoggedIn) {
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

    setMessages(newMessages);

    // Add file cleanup here
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

      const existingRepositoryId = getMessagesRepositoryId(newMessages);

      newMessages = mergeResponseMessage(msg, [...newMessages]);
      setMessages(newMessages);

      // Update the repository as soon as it has changed.
      const responseRepositoryId = getMessagesRepositoryId(newMessages);

      if (responseRepositoryId && existingRepositoryId != responseRepositoryId) {
        simulationRepositoryUpdated(responseRepositoryId);
        updatedRepository = true;
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

    try {
      await sendChatMessage(newMessages, references, {
        onResponsePart: addResponseMessage,
        onTitle: onChatTitle,
        onStatus: onChatStatus,
      });
    } catch (e) {
      toast.error('Error sending message');
      console.error('Error sending message', e);
    }

    if (gNumAborts != numAbortsAtStart) {
      return;
    }

    gActiveChatMessageTelemetry.finish();
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

      // The response messages we get may overlap with the ones we already have.
      // Look for this and remove any existing message when we receive the first
      // piece of a response message.
      //
      // Messages we have already received a portion of a response for.
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

        // Update the repository as soon as it has changed.
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

  const flashScreen = async () => {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
    flash.style.zIndex = '9999';
    flash.style.pointerEvents = 'none';
    document.body.appendChild(flash);

    // Fade out and remove after 500ms
    setTimeout(() => {
      flash.style.transition = 'opacity 0.5s';
      flash.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(flash);
      }, 500);
    }, 200);
  };

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

    // Find the last message that will be present after rewinding. This is the
    // last message which is either a user message or has a repository change.
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
