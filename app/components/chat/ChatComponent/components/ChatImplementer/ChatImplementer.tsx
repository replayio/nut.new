import { useStore } from '@nanostores/react';
import { AnimatePresence } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useSnapScroll } from '~/lib/hooks';
import { database } from '~/lib/persistence/apps';
import { addChatMessage, chatStore, doAbortChat, doSendMessage } from '~/lib/stores/chat';
import { LandingPage } from '~/components/pages/LandingPage';
import { DiscussionPage } from '~/components/pages/DiscussionPage';
import { AppPage } from '~/components/pages/AppPage';
import { useSearchParams } from '@remix-run/react';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { ChatMessageTelemetry } from '~/lib/hooks/pingTelemetry';
import { type ChatMessageAttachment, type Message } from '~/lib/persistence/message';
import { assert, generateRandomId, navigateApp } from '~/utils/nut';
import { createAttachment as createAttachmentAPI, uploadVisitData } from '~/lib/replay/NutAPI';
import { shouldDisplayMessage } from '~/lib/replay/SendChatMessage';
import { flushSimulationData } from '~/components/chat/ChatComponent/functions/flushSimulationData';
import { getCurrentUserInfo } from '~/lib/supabase/client';
import { Unauthorized } from '~/components/chat/Unauthorized';
import { workbenchStore } from '~/lib/stores/workbench';

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
  componentReference?: ChatReferenceComponent;
  retryBugReportName?: string;
  payFeatures?: boolean;
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

interface ChatImplementerProps {
  ready: boolean;
  unauthorized: boolean;
  authorizedCopy: boolean;
  handleCopyApp: () => Promise<void>;
  isCopying: boolean;
}

const ChatImplementer = memo(
  ({ ready, unauthorized, authorizedCopy, handleCopyApp, isCopying }: ChatImplementerProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(chatStore.messages.get().length > 0 || !ready);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]); // Move here
    const [imageDataList, setImageDataList] = useState<string[]>([]); // Move here
    const [searchParams] = useSearchParams();
    // const { isLoggedIn } = useAuthStatus();
    const [input, setInput] = useState('');

    const showChat = useStore(chatStore.showChat);

    useEffect(() => {
      const prompt = searchParams.get('prompt');

      if (prompt) {
        setInput(prompt);
      }
    }, [searchParams]);

    useEffect(() => {
      // Update chatStarted when messages load or when app becomes ready
      if (ready && chatStore.messages.get().length > 0) {
        setChatStarted(true);
      }
    }, [ready]);

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

    const sendMessage = async (params: ChatMessageParams) => {
      const { messageInput, chatMode, sessionRepositoryId, componentReference, retryBugReportName, payFeatures } =
        params;

      if ((messageInput?.length === 0 && imageDataList.length === 0) || chatStore.hasPendingMessage.get()) {
        return;
      }

      gActiveChatMessageTelemetry = new ChatMessageTelemetry(chatStore.messages.get().length);

      const chatId = generateRandomId();

      if (messageInput || imageDataList.length) {
        const userInfo = await getCurrentUserInfo();
        const attachments = await Promise.all(imageDataList.map(createAttachment));
        const userMessage: Message = {
          id: `user-${chatId}`,
          userInfo,
          createTime: new Date().toISOString(),
          role: 'user',
          attachments,
          content: messageInput ?? '',
          hasInteracted: false,
          componentReference,
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

      // Trigger the page transition
      if (!chatStarted) {
        chatStore.started.set(true);
        setChatStarted(true);
      }

      const messages = chatStore.messages.get().filter(shouldDisplayMessage);

      const numAbortsAtStart = chatStore.numAborts.get();

      let visitDataId: string | undefined;
      if (sessionRepositoryId && chatMode == ChatMode.UserMessage) {
        const simulationData = await flushSimulationData();
        visitDataId = await uploadVisitData({
          repositoryId: sessionRepositoryId,
          simulationData,
          componentReference,
        });
      }

      await doSendMessage({
        appId,
        mode: chatMode,
        messages,
        visitDataId,
        retryBugReportName,
        payFeatures,
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
    const showWorkbench = useStore(workbenchStore.showWorkbench);

    if (unauthorized) {
      return <Unauthorized authorizedCopy={authorizedCopy} handleCopyApp={handleCopyApp} isCopying={isCopying} />;
    }

    const sharedProps = {
      textareaRef,
      input,
      handleInputChange: onTextareaChange,
      sendMessage,
      handleStop: abort,
      uploadedFiles,
      setUploadedFiles,
      imageDataList,
      setImageDataList,
      messageRef,
      scrollRef,
      showChat,
      isLoading: !ready,
    };

    return (
      <AnimatePresence mode="wait">
        {!chatStarted ? (
          <LandingPage key="landing" {...sharedProps} />
        ) : !showWorkbench ? (
          <DiscussionPage key="discussion" {...sharedProps} />
        ) : (
          <AppPage key="app" {...sharedProps} />
        )}
      </AnimatePresence>
    );
  },
);

export default ChatImplementer;
