import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { classNames } from '~/utils/classNames';
import { type Message, DISCOVERY_RESPONSE_CATEGORY, DISCOVERY_RATING_CATEGORY } from '~/lib/persistence/message';
import { MessageContents } from './components/MessageContents';
import { JumpToBottom } from './components/JumpToBottom';
import { APP_SUMMARY_CATEGORY } from '~/lib/persistence/messageAppSummary';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { pendingMessageStatusStore } from '~/lib/stores/status';
import { shouldDisplayMessage } from '~/lib/replay/SendChatMessage';

interface MessagesProps {
  id?: string;
  className?: string;
  onLastMessageCheckboxChange?: (contents: string, checked: boolean) => void;
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>(({ onLastMessageCheckboxChange }, ref) => {
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messages = useStore(chatStore.messages);
  const hasPendingMessage = useStore(chatStore.hasPendingMessage);
  const pendingMessageStatus = useStore(pendingMessageStatusStore);

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
    setShowTopShadow(scrollTop > 10);
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

  useEffect(() => {
    if (hasPendingMessage && !showJumpToBottom) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [pendingMessageStatus, hasPendingMessage, showJumpToBottom]);

  const renderMessage = (message: Message, index: number) => {
    const { role } = message;
    const isUserMessage = role === 'user';
    const isFirst = index === 0;
    const isLast = index === messages.length - 1;

    // Ignore messages that aren't displayed and don't affect the UI in other ways.
    if (!shouldDisplayMessage(message)) {
      if (message.category === APP_SUMMARY_CATEGORY) {
        // App summaries are now shown in the preview area, not in chat
        return null;
      }

      if (message.category === DISCOVERY_RATING_CATEGORY) {
        return null;
      }
    }

    let onCheckboxChange = undefined;
    if (isActiveDiscoveryResponse(messages, message)) {
      onCheckboxChange = onLastMessageCheckboxChange;
    }

    return (
      <div
        data-testid="message"
        key={index}
        className={classNames('group relative w-full transition-all duration-200', {
          'mt-6': !isFirst,
        })}
      >
        <div
          className={classNames('p-6 rounded-2xl border transition-all duration-200', {
            // User messages
            'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/30':
              isUserMessage,
            // Assistant messages
            'bg-bolt-elements-messages-background border-bolt-elements-borderColor hover:border-bolt-elements-borderColor/60':
              !isUserMessage && (!hasPendingMessage || (hasPendingMessage && !isLast)),
            // Last message when pending
            'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent border-bolt-elements-borderColor/50':
              !isUserMessage && hasPendingMessage && isLast,
          })}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center w-full py-8">
                <div className="flex items-center gap-3 text-bolt-elements-textSecondary">
                  <div className="w-6 h-6 border-2 border-bolt-elements-textSecondary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              </div>
            }
          >
            <div className="flex items-center gap-3 mb-4">
              {isUserMessage && (
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 text-white rounded-full shadow-lg">
                  <div className="i-ph:user text-lg"></div>
                </div>
              )}

              {!isUserMessage && (
                <div className="flex items-center justify-center w-8 h-8 bg-bolt-elements-background-depth-2 border-2 border-bolt-elements-borderColor text-bolt-elements-textPrimary rounded-full shadow-sm">
                  <div className="w-6 h-6">
                    <img src="/logo-styled.svg" alt="Nut" className="w-full h-full" />
                  </div>
                </div>
              )}

              <span className={classNames('text-sm font-medium text-bolt-elements-textHeading')}>
                {isUserMessage ? 'Me' : 'Nut'}
              </span>
            </div>

            <div className="w-full">
              <MessageContents message={message} onCheckboxChange={onCheckboxChange} />
            </div>
          </Suspense>
        </div>

        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-bolt-elements-focus rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
    );
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {showTopShadow && (
        <div className="absolute top-0 left-0 right-0 h-px bg-bolt-elements-borderColor/30 shadow-sm z-2 pointer-events-none transition-opacity duration-200" />
      )}

      <div
        ref={setRefs}
        className={classNames('flex-1 overflow-y-auto rounded-b-2xl', 'flex flex-col w-full max-w-chat pb-6 mx-auto')}
      >
        {messages.length > 0 ? messages.map(renderMessage) : null}
        {hasPendingMessage && (
          <div className="w-full mt-3">
            <div className="flex gap-4 pl-6">
              <div className="flex items-center gap-3 text-bolt-elements-textSecondary py-2">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
                {pendingMessageStatus && (
                  <span className="text-sm font-medium opacity-60">{pendingMessageStatus}...</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <JumpToBottom visible={showJumpToBottom} onClick={scrollToBottom} />
    </div>
  );
});

function isActiveDiscoveryResponse(messages: Message[], message: Message) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].category === DISCOVERY_RESPONSE_CATEGORY) {
      return message.id === messages[i].id;
    }
    if (messages[i].category != DISCOVERY_RATING_CATEGORY) {
      return false;
    }
  }
  return false;
}
