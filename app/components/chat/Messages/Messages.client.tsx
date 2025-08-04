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
        className={classNames('flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)]', {
          'bg-bolt-elements-messages-background': isUserMessage || !hasPendingMessage || (hasPendingMessage && !isLast),
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
            <MessageContents message={message} onCheckboxChange={onCheckboxChange} />
          </div>
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
