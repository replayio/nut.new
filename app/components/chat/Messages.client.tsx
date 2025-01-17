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
import { assert, sendCommandDedicatedClient } from "~/lib/replay/ReplayProtocolClient";

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

interface ProjectContents {
  content: string; // base64 encoded
}

const gProjectContentsByMessageId = new Map<string, ProjectContents>();

export function saveProjectContents(messageId: string, contents: ProjectContents) {
  gProjectContentsByMessageId.set(messageId, contents);
}

// The rewind button is not fully implemented yet.
const EnableRewindButton = false;

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [] } = props;

  const getLastMessageProjectContents = (index: number) => {
    // The message index is for the model response, and the project
    // contents will be associated with the last message present when
    // the user prompt was sent to the model. So look back two messages
    // for the previous contents.
    if (index < 2) {
      return undefined;
    }
    const previousMessage = messages[index - 2];
    return gProjectContentsByMessageId.get(previousMessage.id);
  };

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
                {!isUserMessage && messageId && getLastMessageProjectContents(index) && EnableRewindButton && (
                  <div className="flex gap-2 flex-col lg:flex-row">
                    <WithTooltip tooltip="Rewind to this message">
                      <button
                        onClick={() => {
                          const contents = getLastMessageProjectContents(index);
                          assert(contents);
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
