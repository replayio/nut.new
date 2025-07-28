import React from 'react';
import { classNames } from '~/utils/classNames';
import FilePreview from '~/components/chat/FilePreview';
import { ScreenshotStateManager } from '~/components/chat/ScreenshotStateManager';
import { ClientOnly } from 'remix-utils/client-only';
import ApproveChange from '~/components/chat/ApproveChange';
import { MessageInput } from '~/components/chat/MessageInput/MessageInput';
import styles from '~/components/chat/BaseChat/BaseChat.module.scss';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';

interface ChatPromptContainerProps {
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  imageDataList: string[];
  setImageDataList: (dataList: string[]) => void;
  approveChangeMessageId?: string;
  rejectFormOpen: boolean;
  setRejectFormOpen: (open: boolean) => void;
  onApproveChange?: (messageId: string) => void;
  onRejectChange?: (messageId: string, data: any) => void;
  messageInputProps: Partial<React.ComponentProps<typeof MessageInput>>;
}

export const ChatPromptContainer: React.FC<ChatPromptContainerProps> = ({
  uploadedFiles,
  setUploadedFiles,
  imageDataList,
  setImageDataList,
  approveChangeMessageId,
  rejectFormOpen,
  setRejectFormOpen,
  onApproveChange,
  onRejectChange,
  messageInputProps,
}) => {
  const chatStarted = useStore(chatStore.started);

  return (
    <div
      className={classNames(
        'bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor relative w-full max-w-chat mx-auto z-prompt',
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
          setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
          setImageDataList(imageDataList.filter((_, i) => i !== index));
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
      {approveChangeMessageId && (
        <ApproveChange
          rejectFormOpen={rejectFormOpen}
          setRejectFormOpen={setRejectFormOpen}
          onApprove={() => onApproveChange?.(approveChangeMessageId)}
          onReject={(data) => onRejectChange?.(approveChangeMessageId, data)}
        />
      )}
      {!rejectFormOpen && <MessageInput {...messageInputProps} />}
    </div>
  );
};
