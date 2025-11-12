import React from 'react';
import { motion } from 'framer-motion';
import { IntroSection } from '~/components/chat/BaseChat/components/IntroSection/IntroSection';
import { SharedChatInput } from '~/components/chat/SharedChatInput';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import type { MessageInput } from '~/components/chat/MessageInput/MessageInput';

interface LandingPageProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sendMessage: (params: any) => void;
  handleStop: () => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  imageDataList: string[];
  setImageDataList: (dataList: string[]) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  textareaRef,
  input,
  handleInputChange,
  sendMessage,
  handleStop,
  uploadedFiles,
  setUploadedFiles,
  imageDataList,
  setImageDataList,
}) => {
  const handleExampleClick = (event: React.UIEvent, messageInput: string) => {
    sendMessage({
      messageInput,
      chatMode: 'UserMessage',
    });
  };

  const messageInputProps: Partial<React.ComponentProps<typeof MessageInput>> = {
    textareaRef,
    handleSendMessage: (params) => {
      sendMessage(params);
    },
    handleStop,
    input,
    handleInputChange,
    uploadedFiles,
    setUploadedFiles,
    imageDataList,
    setImageDataList,
  };

  return (
    <motion.div
      className="flex flex-col h-full w-full overflow-y-auto"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: { duration: 0.2 },
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Intro Section */}
        <motion.div
          layoutId="intro-section"
          exit={{
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.2 },
          }}
        >
          <IntroSection />
        </motion.div>

        {/* Chat Input - Centered */}
        <div className="w-full max-w-3xl mt-8 mb-4">
          <SharedChatInput
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            imageDataList={imageDataList}
            setImageDataList={setImageDataList}
            messageInputProps={messageInputProps}
            layoutId="chat-input"
          />
        </div>

        {/* Example Prompts */}
        <motion.div
          exit={{
            opacity: 0,
            transition: { duration: 0.1 },
          }}
        >
          {ExamplePrompts(handleExampleClick)}
        </motion.div>
      </div>
    </motion.div>
  );
};
