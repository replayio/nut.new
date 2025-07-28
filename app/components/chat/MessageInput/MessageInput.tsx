import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';
import { SendButton } from '~/components/chat/SendButton.client';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { StartPlanningButton } from '~/components/chat/StartPlanningButton';
import { chatStore } from '~/lib/stores/chat';
import { useStore } from '@nanostores/react';
import { getLatestAppSummary } from '~/lib/persistence/messageAppSummary';
import { getDiscoveryRating } from '~/lib/persistence/message';

export interface MessageInputProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  input?: string;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSendMessage?: (messageInput: string, mode: ChatMode | undefined) => void;
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
  const hasAppSummary = !!getLatestAppSummary(messages || []);

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
    <div className={classNames('relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg')}>
      <div className="flex flex-col text-bolt-elements-textPrimary text-sm p-4 pb-0 pt-2">
        {checkedBoxes?.map((text) => (
          <div className="flex items-center gap-2 pb-2" key={text}>
            <div className="i-ph:check-circle text-xl"></div>
            <div>{text}</div>
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className={classNames(
          'w-full pl-4 pt-2 pr-20 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
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

            handleSendMessage(fullInput, undefined);
          }
        }}
        value={input}
        onChange={handleInputChange}
        onPaste={handlePaste}
        style={{
          minHeight,
          maxHeight,
        }}
        placeholder={getPlaceholderText(chatStarted, hasAppSummary)}
        translate="no"
      />
      <ClientOnly>
        {() => (
          <>
            <SendButton
              show={(hasPendingMessage || fullInput.length > 0 || uploadedFiles.length > 0) && chatStarted}
              onClick={() => {
                if (hasPendingMessage) {
                  handleStop();
                  return;
                }

                if (fullInput.length > 0 || uploadedFiles.length > 0) {
                  handleSendMessage(fullInput, undefined);
                }
              }}
            />
            {startPlanningRating > 0 && (
              <StartPlanningButton
                onClick={() => {
                  const message = (fullInput + '\n\nStart building the app based on these requirements.').trim();
                  handleSendMessage(message, ChatMode.BuildApp);
                }}
              />
            )}
          </>
        )}
      </ClientOnly>
      <div className="flex justify-between items-center text-sm p-4 pt-2">
        <div className="flex gap-1 items-center">
          <IconButton title="Upload file" className="transition-all" onClick={handleFileUpload}>
            <div className="i-ph:paperclip text-xl"></div>
          </IconButton>

          <SpeechRecognitionButton
            isListening={isListening}
            onStart={onStartListening}
            onStop={onStopListening}
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
