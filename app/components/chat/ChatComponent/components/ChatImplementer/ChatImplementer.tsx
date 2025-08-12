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
import { ChatMessageTelemetry } from '~/lib/hooks/pingTelemetry';
import { type Message } from '~/lib/persistence/message';
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

  const sendMessage = async (messageInput: string | undefined, chatMode?: ChatMode) => {
    if (messageInput?.length === 0 || chatStore.hasPendingMessage.get()) {
      return;
    }

    gActiveChatMessageTelemetry = new ChatMessageTelemetry(chatStore.messages.get().length);

    const chatId = generateRandomId();

    if (messageInput) {
      const userMessage: Message = {
        id: `user-${chatId}`,
        createTime: new Date().toISOString(),
        role: 'user',
        type: 'text',
        content: messageInput,
      };

      addChatMessage(userMessage);
    }

    imageDataList.forEach((imageData, index) => {
      const imageMessage: Message = {
        id: `image-${chatId}-${index}`,
        createTime: new Date().toISOString(),
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
        mouseData,
      });
    }

    const messages = chatStore.messages.get();

    let mode = chatMode;
    if (!mode) {
      // If we don't have a plan yet, stay in Discovery mode until the user
      // forces us to start planning.
      if (!getLatestAppSummary(messages)) {
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
    />
  );
});

export default ChatImplementer;
