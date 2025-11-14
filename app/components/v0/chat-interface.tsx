'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { IntroSection } from '~/components/chat/BaseChat/components/IntroSection/IntroSection';
import { ChatPromptContainer } from '~/components/chat/BaseChat/components/ChatPromptContainer/ChatPromptContainer';
import { Messages } from '~/components/chat/Messages/Messages.client';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import { addChatMessage, chatStore, doAbortChat, doSendMessage } from '~/lib/stores/chat';
import { userStore } from '~/lib/stores/auth';
import { workbenchStore } from '~/lib/stores/workbench';
import { subscriptionStore } from '~/lib/stores/subscriptionStatus';
import { database, type AppLibraryEntry } from '~/lib/persistence/apps';
import { toast } from 'react-toastify';
import { ChatMode, shouldDisplayMessage } from '~/lib/replay/SendChatMessage';
import { DISCOVERY_RESPONSE_CATEGORY, type ChatMessageAttachment, type Message } from '~/lib/persistence/message';
import type { MessageInputProps } from '~/components/chat/MessageInput/MessageInput';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { useSpeechRecognition } from '~/hooks/useSpeechRecognition';
import { classNames } from '~/utils/classNames';
import { PlanUpgradeBlock } from '~/components/chat/BaseChat/components/PlanUpgradeBlock';
import { ChatMessageTelemetry } from '~/lib/hooks/pingTelemetry';
import { assert, generateRandomId, navigateApp } from '~/utils/nut';
import { createAttachment as createAttachmentAPI } from '~/lib/replay/NutAPI';
import { getCurrentUserInfo } from '~/lib/supabase/client';

interface ChatInterfaceProps {
  isChatStarted: boolean;
  onFirstMessage: () => void;
  onMessage: () => void;
}

const TEXTAREA_MIN_HEIGHT = 76;
const TEXTAREA_MAX_HEIGHT = 200;

let gActiveChatMessageTelemetry: ChatMessageTelemetry | undefined;

