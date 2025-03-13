import type { Message } from 'ai';
import React, { Suspense } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import WithTooltip from '~/components/ui/Tooltip';
import { assert } from '~/lib/replay/ReplayProtocolClient';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
  onRewind?: (messageId: string, contents: string) => void;
}

interface ProjectContents {
  content: string; // base64 encoded
}

const gProjectContentsByMessageId = new Map<string, ProjectContents>();

export function saveProjectContents(messageId: string, contents: ProjectContents) {
  gProjectContentsByMessageId.set(messageId, contents);
}

export function getLastMessageProjectContents(messages: Message[], index: number) {
  /*
   * The message index is for the model response, and the project
   * contents will be associated with the last message present when
   * the user prompt was sent to the model. This could be either two
   * or three messages back, depending on whether a bug explanation was added.
   */
  const beforeUserMessage = messages[index - 2];
  const contents = gProjectContentsByMessageId.get(beforeUserMessage?.id);

  if (!contents) {
    const priorMessage = messages[index - 3];
    const priorContents = gProjectContentsByMessageId.get(priorMessage?.id);

    if (!priorContents) {
      return undefined;
    }

    /*
     * We still rewind to just before the user message to retain any
     * explanation from the Nut API.
     */
    return { rewindMessageId: beforeUserMessage.id, contentsMessageId: priorMessage.id, contents: priorContents };
  }

  return { rewindMessageId: beforeUserMessage.id, contentsMessageId: beforeUserMessage.id, contents };
}

export function hasFileModifications(content: string) {
  return content.includes('__boltArtifact__');
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [], onRewind } = props;

  return (
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
                <Suspense
                  fallback={
                    <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
                  }
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
                  {!isUserMessage &&
                    messageId &&
                    onRewind &&
                    getLastMessageProjectContents(messages, index) &&
                    hasFileModifications(content) && (
                      <div className="flex gap-2 flex-col lg:flex-row">
                        <WithTooltip tooltip="Undo changes in this message">
                          <button
                            onClick={() => {
                              const info = getLastMessageProjectContents(messages, index);
                              assert(info);
                              onRewind(info.rewindMessageId, info.contents.content);
                            }}
                            key="i-ph:arrow-u-up-left"
                            className={classNames(
                              'i-ph:arrow-u-up-left',
                              'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                            )}
                          />
                        </WithTooltip>
                      </div>
                    )}
                </Suspense>
              </div>
            );
          })
        : null}
      {isStreaming && (
        <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
      )}
    </div>
  );
});
