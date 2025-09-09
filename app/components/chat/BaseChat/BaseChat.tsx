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
import { DISCOVERY_RESPONSE_CATEGORY } from '~/lib/persistence/message';
import { workbenchStore } from '~/lib/stores/workbench';
import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { StatusModal } from '~/components/status-modal/StatusModal';
import { userStore } from '~/lib/stores/userAuth';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { mobileNavStore } from '~/lib/stores/mobileNav';
import { TabbedInterface } from '~/components/chat/TabbedInterface';
import { ThemeEditor } from '~/components/workbench/ThemeEditor/ThemeEditor';
import { AppSettings } from '~/components/workbench/AppSettings/AppSettings';

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
    const isSmallViewport = useViewport(1024);
    const user = useStore(userStore.user);

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
    const [showThemeEditor, setShowThemeEditor] = useState(false);

    useEffect(() => {
      if (appSummary && !workbenchStore.showWorkbench.get()) {
        workbenchStore.setShowWorkbench(true);
        mobileNavStore.setActiveTab('preview');
      }
    }, [appSummary]);

    // Listen for THEME_CHANGED event from iframe to enable theme editor
    useEffect(() => {
      const handleThemeChanged = (event: MessageEvent) => {
        if (event.data?.type === 'THEME_CHANGED' && event.data?.source === 'app-theme-provider') {
          console.log('Theme changed event received:', event.data);
          setShowThemeEditor(true);
        }
      };

      // Also listen for custom events from local iframe
      const handleCustomThemeEvent = (event: CustomEvent) => {
        console.log('Custom theme event received:', event.detail);
        setShowThemeEditor(true);
      };

      window.addEventListener('message', handleThemeChanged);
      window.addEventListener('themeChanged', handleCustomThemeEvent as EventListener);

      return () => {
        window.removeEventListener('message', handleThemeChanged);
        window.removeEventListener('themeChanged', handleCustomThemeEvent as EventListener);
      };
    }, []);

    const handleContinueBuilding = () => {
      if (sendMessage) {
        sendMessage({ chatMode: ChatMode.DevelopApp });
      }
    };

    const handleSendMessage = (params: ChatMessageParams) => {
      if (sendMessage) {
        // Mark discovery messages as interacted when user sends a response
        const messages = chatStore.messages.get();
        const updatedMessages = messages.map((message) => {
          if (message.type === 'text' && message.category === DISCOVERY_RESPONSE_CATEGORY && !message.hasInteracted) {
            return { ...message, hasInteracted: true };
          }
          return message;
        });
        chatStore.messages.set(updatedMessages);

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

    const tabs = [
      {
        id: 'chat',
        label: 'Chat',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        ),
      },
      ...(showThemeEditor
        ? [
            {
              id: 'app-settings',
              label: 'App Settings',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              ),
            },
          ]
        : []),
      ...(showThemeEditor
        ? [
            {
              id: 'theme',
              label: 'Theme Editor',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              ),
            },
          ]
        : []),
    ];

    const chatContent = (
      <div
        ref={scrollRef}
        className={classNames('w-full h-full flex flex-col lg:flex-row overflow-hidden', {
          'overflow-y-auto': !chatStarted,
          'pt-0 pb-2 px-4': isSmallViewport && !appSummary,
          'pt-0 pb-15 px-4': isSmallViewport && !!appSummary,
          'p-6 pt-0': !isSmallViewport && chatStarted,
          'p-6 pb-16 pt-0': !isSmallViewport && !chatStarted,
        })}
      >
        <div
          className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full', {
            'pb-2': isSmallViewport,
            'landing-page-layout': !chatStarted,
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
                  <Messages
                    ref={messageRef}
                    onLastMessageCheckboxChange={onLastMessageCheckboxChange}
                    sendMessage={sendMessage}
                  />
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
      </div>
    );

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
      >
        {user && <ClientOnly>{() => <Menu />}</ClientOnly>}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {showThemeEditor ? (
            <TabbedInterface tabs={tabs}>
              {chatContent}
              <AppSettings />
              <ThemeEditor />
            </TabbedInterface>
          ) : (
            chatContent
          )}
        </div>
        <ClientOnly>{() => <Workbench chatStarted={chatStarted} handleSendMessage={handleSendMessage} />}</ClientOnly>
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
