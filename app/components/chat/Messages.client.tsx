import React, { Suspense } from 'react';
import { classNames } from '~/utils/classNames';
import WithTooltip from '~/components/ui/Tooltip';
import { getPreviousRepositoryId, type Message } from '~/lib/persistence/message';
import { MessageContents } from './MessageContents';

interface MessagesProps {
  id?: string;
  className?: string;
  hasPendingMessage?: boolean;
  pendingMessageStatus?: string;
  messages?: Message[];
  onRewind?: (messageId: string) => void;
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, hasPendingMessage = false, pendingMessageStatus = '', messages = [], onRewind } = props;

  return (
    <div id={id} ref={ref} className={props.className}>
      {messages.length > 0
        ? messages.map((message, index) => {
            const { role, id: messageId, repositoryId } = message;
            const previousRepositoryId = getPreviousRepositoryId(messages, index);
            const isUserMessage = role === 'user';
            const isFirst = index === 0;
            const isLast = index === messages.length - 1;

            return (
              <div
                data-testid="message"
                key={index}
                className={classNames('flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)]', {
                  'bg-bolt-elements-messages-background':
                    isUserMessage || !hasPendingMessage || (hasPendingMessage && !isLast),
                  'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent':
                    hasPendingMessage && isLast,
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
                    <MessageContents message={message} />
                  </div>
                  {previousRepositoryId && repositoryId && onRewind && (
                    <div className="flex gap-2 flex-col lg:flex-row">
                      <WithTooltip tooltip="Undo changes in this message">
                        <button
                          onClick={() => {
                            onRewind(messageId);
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
      {hasPendingMessage && (
        <div className="w-full text-bolt-elements-textSecondary flex items-center">
          <span className="i-svg-spinners:3-dots-fade inline-block w-[1em] h-[1em] mr-2 text-4xl"></span>
          <span className="text-lg">{pendingMessageStatus ? `${pendingMessageStatus}...` : ''}</span>
        </div>
      )}
    </div>
  );
});
