import type { Message } from 'ai';
import React, { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage, getAnnotationsTokensUsage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { useLocation } from '@remix-run/react';
import { db, chatId } from '~/lib/persistence/useChatHistory';
import { forkChat } from '~/lib/persistence/db';
import { toast } from 'react-toastify';
import WithTooltip from '~/components/ui/Tooltip';
import { assert } from "~/components/workbench/ReplayProtocolClient";
import ReactModal from 'react-modal';

ReactModal.setAppElement('#root');

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

// Combines information about the contents of a project along with a prompt
// from the user and any associated Replay data to accomplish a task. Together
// this information is enough that the model should be able to generate a
// suitable fix.
interface ProjectPrompt {
  content: Blob;
  uniqueProjectName: string;
  input: string;
}

const gProjectPromptsByMessageId = new Map<string, ProjectPrompt>();

export function saveProjectPrompt(messageId: string, prompt: ProjectPrompt) {
  gProjectPromptsByMessageId.set(messageId, prompt);
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [] } = props;
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<ProjectPrompt | null>(null);
  const [formData, setFormData] = useState({
    promptId: '',
    name: '',
    email: ''
  });

  const handleRewind = (messageId: string) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('rewindTo', messageId);
    window.location.search = searchParams.toString();
  };

  const handleFork = async (messageId: string) => {
    try {
      if (!db || !chatId.get()) {
        toast.error('Chat persistence is not available');
        return;
      }

      const urlId = await forkChat(db, chatId.get()!, messageId);
      window.location.href = `/chat/${urlId}`;
    } catch (error) {
      toast.error('Failed to fork chat: ' + (error as Error).message);
    }
  };

  const handleSaveProblem = (prompt: ProjectPrompt) => {
    setCurrentPrompt(prompt);
    setIsModalOpen(true);
  };

  const handleSubmitProblem = () => {
    console.log("SubmitProblem");
  }

  const getLastMessageProjectPrompt = (index: number) => {
    // The message index is for the model response, and the project
    // prompt will be associated with the last message present when
    // the user prompt was sent to the model. So look back two messages
    // for the associated prompt.
    if (index < 2) {
      return null;
    }
    const previousMessage = messages[index - 2];
    return gProjectPromptsByMessageId.get(previousMessage.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <div id={id} ref={ref} className={props.className}>
        {messages.length > 0
          ? messages.map((message, index) => {
              const { role, content, id: messageId } = message;
              const isUserMessage = role === 'user';
              const isFirst = index === 0;
              const isLast = index === messages.length - 1;

              return (
                <div
                  key={index}
                  className={classNames('flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)]', {
                    'bg-bolt-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                    'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent':
                      isStreaming && isLast,
                    'mt-4': !isFirst,
                  })}
                >
                  {isUserMessage && (
                    <div className="flex items-center justify-center w-[34px] h-[34px] overflow-hidden bg-white text-gray-600 rounded-full shrink-0 self-start">
                      <div className="i-ph:user-fill text-xl"></div>
                    </div>
                  )}
                  <div className="grid grid-col-1 w-full">
                    {isUserMessage ? (
                      <UserMessage content={content} />
                    ) : (
                      <AssistantMessage content={content} annotations={message.annotations} />
                    )}
                  </div>
                  {!isUserMessage && (
                    <div className="flex gap-2 flex-col lg:flex-row">
                      {messageId && (
                        <WithTooltip tooltip="Revert to this message">
                          <button
                            onClick={() => handleRewind(messageId)}
                            key="i-ph:arrow-u-up-left"
                            className={classNames(
                              'i-ph:arrow-u-up-left',
                              'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                            )}
                          />
                        </WithTooltip>
                      )}

                      <WithTooltip tooltip="Fork chat from this message">
                        <button
                          onClick={() => handleFork(messageId)}
                          key="i-ph:git-fork"
                          className={classNames(
                            'i-ph:git-fork',
                            'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                          )}
                        />
                      </WithTooltip>

                      {getAnnotationsTokensUsage(message.annotations) &&
                       getLastMessageProjectPrompt(index) && (
                        <WithTooltip tooltip="Save prompt as new problem">
                          <button
                            onClick={() => {
                              const prompt = getLastMessageProjectPrompt(index);
                              assert(prompt);
                              handleSaveProblem(prompt);
                            }}
                            key="i-ph:export"
                            className={classNames(
                              'i-ph:export',
                              'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                            )}
                          />
                        </WithTooltip>
                      )}

                      <WithTooltip tooltip="Save benchmark problem">
                        <button
                          onClick={() => {
                            setIsModalOpen(true);
                          }}
                          key="i-ph:export"
                          className={classNames(
                            'i-ph:export',
                            'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                          )}
                        />
                      </WithTooltip>
                    </div>
                  )}
                </div>
              );
            })
          : null}
        {isStreaming && (
          <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
        )}
      </div>

      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-2xl w-full z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
      >
        <div className="text-center">Save prompts as new problems when the AI's results are unsatisfactory.</div>
        <div className="text-center">Problems are publicly visible and are used to improve AI performance.</div>
        <form onSubmit={handleSubmitProblem} style={{ marginTop: "10px" }}>
          <div className="grid grid-cols-[auto_1fr] gap-4 max-w-md mx-auto">
            <div className="flex items-center">Prompt ID:</div>
            <input type="text"
              name="promptId"
              className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
              value={formData.promptId}
              onChange={handleInputChange}
              required={true}
            />

            <div className="flex items-center">Name:</div>
            <input type="text"
              name="name"
              className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
              value={formData.name}
              onChange={handleInputChange}
              required={true}
            />

            <div className="flex items-center">Email:</div>
            <input type="text"
              name="email"
              className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 w-full border border-gray-300"
              value={formData.email}
              onChange={handleInputChange}
              required={true}
            />
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Submit</button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
          </div>
        </form>
      </ReactModal>
    </>
  );
});
