import React from 'react';
import { classNames } from '~/utils/classNames';
import FilePreview from '~/components/chat/FilePreview';
import { ScreenshotStateManager } from '~/components/chat/ScreenshotStateManager';
import { ClientOnly } from 'remix-utils/client-only';

import { MessageInput } from '~/components/chat/MessageInput/MessageInput';

interface ChatPromptContainerProps {
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  imageDataList: string[];
  setImageDataList: (dataList: string[]) => void;
  messageInputProps: Partial<React.ComponentProps<typeof MessageInput>>;
}

export const ChatPromptContainer: React.FC<ChatPromptContainerProps> = ({
  uploadedFiles,
  setUploadedFiles,
  imageDataList,
  setImageDataList,
  messageInputProps,
}) => {
  return (
    <div
      className={classNames(
        'bg-bolt-elements-background-depth-2 p-3 rounded-2xl border border-bolt-elements-borderColor relative w-full max-w-chat mx-auto z-prompt mt-0',
        'dark:bg-gradient-to-br dark:from-bolt-elements-background-depth-2 dark:to-bolt-elements-background-depth-3/50 dark:border-bolt-elements-borderColor/60 dark:shadow-lg dark:shadow-black/10',
        'dark:backdrop-blur-sm',
      )}
    >
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
      <MessageInput {...messageInputProps} />
    </div>
  );
};
