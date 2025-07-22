import { useStore } from '@nanostores/react';
import { useAnimate } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useSnapScroll } from '~/lib/hooks';
import { database } from '~/lib/persistence/apps';
import { chatStore, DefaultTitle } from '~/lib/stores/chat';
import { cubicEasingFn } from '~/utils/easings';
import { BaseChat } from '~/components/chat/BaseChat/BaseChat';
// import Cookies from 'js-cookie';
import { useSearchParams } from '@remix-run/react';
import { sendChatMessage, type ChatReference, resumeChatMessage, ChatMode } from '~/lib/replay/SendChatMessage';
import { getCurrentMouseData } from '~/components/workbench/PointSelector';
// import { anthropicNumFreeUsesCookieName, maxFreeUses } from '~/utils/freeUses';
import { ChatMessageTelemetry, pingTelemetry } from '~/lib/hooks/pingTelemetry';
import type { RejectChangeData } from '~/components/chat/ApproveChange';
import { generateRandomId } from '~/utils/nut';
import { getDiscoveryRating, MAX_DISCOVERY_RATING, type Message } from '~/lib/persistence/message';
import { supabaseSubmitFeedback } from '~/lib/supabase/feedback';
import mergeResponseMessage from '~/components/chat/ChatComponent/functions/mergeResponseMessages';
import flashScreen from '~/components/chat/ChatComponent/functions/flashScreen';
// import { usingMockChat } from '~/lib/replay/MockChat';
import { pendingMessageStatusStore, setPendingMessageStatus, clearPendingMessageStatus } from '~/lib/stores/status';
import { updateDevelopmentServer } from '~/lib/replay/DevelopmentServer';
import { getLatestAppRepositoryId, getLatestAppSummary } from '~/lib/persistence/messageAppSummary';
import type { ChatResponse } from '~/lib/persistence/response';

