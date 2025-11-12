import React, { type RefCallback, useCallback, useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { motion } from 'framer-motion';
import { Menu } from '~/components/sidebar/Menu.client';
import { classNames } from '~/utils/classNames';
import { Messages } from '~/components/chat/Messages/Messages.client';
import { SharedChatInput } from '~/components/chat/SharedChatInput';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { userStore } from '~/lib/stores/userAuth';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { StackedInfoCard, type InfoCardData } from '~/components/ui/InfoCard';
import { AppFeatureKind, AppFeatureStatus, BugReportStatus } from '~/lib/persistence/messageAppSummary';
import { openFeatureModal } from '~/lib/stores/featureModal';
import { workbenchStore } from '~/lib/stores/workbench';
import type { MessageInput as MessageInputType } from '~/components/chat/MessageInput/MessageInput';

export const TEXTAREA_MIN_HEIGHT = 76;

interface DiscussionPageProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  messageRef?: RefCallback<HTMLDivElement>;
  scrollRef?: RefCallback<HTMLDivElement>;
  showChat?: boolean;
  isLoading?: boolean;
  input?: string;
  handleStop?: () => void;
  sendMessage?: (params: ChatMessageParams) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
}

export const DiscussionPage = React.forwardRef<HTMLDivElement, DiscussionPageProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      isLoading = false,
      input = '',
      handleInputChange,
      sendMessage,
      handleStop,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
    },
    ref,
  ) => {
    const hasPendingMessage = useStore(chatStore.hasPendingMessage);
    const appSummary = useStore(chatStore.appSummary);
    const TEXTAREA_MAX_HEIGHT = 300;
    const isSmallViewport = useViewport(800);
    const user = useStore(userStore.user);
    const selectedElement = useStore(workbenchStore.selectedElement);
    const repositoryId = useStore(workbenchStore.repositoryId);
    const [infoCards, setInfoCards] = useState<InfoCardData[]>([]);

    const onTranscriptChange = useCallback(
      (transcript: string) => {
        if (handleInputChange) {
          const syntheticEvent = {
            target: { value: transcript },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          handleInputChange(syntheticEvent);
        }
      },
      [handleInputChange],
    );

    useEffect(() => {
      const newCards: InfoCardData[] = [];

      // Add feature cards
      if (appSummary?.features) {
        const filteredFeatures = appSummary.features.filter(
          (f) => f.kind !== AppFeatureKind.BuildInitialApp && f.kind !== AppFeatureKind.DesignAPIs,
        );

        const featureCards = appSummary.features
          .filter((f) => f.status === AppFeatureStatus.ImplementationInProgress && f.kind !== AppFeatureKind.FixBug)
          .map((feature) => {
            const iconType: 'loading' | 'error' | 'success' =
              feature.status === AppFeatureStatus.ImplementationInProgress
                ? 'loading'
                : feature.status === AppFeatureStatus.Failed
                  ? 'error'
                  : 'success';

            const variant: 'active' | 'default' =
              feature.status === AppFeatureStatus.ImplementationInProgress ? 'active' : 'default';

            const modalIndex = filteredFeatures.findIndex((f) => f === feature);

            return {
              id: feature.name,
              title: feature.name,
              description: feature.description,
              iconType,
              variant,
              handleSendMessage,
              onCardClick:
                modalIndex !== -1
                  ? () => {
                      openFeatureModal(modalIndex, filteredFeatures.length);
                    }
                  : undefined,
            };
          });

        newCards.push(...featureCards);
      }

      // Add bug report cards
      if (appSummary?.bugReports) {
        const bugReportCards = appSummary.bugReports
          .filter((bug) => bug.status === BugReportStatus.Open)
          .map((bug) => ({
            id: bug.name,
            title: `Fix: ${bug.name}`,
            description: bug.description,
            iconType: 'loading' as const,
            variant: 'active' as const,
            handleSendMessage,
          }));

        newCards.push(...bugReportCards);
      }

      setInfoCards(newCards);
    }, [appSummary]);

    const handleSendMessage = useCallback(
      (params: Partial<ChatMessageParams>) => {
        if (!sendMessage) return;

        const fullParams: ChatMessageParams = {
          messageInput: input,
          chatMode: params.chatMode ?? ChatMode.UserMessage,
          sessionRepositoryId: repositoryId,
          componentReference:
            selectedElement?.component?.name && repositoryId
              ? {
                  componentNames: [selectedElement.component.name],
                }
              : undefined,
          ...params,
        };

        sendMessage(fullParams);
      },
      [sendMessage, input, repositoryId, selectedElement],
    );

    useEffect(() => {
      const handleContinueBuildingEvent = () => {
        handleSendMessage({ chatMode: ChatMode.DevelopApp });
      };

      window.addEventListener('continueBuilding', handleContinueBuildingEvent);
      return () => {
        window.removeEventListener('continueBuilding', handleContinueBuildingEvent);
      };
    }, [handleSendMessage]);

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

    const messageInputProps: Partial<React.ComponentProps<typeof MessageInputType>> = {
      textareaRef,
      handleSendMessage,
      handleStop,
      input,
      handleInputChange,
      uploadedFiles,
      setUploadedFiles,
      imageDataList,
      setImageDataList,
    };

    const discussionPage = (
      <motion.div
        ref={ref}
        className="relative flex h-full w-full overflow-hidden"
        data-chat-visible={showChat}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {user && <ClientOnly>{() => <Menu />}</ClientOnly>}
        <div
          ref={scrollRef}
          className={classNames('w-full h-full flex flex-col items-center justify-center overflow-y-auto', {
            'pt-2 pb-16 px-4': isSmallViewport,
            'pb-16': !isSmallViewport,
          })}
        >
          <motion.div
            layoutId="chat-panel"
            className={classNames('flex flex-col h-full max-w-3xl w-full', {
              'px-2': !isSmallViewport,
            })}
          >
            <div className="flex-1 overflow-hidden flex flex-col">
              <ClientOnly>
                {() => {
                  return (
                    <>
                      {!isLoading && (
                        <>
                          <motion.div layoutId="messages-container" className="flex-1 overflow-y-auto">
                            <Messages
                              ref={messageRef}
                              onLastMessageCheckboxChange={onLastMessageCheckboxChange}
                              sendMessage={handleSendMessage}
                            />
                          </motion.div>
                          {infoCards && infoCards.length > 0 && (
                            <div className="flex justify-center">
                              <div style={{ width: 'calc(min(100%, var(--chat-max-width, 37rem)))' }}>
                                <StackedInfoCard
                                  cards={infoCards}
                                  className="w-full mb-2"
                                  handleSendMessage={handleSendMessage}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  );
                }}
              </ClientOnly>
            </div>
            <SharedChatInput
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles!}
              imageDataList={imageDataList}
              setImageDataList={setImageDataList!}
              messageInputProps={messageInputProps}
              layoutId="chat-input"
            />
          </motion.div>
        </div>
      </motion.div>
    );

    return <TooltipProvider delayDuration={200}>{discussionPage}</TooltipProvider>;
  },
);

function lineIncludesNoMarkdown(line: string, text: string) {
  const stripMarkdown = (str: string) => {
    return str
      .replace(/[*_`~]/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^#+\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
  };

  const strippedLine = stripMarkdown(line);
  const strippedText = stripMarkdown(text);

  return strippedLine.includes(strippedText);
}
