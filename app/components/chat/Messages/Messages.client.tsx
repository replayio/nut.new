import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { classNames } from '~/utils/classNames';
import WithTooltip from '~/components/ui/Tooltip';
import { type Message, USER_RESPONSE_CATEGORY } from '~/lib/persistence/message';
import { MessageContents } from './components/MessageContents';
import { JumpToBottom } from './components/JumpToBottom';
import { APP_SUMMARY_CATEGORY } from '~/lib/persistence/messageAppSummary';

interface MessagesProps {
  id?: string;
  className?: string;
  hasPendingMessage?: boolean;
  pendingMessageStatus?: string;
  messages?: Message[];
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>(
  ({ messages = [], hasPendingMessage = false, pendingMessageStatus = '' }, ref) => {
    const [showDetailMessageIds, setShowDetailMessageIds] = useState<string[]>([]);
    const [showJumpToBottom, setShowJumpToBottom] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const setRefs = useCallback(
      (element: HTMLDivElement | null) => {
        containerRef.current = element;

        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref],
    );

    const handleScroll = () => {
      if (!containerRef.current) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      setShowJumpToBottom(distanceFromBottom > 50);
    };

    const scrollToBottom = () => {
      if (!containerRef.current) {
        return;
      }

      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    };

    useEffect(() => {
      const container = containerRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
      }
      return undefined;
    }, []);

    useEffect(() => {
      if (!showJumpToBottom) {
        scrollToBottom();
      }
    }, [messages, showJumpToBottom]);

    // Get the last user response before a given message, or null if there is
    // no user response between this and the last user message.
    const getLastUserResponse = (index: number) => {
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i].category === USER_RESPONSE_CATEGORY) {
          return messages[i];
        }
        if (messages[i].role === 'user') {
          return null;
        }
      }
      return null;
    };



    const renderMessage = (message: Message, index: number) => {
      const { role, repositoryId } = message;
      const isUserMessage = role === 'user';
      const isFirst = index === 0;
      const isLast = index === messages.length - 1;

      if (!isUserMessage && message.category && message.category !== USER_RESPONSE_CATEGORY) {
        const lastUserResponse = getLastUserResponse(index);
        const showDetails = !lastUserResponse || showDetailMessageIds.includes(lastUserResponse.id);

        if (message.category === APP_SUMMARY_CATEGORY) {
          // App summaries are now shown in the preview area, not in chat
          return null;
        }

        if (!showDetails) {
          return null;
        }
      }

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
            {!isUserMessage && message.category === 'UserResponse' && showDetailMessageIds.includes(message.id) && (
              <div className="flex items-center justify-center bg-green-800 p-2 rounded-lg h-fit -mt-1.5">
                <WithTooltip tooltip="Hide chat details">
                  <button
                    onClick={() => {
                      setShowDetailMessageIds(showDetailMessageIds.filter((id) => id !== message.id));
                    }}
                    className={classNames(
                      'i-ph:list-dashes',
                      'text-xl text-white hover:text-bolt-elements-textPrimary transition-colors',
                    )}
                  />
                </WithTooltip>
              </div>
            )}
            {!isUserMessage && message.category === 'UserResponse' && !showDetailMessageIds.includes(message.id) && (
              <div className="flex items-center justify-center p-2 rounded-lg h-fit -mt-1.5">
                <WithTooltip tooltip="Show chat details">
                  <button
                    onClick={() => {
                      setShowDetailMessageIds([...showDetailMessageIds, message.id]);
                    }}
                    className={classNames(
                      'i-ph:list-dashes',
                      'text-xl hover:text-bolt-elements-textPrimary transition-colors',
                    )}
                  />
                </WithTooltip>
              </div>
            )}
            {repositoryId && (
              <div className="flex gap-2 flex-col lg:flex-row">
                <WithTooltip tooltip="Start new chat from here">
                  <button
                    onClick={() => {
                      window.open(`/repository/${repositoryId}`, '_blank');
                    }}
                    className={classNames(
                      'i-ph:git-fork',
                      'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                    )}
                  />
                </WithTooltip>
              </div>
            )}
          </Suspense>
        </div>
      );
    };

    return (
      <div className="relative flex-1 min-h-0">
        <div
          ref={setRefs}
          className={classNames('absolute inset-0 overflow-y-auto', 'flex flex-col w-full max-w-chat pb-6 mx-auto')}
        >
          {messages.length > 0 ? messages.map(renderMessage) : null}
          {hasPendingMessage && (
            <div className="w-full text-bolt-elements-textSecondary flex items-center">
              <span className="i-svg-spinners:3-dots-fade inline-block w-[1em] h-[1em] mr-2 text-4xl"></span>
              <span className="text-lg">{pendingMessageStatus ? `${pendingMessageStatus}...` : ''}</span>
            </div>
          )}
        </div>
        <JumpToBottom visible={showJumpToBottom} onClick={scrollToBottom} />
      </div>
    );
  },
);
