/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import React, { type RefCallback, useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { Messages } from './Messages.client';
import { getPreviousRepositoryId, type Message } from '~/lib/persistence/message';
import { SendButton } from './SendButton.client';
import * as Tooltip from '@radix-ui/react-tooltip';

import styles from './BaseChat.module.scss';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';

import FilePreview from './FilePreview';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import type { RejectChangeData } from './ApproveChange';
import { assert } from '~/lib/replay/ReplayProtocolClient';
import ApproveChange from './ApproveChange';

export const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  hasPendingMessage?: boolean;
  pendingMessageStatus?: string;
  messages?: Message[];
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  handleStop?: () => void;
  sendMessage?: (messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  _enhancingPrompt?: boolean;
  _enhancePrompt?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  onRewind?: (messageId: string) => void;
  approveChangesMessageId?: string;
  onApproveChange?: (messageId: string) => void;
  onRejectChange?: (lastMessageId: string, data: RejectChangeData) => void;
}

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
      onRewind,
      approveChangesMessageId,
      onApproveChange,
      onRejectChange,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [transcript, setTranscript] = useState('');
    const [rejectFormOpen, setRejectFormOpen] = useState(false);

    useEffect(() => {
      console.log(transcript);
    }, [transcript]);

    useEffect(() => {
      // Load API keys from cookies on component mount

      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          setTranscript(transcript);

          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    }, []);

    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    const handleSendMessage = (event: React.UIEvent, messageInput?: string) => {
      if (sendMessage) {
        sendMessage(messageInput);

        if (recognition) {
          recognition.abort(); // Stop current recognition
          setTranscript(''); // Clear transcript
          setIsListening(false);

          // Clear the input by triggering handleInputChange with empty value
          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: '' },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        }
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles?.([...uploadedFiles, file]);
            setImageDataList?.([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles?.([...uploadedFiles, file]);
              setImageDataList?.([...imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    const showApproveChange = (() => {
      if (hasPendingMessage) {
        return false;
      }

      if (!messages?.length) {
        return false;
      }

      const lastMessage = messages[messages.length - 1];

      if (!lastMessage.repositoryId) {
        return false;
      }

      if (!getPreviousRepositoryId(messages, messages.length - 1)) {
        return false;
      }

      if (lastMessage.id != approveChangesMessageId) {
        return false;
      }

      return true;
    })();

    let messageInput;

    if (!rejectFormOpen) {
      messageInput = (
        <div
          className={classNames('relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg')}
        >
          <textarea
            ref={textareaRef}
            className={classNames(
              'w-full pl-4 pt-4 pr-25 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
              'transition-all duration-200',
              'hover:border-bolt-elements-focus',
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              e.currentTarget.style.border = '2px solid #1488fc';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.border = '2px solid #1488fc';
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

              const files = Array.from(e.dataTransfer.files);
              files.forEach((file) => {
                if (file.type.startsWith('image/')) {
                  const reader = new FileReader();

                  reader.onload = (e) => {
                    const base64Image = e.target?.result as string;
                    setUploadedFiles?.([...uploadedFiles, file]);
                    setImageDataList?.([...imageDataList, base64Image]);
                  };
                  reader.readAsDataURL(file);
                }
              });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                if (event.shiftKey) {
                  return;
                }

                event.preventDefault();

                if (hasPendingMessage) {
                  handleStop?.();
                  return;
                }

                // ignore if using input method engine
                if (event.nativeEvent.isComposing) {
                  return;
                }

                handleSendMessage?.(event);
              }
            }}
            value={input}
            onChange={(event) => {
              handleInputChange?.(event);
            }}
            onPaste={handlePaste}
            style={{
              minHeight: TEXTAREA_MIN_HEIGHT,
              maxHeight: TEXTAREA_MAX_HEIGHT,
            }}
            placeholder={chatStarted ? 'How can we help you?' : 'What do you want to build?'}
            translate="no"
          />
          <ClientOnly>
            {() => (
              <SendButton
                show={(hasPendingMessage || input.length > 0 || uploadedFiles.length > 0) && chatStarted}
                hasPendingMessage={hasPendingMessage}
                onClick={(event) => {
                  if (hasPendingMessage) {
                    handleStop?.();
                    return;
                  }

                  if (input.length > 0 || uploadedFiles.length > 0) {
                    handleSendMessage?.(event);
                  }
                }}
              />
            )}
          </ClientOnly>
          <div className="flex justify-between items-center text-sm p-4 pt-2">
            <div className="flex gap-1 items-center">
              <IconButton title="Upload file" className="transition-all" onClick={() => handleFileUpload()}>
                <div className="i-ph:paperclip text-xl"></div>
              </IconButton>

              <SpeechRecognitionButton
                isListening={isListening}
                onStart={startListening}
                onStop={stopListening}
                disabled={hasPendingMessage}
              />
            </div>
            {input.length > 3 ? (
              <div className="text-xs text-bolt-elements-textTertiary">
                Use <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Shift</kbd> +{' '}
                <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Return</kbd> a new line
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
      >
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div ref={scrollRef} className="flex flex-col lg:flex-row overflow-y-auto w-full h-full">
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              <div id="intro" className="mt-[16vh] max-w-chat mx-auto text-center px-4 lg:px-0">
                <h1 className="text-3xl lg:text-6xl font-bold text-bolt-elements-textPrimary mb-4 animate-fade-in">
                  Get what you want
                </h1>
                <p className="text-md lg:text-xl mb-8 text-bolt-elements-textSecondary animate-fade-in animation-delay-200">
                  Build, test, and fix your app all from one prompt
                </p>
              </div>
            )}
            <div
              className={classNames('pt-6 px-2 sm:px-6', {
                'h-full flex flex-col': chatStarted,
              })}
            >
              <ClientOnly>
                {() => {
                  return chatStarted ? (
                    <Messages
                      ref={messageRef}
                      className="flex flex-col w-full flex-1 max-w-chat pb-6 mx-auto z-1"
                      messages={messages}
                      hasPendingMessage={hasPendingMessage}
                      pendingMessageStatus={pendingMessageStatus}
                      onRewind={onRewind}
                    />
                  ) : null;
                }}
              </ClientOnly>
              <div
                className={classNames(
                  'bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor relative w-full max-w-chat mx-auto z-prompt mb-6',
                  {
                    'sticky bottom-2': chatStarted,
                  },
                )}
              >
                <svg className={classNames(styles.PromptEffectContainer)}>
                  <defs>
                    <linearGradient
                      id="line-gradient"
                      x1="20%"
                      y1="0%"
                      x2="-14%"
                      y2="10%"
                      gradientUnits="userSpaceOnUse"
                      gradientTransform="rotate(-45)"
                    >
                      <stop offset="0%" stopColor="#b44aff" stopOpacity="0%"></stop>
                      <stop offset="40%" stopColor="#b44aff" stopOpacity="80%"></stop>
                      <stop offset="50%" stopColor="#b44aff" stopOpacity="80%"></stop>
                      <stop offset="100%" stopColor="#b44aff" stopOpacity="0%"></stop>
                    </linearGradient>
                    <linearGradient id="shine-gradient">
                      <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
                      <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
                      <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
                      <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
                    </linearGradient>
                  </defs>
                  <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
                  <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
                </svg>
                <FilePreview
                  files={uploadedFiles}
                  imageDataList={imageDataList}
                  onRemove={(index) => {
                    setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
                    setImageDataList?.(imageDataList.filter((_, i) => i !== index));
                  }}
                />
                <ClientOnly>
                  {() => (
                    <ScreenshotStateManager
                      setUploadedFiles={setUploadedFiles}
                      setImageDataList={setImageDataList}
                      uploadedFiles={uploadedFiles}
                      imageDataList={imageDataList}
                    />
                  )}
                </ClientOnly>
                {showApproveChange && (
                  <ApproveChange
                    rejectFormOpen={rejectFormOpen}
                    setRejectFormOpen={setRejectFormOpen}
                    onApprove={() => {
                      if (onApproveChange && messages) {
                        const lastMessage = messages[messages.length - 1];
                        assert(lastMessage);
                        onApproveChange(lastMessage.id);
                      }
                    }}
                    onReject={(data) => {
                      if (onRejectChange && messages) {
                        const lastMessage = messages[messages.length - 1];
                        assert(lastMessage);
                        onRejectChange(lastMessage.id, data);
                      }
                    }}
                  />
                )}
                {!rejectFormOpen && messageInput}
              </div>
            </div>
            {!chatStarted &&
              ExamplePrompts((event, messageInput) => {
                if (hasPendingMessage) {
                  handleStop?.();
                  return;
                }

                handleSendMessage?.(event, messageInput);
              })}
          </div>
          <ClientOnly>{() => <Workbench chatStarted={chatStarted} />}</ClientOnly>
        </div>
      </div>
    );

    return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
  },
);
