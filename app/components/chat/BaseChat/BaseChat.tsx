/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import React, { type RefCallback, useCallback, useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { Workbench } from '~/components/workbench/Workbench.client';
import { MobileNav } from '~/components/mobile-nav/MobileNav.client';
import { classNames } from '~/utils/classNames';
import { Messages } from '~/components/chat/Messages/Messages.client';
import * as Tooltip from '@radix-ui/react-tooltip';
import { IntroSection } from '~/components/chat/BaseChat/components/IntroSection/IntroSection';
import { ChatPromptContainer } from '~/components/chat/BaseChat/components/ChatPromptContainer/ChatPromptContainer';
import { useSpeechRecognition } from '~/hooks/useSpeechRecognition';
import styles from './BaseChat.module.scss';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import { type MessageInputProps } from '~/components/chat/MessageInput/MessageInput';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { workbenchStore } from '~/lib/stores/workbench';
import { mobileNavStore } from '~/lib/stores/mobileNav';
import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { StatusModal } from '~/components/status-modal/StatusModal';
import { userStore } from '~/lib/stores/userAuth';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';

export const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  messageRef?: RefCallback<HTMLDivElement>;
  scrollRef?: RefCallback<HTMLDivElement>;
  showChat?: boolean;
  chatStarted?: boolean;
  input?: string;
  handleStop?: () => void;
  sendMessage?: (params: ChatMessageParams) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
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
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 300 : 200;
    const showWorkbench = useStore(workbenchStore.showWorkbench);
    const mobileActiveTab = useStore(mobileNavStore.activeTab);
    const isSmallViewport = useViewport(1024);
    const user = useStore(userStore.user);

    useEffect(() => {
      if (showWorkbench && mobileActiveTab === 'chat') {
        mobileNavStore.setActiveTab('planning');
      } else if (!showWorkbench && (mobileActiveTab === 'planning' || mobileActiveTab === 'preview')) {
        mobileNavStore.setActiveTab('chat');
      }
    }, [showWorkbench, mobileActiveTab]);

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

    const { isListening, startListening, stopListening, abortListening } = useSpeechRecognition({
      onTranscriptChange,
    });

    const [checkedBoxes, setCheckedBoxes] = useState<string[]>([]);

    const handleContinueBuilding = () => {
      if (sendMessage) {
        sendMessage({ chatMode: ChatMode.DevelopApp });
      }
    };

    const handleSendMessage = (params: ChatMessageParams) => {
      if (sendMessage) {
        sendMessage(params);
        abortListening();
        setCheckedBoxes([]);
        if (window.analytics) {
          window.analytics.track('Message Sent', {
            timestamp: new Date().toISOString(),
            chatMode: params.chatMode,
          });
        }
        if (handleInputChange) {
          const syntheticEvent = {
            target: { value: '' },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          handleInputChange(syntheticEvent);
        }
      }
    };

    const onLastMessageCheckboxChange = (checkboxText: string, checked: boolean) => {
      const newMessages = chatStore.messages.get().map((message) => {
        if (message.type == 'text') {
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
        }
        return message;
      });
      chatStore.messages.set(newMessages);
      if (checked) {
        setCheckedBoxes((prev) => [...prev, checkboxText]);
      } else {
        setCheckedBoxes((prev) => prev.filter((box) => box !== checkboxText));
      }
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
      checkedBoxes,
    };

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
      >
        {user && <ClientOnly>{() => <Menu />}</ClientOnly>}
        <div
          ref={scrollRef}
          className={classNames('w-full h-full flex flex-col lg:flex-row overflow-hidden', {
            'overflow-y-auto': !chatStarted,
            'pt-0 pb-2 px-4': isSmallViewport && !appSummary,
            'pt-0 pb-15 px-4': isSmallViewport && !!appSummary,
            'p-6 pt-0': !isSmallViewport && chatStarted,
            'p-6 pb-16': !isSmallViewport && !chatStarted, // Add extra bottom padding on landing page to show footer
          })}
        >
          <div
            className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full', {
              'pb-2': isSmallViewport,
              'landing-page-layout': !chatStarted, // Custom CSS class for responsive centering
            })}
          >
            {!chatStarted && (
              <>
                <IntroSection />
              </>
            )}
            <div
              className={classNames('sm:px-6', {
                'h-full flex flex-col': chatStarted,
                'px-2': !isSmallViewport,
              })}
            >
              <ClientOnly>
                {() => {
                  return chatStarted ? (
                    <Messages ref={messageRef} onLastMessageCheckboxChange={onLastMessageCheckboxChange} />
                  ) : null;
                }}
              </ClientOnly>
              <ChatPromptContainer
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles!}
                imageDataList={imageDataList}
                setImageDataList={setImageDataList!}
                messageInputProps={messageInputProps}
              />
            </div>
            {!chatStarted && (
              <>
                {ExamplePrompts((event: React.UIEvent, messageInput: string) => {
                  if (hasPendingMessage) {
                    handleStop?.();
                    return;
                  }
                  handleSendMessage({ messageInput, chatMode: ChatMode.Discovery });
                })}
              </>
            )}
          </div>
          <ClientOnly>
            {() => (
              <Workbench
                chatStarted={chatStarted}
                mobileActiveTab={mobileActiveTab}
                handleSendMessage={handleSendMessage}
              />
            )}
          </ClientOnly>
        </div>
        {isSmallViewport && appSummary && <ClientOnly>{() => <MobileNav />}</ClientOnly>}
        {appSummary && <StatusModal appSummary={appSummary} onContinueBuilding={handleContinueBuilding} />}
      </div>
    );

    return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
  },
);

function lineIncludesNoMarkdown(line: string, text: string) {
  // Remove markdown formatting characters from both strings
  const stripMarkdown = (str: string) => {
    return str
      .replace(/[*_`~]/g, '') // Remove asterisks, underscores, backticks, tildes
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Replace markdown links with just the text
      .replace(/^#+\s*/g, '') // Remove heading markers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
      .replace(/`([^`]+)`/g, '$1') // Remove inline code markers
      .replace(/~~([^~]+)~~/g, '$1'); // Remove strikethrough markers
  };

  const strippedLine = stripMarkdown(line);
  const strippedText = stripMarkdown(text);

  return strippedLine.includes(strippedText);
}