interface ChatProps {
  initialMessages: Message[];
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

function navigateApp(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/app/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/app/${nextId}`;
  url.search = '';
  window.history.replaceState({}, '', url);
}

const ChatImplementer = memo((props: ChatProps) => {
  const { initialMessages } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Move here
  const [imageDataList, setImageDataList] = useState<string[]>([]); // Move here
  const [searchParams] = useSearchParams();
  // const { isLoggedIn } = useAuthStatus();
  const [input, setInput] = useState('');

  const [hasPendingMessage, setHasPendingMessage] = useState<boolean>(false);

  const pendingMessageStatus = useStore(pendingMessageStatusStore);

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
    const repositoryId = getLatestAppSummary(initialMessages)?.repositoryId;

    if (repositoryId) {
      updateDevelopmentServer(repositoryId);
    }
  }, [initialMessages]);

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

  useEffect(() => {
    chatStore.started.set(initialMessages.length > 0);
  }, []);

  const abort = () => {
    stop();
    gNumAborts++;
    chatStore.aborted.set(true);
    setHasPendingMessage(false);
    clearPendingMessageStatus();

    const appId = chatStore.currentAppId.get();
    if (appId) {
      database.abortAppChats(appId);
    }

    if (gActiveChatMessageTelemetry) {
      gActiveChatMessageTelemetry.abort('StopButtonClicked');
      clearActiveChat();
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

  const sendMessage = async (messageInput: string, startPlanning: boolean, chatMode?: ChatMode) => {
    const numAbortsAtStart = gNumAborts;

    if (messageInput.length === 0 || hasPendingMessage) {
      return;
    }

    gActiveChatMessageTelemetry = new ChatMessageTelemetry(messages.length);

    // if (!isLoggedIn && !usingMockChat()) {
    //   const numFreeUses = +(Cookies.get(anthropicNumFreeUsesCookieName) || 0);

    //   if (numFreeUses >= maxFreeUses) {
    //     toast.error('Please login to continue using Nut.');
    //     gActiveChatMessageTelemetry.abort('NoFreeUses');
    //     clearActiveChat();
    //     return;
    //   }

    //   Cookies.set(anthropicNumFreeUsesCookieName, (numFreeUses + 1).toString());
    // }

    const chatId = generateRandomId();
    setHasPendingMessage(true);
    setPendingMessageStatus('');

    const userMessage: Message = {
      id: `user-${chatId}`,
      createTime: new Date().toISOString(),
      role: 'user',
      type: 'text',
      content: messageInput,
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

    if (!chatStore.currentAppId.get()) {
      try {
        const appId = await database.createApp();
        chatStore.currentAppId.set(appId);
        chatStore.appTitle.set(DefaultTitle);

        navigateApp(appId);
      } catch (e) {
        console.error('Failed to initialize chat', e);
        toast.error('Failed to initialize chat');
        setHasPendingMessage(false);
        return;
      }
    }

    setMessages(newMessages);
    setUploadedFiles([]);
    setImageDataList([]);

    chatStore.aborted.set(false);

    runAnimation();

    const onResponse = (response: ChatResponse) => {
      if (gNumAborts != numAbortsAtStart) {
        return;
      }

      switch (response.kind) {
        case 'message': {
          gActiveChatMessageTelemetry?.onResponseMessage();

          const existingRepositoryId = getLatestAppRepositoryId(newMessages);

          newMessages = mergeResponseMessage(response.message, newMessages);
          setMessages(newMessages);

          const responseRepositoryId = getLatestAppRepositoryId(newMessages);

          if (responseRepositoryId && existingRepositoryId != responseRepositoryId) {
            updateDevelopmentServer(responseRepositoryId);
          }
          break;
        }
        case 'title':
          chatStore.appTitle.set(response.title);
          break;
        case 'status':
          setPendingMessageStatus(response.status);
          break;
        case 'error':
          toast.error('Error sending message');
          console.error('Error sending message', response.error);
          break;
        case 'done':
        case 'aborted':
          break;
        default:
          console.error('Unknown chat response:', response);
          break;
      }
    };

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

    let mode = chatMode ?? ChatMode.BuildApp;

    // If we don't have a plan yet, stay in the Discovery mode until
    // we either max out the discovery rating or the user forced us to start planning.
    if (!getLatestAppSummary(newMessages) && !startPlanning && getDiscoveryRating(newMessages) < MAX_DISCOVERY_RATING) {
      mode = ChatMode.Discovery;
    }

    await sendChatMessage(mode, newMessages, references, onResponse);

    if (gNumAborts != numAbortsAtStart) {
      return;
    }

    gActiveChatMessageTelemetry.finish(gLastChatMessages?.length ?? 0, true);
    clearActiveChat();

    setHasPendingMessage(false);

    setInput('');

    textareaRef.current?.blur();
  };

  useEffect(() => {
    (async () => {
      if (!chatStore.currentAppId.get()) {
        return;
      }

      const numAbortsAtStart = gNumAborts;

      let newMessages = messages;

      const onResponse = (response: ChatResponse) => {
        if (gNumAborts != numAbortsAtStart) {
          return;
        }

        switch (response.kind) {
          case 'message': {
            const existingRepositoryId = getLatestAppRepositoryId(newMessages);

            newMessages = mergeResponseMessage(response.message, newMessages);
            setMessages(newMessages);

            const responseRepositoryId = getLatestAppRepositoryId(newMessages);

            if (responseRepositoryId && existingRepositoryId != responseRepositoryId) {
              updateDevelopmentServer(responseRepositoryId);
            }
            break;
          }
          case 'title':
            chatStore.appTitle.set(response.title);
            break;
          case 'status':
            setPendingMessageStatus(response.status);
            break;
          case 'done':
          case 'error':
          case 'aborted':
            break;
          default:
            console.error('Unknown chat response:', response);
            break;
        }
      };

      try {
        setHasPendingMessage(true);
        await resumeChatMessage(onResponse);
      } catch (e) {
        toast.error('Error resuming chat');
        console.error('Error resuming chat', e);
      }

      if (gNumAborts != numAbortsAtStart) {
        return;
      }

      setHasPendingMessage(false);
    })();
  }, []);

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
      hasPendingMessage={hasPendingMessage}
      pendingMessageStatus={pendingMessageStatus}
      sendMessage={sendMessage}
      messageRef={messageRef}
      scrollRef={scrollRef}
      handleInputChange={(e) => {
        onTextareaChange(e);
      }}
      handleStop={abort}
      messages={messages}
      setMessages={setMessages}
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
