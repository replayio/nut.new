import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { classNames } from '~/utils/classNames';
import { SendButton } from '~/components/chat/SendButton.client';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { StartBuildingButton } from '~/components/chat/StartBuildingButton';
import { chatStore } from '~/lib/stores/chat';
import { useStore } from '@nanostores/react';
import { getDiscoveryRating } from '~/lib/persistence/message';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { workbenchStore } from '~/lib/stores/workbench';
import { mobileNavStore } from '~/lib/stores/mobileNav';

export interface MessageInputProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  input?: string;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSendMessage?: (params: ChatMessageParams) => void;
  handleStop?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  isListening?: boolean;
  onStartListening?: () => void;
  onStopListening?: () => void;
  minHeight?: number;
  maxHeight?: number;
  checkedBoxes?: string[];
}

export const MessageInput: React.FC<MessageInputProps> = ({
  textareaRef,
  input = '',
  handleInputChange = () => {},
  handleSendMessage = () => {},
  handleStop = () => {},
  uploadedFiles = [],
  setUploadedFiles = () => {},
  imageDataList = [],
  setImageDataList = () => {},
  isListening = false,
  onStartListening = () => {},
  onStopListening = () => {},
  minHeight = 76,
  maxHeight = 200,
  checkedBoxes,
}) => {
  const hasPendingMessage = useStore(chatStore.hasPendingMessage);
  const chatStarted = useStore(chatStore.started);
  const messages = useStore(chatStore.messages);
  const hasAppSummary = !!useStore(chatStore.appSummary);

  let startPlanningRating = 0;
  if (!hasPendingMessage && !hasAppSummary) {
    startPlanningRating = getDiscoveryRating(messages || []);
  }

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
          setUploadedFiles([...uploadedFiles, file]);
          setImageDataList([...imageDataList, base64Image]);
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
            setUploadedFiles([...uploadedFiles, file]);
            setImageDataList([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }

        break;
      }
    }
  };

  const fullInput =
    `${input ? input + '\n\n' : ''}` + (checkedBoxes ? `${checkedBoxes.map((box) => `${box}`).join('\n')}` : '');

  return (
    <div
      className={classNames(
        'relative bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor backdrop-blur rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:border-bolt-elements-focus/30',
      )}
    >
      {checkedBoxes && checkedBoxes.length > 0 && (
        <div className="bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor rounded-t-2xl p-4">
          <div className="flex flex-col gap-2">
            {checkedBoxes.map((text) => (
              <div className="flex items-center gap-3 text-bolt-elements-textPrimary text-sm" key={text}>
                <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center">
                  <div className="i-ph:check text-green-500 text-sm"></div>
                </div>
                <div className="font-medium">{text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          className={classNames(
            'w-full px-6 py-4 pr-20 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-base',
            'transition-all duration-200',
            'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50',
            checkedBoxes && checkedBoxes.length > 0 ? 'rounded-b-2xl' : 'rounded-2xl',
            { 'animate-pulse': !input && !chatStarted },
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.boxShadow = 'none';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.boxShadow = 'none';

            const files = Array.from(e.dataTransfer.files);
            files.forEach((file) => {
              if (file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = (e) => {
                  const base64Image = e.target?.result as string;
                  setUploadedFiles([...uploadedFiles, file]);
                  setImageDataList([...imageDataList, base64Image]);
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
                handleStop();
                return;
              }

              if (event.nativeEvent.isComposing) {
                return;
              }

              handleSendMessage({ messageInput: fullInput });
            }
          }}
          value={input}
          onChange={handleInputChange}
          onPaste={handlePaste}
          style={{
            minHeight,
            maxHeight,
            overflowY: 'auto',
          }}
          placeholder={
            !chatStarted
              ? '✨ What do you want to build? Start typing here...'
              : getPlaceholderText(chatStarted, hasAppSummary)
          }
          translate="no"
        />

        {(() => {
          const showSendButton = (hasPendingMessage || fullInput.length > 0 || uploadedFiles.length > 0) && chatStarted;
          const showStartBuildingButton =
            startPlanningRating > 0 && startPlanningRating !== 10 && !showSendButton && !hasAppSummary;

          return (
            <>
              {showSendButton && (
                <ClientOnly>
                  {() => (
                    <SendButton
                      onClick={() => {
                        if (hasPendingMessage) {
                          handleStop();
                          return;
                        }

                        if (fullInput.length > 0 || uploadedFiles.length > 0) {
                          handleSendMessage({ messageInput: fullInput });
                        }
                      }}
                    />
                  )}
                </ClientOnly>
              )}

              {showStartBuildingButton && (
                <ClientOnly>
                  {() => (
                    <StartBuildingButton
                      onClick={() => {
                        const message = (fullInput + '\n\nStart building the app based on these requirements.').trim();
                        handleSendMessage({ messageInput: message, chatMode: ChatMode.BuildApp });
                        setTimeout(() => {
                          workbenchStore.setShowWorkbench(true);
                          mobileNavStore.setShowMobileNav(true);
                          mobileNavStore.setActiveTab('preview');
                        }, 2000);
                      }}
                      startPlanningRating={startPlanningRating}
                    />
                  )}
                </ClientOnly>
              )}
            </>
          );
        })()}
      </div>

      <div className="flex justify-between items-center rounded-b-2xl px-4 py-3">
        <div className="flex gap-2 items-center">
          <button
            title="Upload file"
            className="w-8 h-8 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-4 hover:border-bolt-elements-focus/50 transition-all duration-200 flex items-center justify-center text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
            onClick={handleFileUpload}
          >
            <div className="i-ph:paperclip text-lg"></div>
          </button>

          <div className="w-px h-5 bg-bolt-elements-borderColor" />

          <SpeechRecognitionButton
            isListening={isListening}
            onStart={onStartListening}
            onStop={onStopListening}
            disabled={hasPendingMessage}
          />
        </div>

        {input.length > 3 && (
          <div className="flex items-center gap-2 text-xs text-bolt-elements-textTertiary">
            <span>Press</span>
            <kbd className="px-2 py-1 rounded-md bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor font-mono text-xs">
              Shift
            </kbd>
            <span>+</span>
            <kbd className="px-2 py-1 rounded-md bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor font-mono text-xs">
              ↵
            </kbd>
            <span>for new line</span>
          </div>
        )}
      </div>
    </div>
  );
};

function getPlaceholderText(chatStarted: boolean, hasAppSummary: boolean) {
  if (!chatStarted) {
    // There is no app and no messages have been sent yet.
    return 'What do you want to build?';
  }

  if (!hasAppSummary) {
    // We've started discovery but haven't started building yet.
    return "Is there anything else you'd like me to know?";
  }

  // We have an app that is being iterated on.
  return 'How can we help you?';
}
