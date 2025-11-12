import React from 'react';
import { motion } from 'framer-motion';
import { ChatPromptContainer } from '~/components/chat/BaseChat/components/ChatPromptContainer/ChatPromptContainer';
import { MessageInput } from '~/components/chat/MessageInput/MessageInput';

interface SharedChatInputProps {
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  imageDataList: string[];
  setImageDataList: (dataList: string[]) => void;
  messageInputProps: Partial<React.ComponentProps<typeof MessageInput>>;
  layoutId?: string;
}

export const SharedChatInput: React.FC<SharedChatInputProps> = ({
  uploadedFiles,
  setUploadedFiles,
  imageDataList,
  setImageDataList,
  messageInputProps,
  layoutId = 'chat-input',
}) => {
  return (
    <motion.div layoutId={layoutId} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
      <ChatPromptContainer
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        imageDataList={imageDataList}
        setImageDataList={setImageDataList}
        messageInputProps={messageInputProps}
      />
    </motion.div>
  );
};
