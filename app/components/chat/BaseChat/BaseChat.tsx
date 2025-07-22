/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import React, { type RefCallback, useCallback, useRef, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { Messages } from '~/components/chat/Messages/Messages.client';
import { getDiscoveryRating, type Message } from '~/lib/persistence/message';
import * as Tooltip from '@radix-ui/react-tooltip';
import { IntroSection } from '~/components/chat/BaseChat/components/IntroSection/IntroSection';
import { ChatPromptContainer } from '~/components/chat/BaseChat/components/ChatPromptContainer/ChatPromptContainer';
import { useSpeechRecognition } from '~/hooks/useSpeechRecognition';
import styles from './BaseChat.module.scss';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import type { RejectChangeData } from '~/components/chat/ApproveChange';
import { type MessageInputProps } from '~/components/chat/MessageInput/MessageInput';
import { Arboretum } from './components/Arboretum/Arboretum';
import { useArboretumVisibility } from '~/lib/stores/settings';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { getLatestAppSummary } from '~/lib/persistence/messageAppSummary';

export const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  messageRef?: RefCallback<HTMLDivElement>;
  scrollRef?: RefCallback<HTMLDivElement>;
  showChat?: boolean;
  chatStarted?: boolean;
  hasPendingMessage?: boolean;
  pendingMessageStatus?: string;
  messages?: Message[];
  setMessages?: (messages: Message[]) => void;
  input?: string;
  handleStop?: () => void;
  sendMessage?: (messageInput: string, startPlanning: boolean, chatMode?: ChatMode) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  onApproveChange?: (messageId: string) => void;
  onRejectChange?: (messageId: string, data: RejectChangeData) => void;
}

type ExtendedMessage = Message & {
  repositoryId?: string;
  peanuts?: boolean;
  approved?: boolean;
};

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      hasPendingMessage = false,
      pendingMessageStatus = '',
      input = '',
      handleInputChange,
      sendMessage,
      handleStop,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages,
      setMessages,
      onApproveChange,
      onRejectChange,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [rejectFormOpen, setRejectFormOpen] = useState(false);
    const { isArboretumVisible } = useArboretumVisibility();

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

    // These refs don't seem like they should be necessary, but we get stale messages
    // in the onLastMessageCheckboxChange callback for some reason that prevents
    // multiple checkboxes from being checked otherwise.
    const messagesRef = useRef<Message[]>([]);
    messagesRef.current = messages || [];
    const checkedBoxesRef = useRef<string[]>([]);

    const handleSendMessage = (
      event: React.UIEvent,
      messageInput: string,
      startPlanning: boolean,
      chatMode?: ChatMode,
    ) => {
      if (sendMessage) {
        sendMessage(messageInput, startPlanning, chatMode);
        abortListening();
        checkedBoxesRef.current = [];

        if (handleInputChange) {
          const syntheticEvent = {
            target: { value: '' },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          handleInputChange(syntheticEvent);
        }
      }
    };

    const approveChangeMessageId = (() => {
      if (hasPendingMessage || !messages) {
        return undefined;
      }

      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i] as ExtendedMessage;
        if (message.repositoryId && message.peanuts) {
          return message.approved ? undefined : message.id;
        }
        if (message.role === 'user') {
          return undefined;
        }
      }
      return undefined;
    })();

    const onLastMessageCheckboxChange = (checkboxText: string, checked: boolean) => {
      if (messages && setMessages) {
        const newMessages = messagesRef.current.map((message) => {
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
        messagesRef.current = newMessages;
        setMessages(newMessages);
      }
      if (checked) {
        checkedBoxesRef.current = [...checkedBoxesRef.current, checkboxText];
      } else {
        checkedBoxesRef.current = checkedBoxesRef.current.filter((box) => box !== checkboxText);
      }
    };

    const hasAppSummary = !!getLatestAppSummary(messages || []);

    let startPlanningRating = 0;
    if (!hasPendingMessage && !hasAppSummary) {
      startPlanningRating = getDiscoveryRating(messages || []);
    }

    const messageInputProps: MessageInputProps = {
      textareaRef,
      input,
      handleInputChange,
      handleSendMessage,
      handleStop,
      hasPendingMessage,
      chatStarted,
      hasAppSummary,
      uploadedFiles,
      setUploadedFiles,
      imageDataList,
      setImageDataList,
      isListening,
      onStartListening: startListening,
      onStopListening: stopListening,
      minHeight: TEXTAREA_MIN_HEIGHT,
      maxHeight: TEXTAREA_MAX_HEIGHT,
      checkedBoxes: checkedBoxesRef.current,
      startPlanningRating,
    };

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden p-6')}
        data-chat-visible={showChat}
      >
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div
          ref={scrollRef}
          className={classNames('w-full h-full flex flex-col lg:flex-row', {
            'overflow-y-auto': !chatStarted,
          })}
        >
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              <>
                <IntroSection />
              </>
            )}
            <div
              className={classNames('px-2 sm:px-6', {
                'h-full flex flex-col': chatStarted,
              })}
            >
              <ClientOnly>
                {() => {
                  return chatStarted ? (
                    <Messages
                      ref={messageRef}
                      messages={messages}
                      hasPendingMessage={hasPendingMessage}
                      pendingMessageStatus={pendingMessageStatus}
                      onLastMessageCheckboxChange={onLastMessageCheckboxChange}
                    />
                  ) : null;
                }}
              </ClientOnly>
              <ChatPromptContainer
                chatStarted={chatStarted}
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles!}
                imageDataList={imageDataList}
                setImageDataList={setImageDataList!}
                approveChangeMessageId={approveChangeMessageId}
                rejectFormOpen={rejectFormOpen}
                setRejectFormOpen={setRejectFormOpen}
                onApproveChange={onApproveChange}
                onRejectChange={onRejectChange}
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
                  handleSendMessage(event, messageInput, false, ChatMode.Discovery);
                })}
                {isArboretumVisible && <Arboretum />}
              </>
            )}
          </div>
          <ClientOnly>{() => <Workbench chatStarted={chatStarted} messages={messages} />}</ClientOnly>
        </div>
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
