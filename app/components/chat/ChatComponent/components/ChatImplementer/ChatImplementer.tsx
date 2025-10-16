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
import { type VisitData, ChatMode } from '~/lib/replay/SendChatMessage';
// import { anthropicNumFreeUsesCookieName, maxFreeUses } from '~/utils/freeUses';
import { ChatMessageTelemetry } from '~/lib/hooks/pingTelemetry';
import { type ChatMessageAttachment, type Message } from '~/lib/persistence/message';
// import { usingMockChat } from '~/lib/replay/MockChat';
import { assert, generateRandomId, navigateApp } from '~/utils/nut';
import { createAttachment as createAttachmentAPI } from '~/lib/replay/NutAPI';
import type { DetectedError } from '~/lib/replay/MessageHandlerInterface';
import type { SimulationData } from '~/lib/replay/MessageHandler';
import { shouldDisplayMessage } from '~/lib/replay/SendChatMessage';

let gActiveChatMessageTelemetry: ChatMessageTelemetry | undefined;

function clearActiveChat() {
  gActiveChatMessageTelemetry = undefined;
}

interface ChatReferenceComponent {
  componentNames: string[];
}

export interface ChatMessageParams {
  messageInput?: string;
  chatMode: ChatMode;
  sessionRepositoryId?: string;
  simulationData?: SimulationData;
  detectedError?: DetectedError;
  componentReference?: ChatReferenceComponent;
  retryBugReportName?: string;
}

async function createAttachment(dataURL: string): Promise<ChatMessageAttachment> {
  const match = dataURL.match(/^data:([^;]+);base64,(.+)$/);
  assert(match, 'Expected data URL');
  const mimeType = match[1];
  const base64Data = match[2];

  // Convert base64 to ArrayBuffer
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const attachmentData = bytes.buffer;

  // Generate a filename based on the mime type
  const extension = mimeType.split('/')[1] || 'bin';
  const fileName = `attachment.${extension}`;

  // Call the API to create the attachment
  const attachmentId = await createAttachmentAPI(mimeType, attachmentData);

  return {
    attachmentId,
    fileName,
    byteLength: attachmentData.byteLength,
    mimeType,
  };
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

  const sendMessage = async (params: ChatMessageParams) => {
    const { messageInput, chatMode, sessionRepositoryId, simulationData, detectedError, componentReference, retryBugReportName } = params;

    if ((messageInput?.length === 0 && imageDataList.length === 0) || chatStore.hasPendingMessage.get()) {
      return;
    }

    gActiveChatMessageTelemetry = new ChatMessageTelemetry(chatStore.messages.get().length);

    const chatId = generateRandomId();

    if (messageInput || imageDataList.length) {
      const attachments = await Promise.all(imageDataList.map(createAttachment));
      const userMessage: Message = {
        id: `user-${chatId}`,
        createTime: new Date().toISOString(),
        role: 'user',
        attachments,
        content: messageInput ?? '',
        hasInteracted: false,
      };

      addChatMessage(userMessage);
    }

    let appId = chatStore.currentAppId.get();
    if (!appId) {
      try {
        appId = await database.createApp();
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

    const messages = chatStore.messages.get().filter(shouldDisplayMessage);

    const numAbortsAtStart = chatStore.numAborts.get();

    let visit: VisitData | undefined;
    if (sessionRepositoryId) {
      visit = {
        repositoryId: sessionRepositoryId,
        simulationData,
        detectedError,
        componentReference,
      };
    }

    await doSendMessage({
      appId,
      mode: chatMode,
      messages,
      visit,
      retryBugReportName,
    });

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