function clearActiveChat() {
  gActiveChatMessageTelemetry = undefined;
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

export function ChatInterface({ isChatStarted, onFirstMessage, onMessage }: ChatInterfaceProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAiMessageCountRef = useRef(0);

  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageDataList, setImageDataList] = useState<string[]>([]);
  const [list, setList] = useState<AppLibraryEntry[] | undefined>(undefined);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const hasPendingMessage = useStore(chatStore.hasPendingMessage);
  const messages = useStore(chatStore.messages);
  const user = useStore(userStore);
  const selectedElement = useStore(workbenchStore.selectedElement);
  const repositoryId = useStore(workbenchStore.repositoryId);
  const stripeSubscription = useStore(subscriptionStore.subscription);

  const loadEntries = useCallback(() => {
    setIsLoadingList(true);
    database
      .getAllAppEntries()
      .then(setList)
      .catch((error) => {
        console.error('Failed to load app entries:', error);
        // Don't show toast on initial load failure - just set empty list
        setList([]);
      })
      .finally(() => setIsLoadingList(false));
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, user]);

  // Watch for AI responses and trigger callbacks
  useEffect(() => {
    const aiMessages = messages.filter((m) => m.role === 'assistant');
    const currentAiCount = aiMessages.length;

    // If we have a new AI message and chat is started, trigger onMessage for the transition
    if (currentAiCount > lastAiMessageCountRef.current && isChatStarted) {
      lastAiMessageCountRef.current = currentAiCount;
      onMessage();
    }
  }, [messages, isChatStarted, onMessage]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  }, []);

  const onTranscriptChange = useCallback(
    (transcript: string) => {
      const syntheticEvent = {
        target: { value: transcript },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      handleInputChange(syntheticEvent);
    },
    [handleInputChange],
  );

  const { isListening, startListening, stopListening, abortListening } = useSpeechRecognition({
    onTranscriptChange,
  });

  const getComponentReference = useCallback(() => {
    if (!selectedElement?.tree?.length) {
      return undefined;
    }

    return {
      componentNames: selectedElement.tree.map((component) => component.displayName || 'Anonymous'),
    };
  }, [selectedElement]);

  const sendMessage = useCallback(
    async (params: ChatMessageParams) => {
      const { messageInput, chatMode, retryBugReportName, payFeatures, componentReference } = params;

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

      abortListening();

      // Get messages before we added the user message
      const messagesBefore = chatStore.messages.get();
      if (messagesBefore.filter((m) => m.role === 'user').length === 1) {
        // This is the first user message
        onFirstMessage();
      }

      if (window.analytics && messagesBefore.length === 0) {
        window.analytics.track('Created a new chat', {
          timestamp: new Date().toISOString(),
          userId: user?.id,
          email: user?.email,
        });
      }

      const filteredMessages = messages.filter(shouldDisplayMessage);
      const numAbortsAtStart = chatStore.numAborts.get();

      await doSendMessage({
        appId,
        mode: chatMode,
        messages: filteredMessages,
        retryBugReportName,
        payFeatures,
      });

      if (chatStore.numAborts.get() != numAbortsAtStart) {
        return;
      }

      gActiveChatMessageTelemetry.finish(filteredMessages.length, true);
      clearActiveChat();

      const syntheticEvent = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      handleInputChange(syntheticEvent);
    },
    [
      getComponentReference,
      repositoryId,
      imageDataList,
      abortListening,
      user,
      handleInputChange,
      onFirstMessage,
      onMessage,
    ],
  );

  const handleSendMessage = useCallback(
    (params: ChatMessageParams) => {
      const componentReference = params.componentReference ?? getComponentReference();
      const sessionRepositoryId = params.sessionRepositoryId ?? repositoryId;

      // Mark discovery messages as interacted when user sends a response
      const updatedMessages = messages.map((message) => {
        if (message.category === DISCOVERY_RESPONSE_CATEGORY && !message.hasInteracted) {
          return { ...message, hasInteracted: true };
        }
        return message;
      });
      chatStore.messages.set(updatedMessages);

      const payload: ChatMessageParams = {
        ...params,
        componentReference,
      };

      if (sessionRepositoryId) {
        payload.sessionRepositoryId = sessionRepositoryId;
      }

      sendMessage(payload);
    },
    [sendMessage, getComponentReference, repositoryId, messages],
  );

  // Listen for continue building events
  useEffect(() => {
    const handleContinueBuildingEvent = () => {
      handleSendMessage({ chatMode: ChatMode.DevelopApp });
    };

    window.addEventListener('continueBuilding', handleContinueBuildingEvent);
    return () => {
      window.removeEventListener('continueBuilding', handleContinueBuildingEvent);
    };
  }, [handleSendMessage]);

  const handleStop = useCallback(() => {
    if (gActiveChatMessageTelemetry) {
      gActiveChatMessageTelemetry.abort('StopButtonClicked');
      clearActiveChat();
    }
    doAbortChat();
  }, []);

  const onLastMessageCheckboxChange = (checkboxText: string, checked: boolean) => {
    const newMessages = chatStore.messages.get().map((message) => {
      const oldBox = checked ? `[ ]` : `[x]`;
      const newBox = checked ? `[x]` : `[ ]`;
      const lines = message.content.split('\n');
      const matchingLineIndex = lines.findIndex(
        (line) => line.includes(oldBox) && lineIncludesNoMarkdown(line, checkboxText),
      );
      if (matchingLineIndex >= 0) {
        lines[matchingLineIndex] = lines[matchingLineIndex].replace(oldBox, newBox);
        return {
          ...message,
          content: lines.join('\n').trim(),
        };
      }
      return message;
    });
    chatStore.messages.set(newMessages);
  };

  const messageInputProps: MessageInputProps = {
    textareaRef,
    input,
    handleInputChange,
    handleSendMessage,
    handleStop,
    uploadedFiles,
    setUploadedFiles,
    imageDataList,
    setImageDataList,
    isListening,
    onStartListening: startListening,
    onStopListening: stopListening,
    minHeight: TEXTAREA_MIN_HEIGHT,
    maxHeight: TEXTAREA_MAX_HEIGHT,
  };

  // Only show loading if we're actually waiting for critical data
  const isLoadingData = isLoadingList && !list;
  const hasNoPaidPlan = !stripeSubscription || stripeSubscription.tier === 'free';
  const shouldShowUpgradeBlock = user && hasNoPaidPlan && list && list.length > 0 && !isChatStarted;

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={scrollRef}
        className={classNames('w-full h-full flex flex-col overflow-x-hidden', {
          'overflow-y-auto': !isChatStarted,
          'overflow-y-hidden': isChatStarted,
          'p-6': isChatStarted,
          'pt-12 px-6 pb-16': !isChatStarted,
        })}
      >
        <div
          className={classNames('flex flex-col', {
            'h-full': isChatStarted,
            'min-h-full': !isChatStarted,
            'landing-page-layout': !isChatStarted,
          })}
          style={{ width: '100%' }}
        >
          {!isChatStarted && <IntroSection />}
          <div
            className={classNames({
              'h-full flex flex-col': isChatStarted,
            })}
          >
            {isChatStarted && (
              <Messages
                ref={messageRef}
                onLastMessageCheckboxChange={onLastMessageCheckboxChange}
                sendMessage={handleSendMessage}
              />
            )}
            {(() => {
              if (isLoadingData && !isChatStarted) {
                return (
                  <div className="flex items-center justify-center min-h-[176.5px]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-bolt-elements-borderColor border-t-bolt-elements-textPrimary rounded-full animate-spin"></div>
                      <p className="text-sm text-bolt-elements-textSecondary">Loading...</p>
                    </div>
                  </div>
                );
              }

              return shouldShowUpgradeBlock ? (
                <PlanUpgradeBlock />
              ) : (
                <>
                  <ChatPromptContainer
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    imageDataList={imageDataList}
                    setImageDataList={setImageDataList}
                    messageInputProps={messageInputProps}
                  />
                  {!isChatStarted && (
                    <>
                      {ExamplePrompts((event: React.UIEvent, messageInput: string) => {
                        if (hasPendingMessage) {
                          handleStop?.();
                          return;
                        }
                        handleSendMessage({ messageInput, chatMode: ChatMode.UserMessage });
                      })}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function lineIncludesNoMarkdown(line: string, text: string) {
  const stripMarkdown = (str: string) => {
    return str
      .replace(/[*_`~]/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^#+\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1');
  };

  const strippedLine = stripMarkdown(line);
  const strippedText = stripMarkdown(text);

  return strippedLine.includes(strippedText);
}
