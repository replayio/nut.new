import { useStore } from '@nanostores/react';
import { useAnimate } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useSnapScroll } from '~/lib/hooks';
import { database } from '~/lib/persistence/apps';
import { addChatMessage, chatStore, doAbortChat, doSendMessage } from '~/lib/stores/chat';
import { cubicEasingFn } from '~/utils/easings';
import { BaseChat } from '~/components/chat/BaseChat/BaseChat';
// import Cookies from 'js-cookie';
import { useSearchParams } from '@remix-run/react';
import { type ChatReference, ChatMode } from '~/lib/replay/SendChatMessage';
import { getCurrentMouseData } from '~/components/workbench/PointSelector';
// import { anthropicNumFreeUsesCookieName, maxFreeUses } from '~/utils/freeUses';
import { ChatMessageTelemetry, pingTelemetry } from '~/lib/hooks/pingTelemetry';
import type { RejectChangeData } from '~/components/chat/ApproveChange';
import { getDiscoveryRating, MAX_DISCOVERY_RATING, type Message } from '~/lib/persistence/message';
import { supabaseSubmitFeedback } from '~/lib/supabase/feedback';
import flashScreen from '~/components/chat/ChatComponent/functions/flashScreen';
// import { usingMockChat } from '~/lib/replay/MockChat';
import { updateDevelopmentServer } from '~/lib/replay/DevelopmentServer';
import { getLatestAppRepositoryId, getLatestAppSummary } from '~/lib/persistence/messageAppSummary';
import { generateRandomId, navigateApp } from '~/utils/nut';

let gActiveChatMessageTelemetry: ChatMessageTelemetry | undefined;

function clearActiveChat() {
  gActiveChatMessageTelemetry = undefined;
}

const ChatImplementer = memo(() => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(chatStore.messages.get().length > 0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Move here
  const [imageDataList, setImageDataList] = useState<string[]>([]); // Move here
  const [searchParams] = useSearchParams();
  // const { isLoggedIn } = useAuthStatus();
  const [input, setInput] = useState('');

  const showChat = useStore(chatStore.showChat);

  const [animationScope, animate] = useAnimate();

  useEffect(() => {
    const prompt = searchParams.get('prompt');

    if (prompt) {
      setInput(prompt);
    }
  }, [searchParams]);

  useEffect(() => {
    const repositoryId = getLatestAppRepositoryId(chatStore.messages.get());

    if (repositoryId) {
      updateDevelopmentServer(repositoryId);
    }
  }, []);

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

  const abort = () => {
    if (gActiveChatMessageTelemetry) {
      gActiveChatMessageTelemetry.abort('StopButtonClicked');
      clearActiveChat();
    }

    doAbortChat();
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

  const sendMessage = async (messageInput: string, chatMode?: ChatMode) => {
    if (messageInput.length === 0 || chatStore.hasPendingMessage.get()) {
      return;
    }

    gActiveChatMessageTelemetry = new ChatMessageTelemetry(chatStore.messages.get().length);

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

    const userMessage: Message = {
      id: `user-${chatId}`,
      createTime: new Date().toISOString(),
      role: 'user',
      type: 'text',
      content: messageInput,
    };

    addChatMessage(userMessage);

    imageDataList.forEach((imageData, index) => {
      const imageMessage: Message = {
        id: `image-${chatId}-${index}`,
        role: 'user',
        type: 'image',
        dataURL: imageData,
      };
      addChatMessage(imageMessage);
    });

    if (!chatStore.currentAppId.get()) {
      try {
        const appId = await database.createApp();
        chatStore.currentAppId.set(appId);
        chatStore.appTitle.set('New App');

        navigateApp(appId);
      } catch (e) {
        console.error('Failed to initialize chat', e);
        toast.error('Failed to initialize chat');
        chatStore.hasPendingMessage.set(false);
        return;
      }
    }

    setUploadedFiles([]);
    setImageDataList([]);

    runAnimation();

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

    const messages = chatStore.messages.get();

    let mode = chatMode;
    if (!mode) {
      // If we don't have a plan yet, stay in the Discovery mode until
      // we either max out the discovery rating or the user forced us to start planning.
      if (!getLatestAppSummary(messages) && getDiscoveryRating(messages) < MAX_DISCOVERY_RATING) {
        mode = ChatMode.Discovery;
      } else {
        mode = ChatMode.BuildApp;
      }
    }

    const numAbortsAtStart = chatStore.numAborts.get();

    await doSendMessage(mode, messages, references);

    if (chatStore.numAborts.get() != numAbortsAtStart) {
      return;
    }

    gActiveChatMessageTelemetry.finish(messages.length, true);
    clearActiveChat();

    setInput('');
    textareaRef.current?.blur();
  };

  const onApproveChange = async (messageId: string) => {
    console.log('ApproveChange', messageId);

    chatStore.messages.set(
      chatStore.messages.get().map((message) => {
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
      numMessages: chatStore.messages.get().length,
    });
  };

  const onRejectChange = async (messageId: string, data: RejectChangeData) => {
    console.log('RejectChange', messageId, data);

    let shareProjectSuccess = false;

    if (data.shareProject) {
      const feedbackData: any = {
        explanation: data.explanation,
        chatMessages: chatStore.messages.get(),
      };

      shareProjectSuccess = await supabaseSubmitFeedback(feedbackData);
    }

    pingTelemetry('RejectChange', {
      shareProject: data.shareProject,
      shareProjectSuccess,
      numMessages: chatStore.messages.get().length,
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

  return (
    <BaseChat
      ref={animationScope}
      textareaRef={textareaRef}
      input={input}
      showChat={showChat}
      chatStarted={chatStarted}
      sendMessage={sendMessage}
      handleStop={abort}
      messageRef={messageRef}
      scrollRef={scrollRef}
      handleInputChange={(e) => {
        onTextareaChange(e);
      }}
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
