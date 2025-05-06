import React, { Suspense, useState } from 'react';
import { classNames } from '~/utils/classNames';
import WithTooltip from '~/components/ui/Tooltip';
import { parseTestResultsMessage, type Message } from '~/lib/persistence/message';
import { MessageContents } from './MessageContents';
import { assert } from '~/lib/replay/ReplayProtocolClient';

interface MessagesProps {
  id?: string;
  className?: string;
  hasPendingMessage?: boolean;
  pendingMessageStatus?: string;
  messages?: Message[];
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, hasPendingMessage = false, pendingMessageStatus = '', messages = [] } = props;
  const [showDetailMessageIds, setShowDetailMessageIds] = useState<string[]>([]);

  const getLastUserResponse = (index: number) => {
    return messages.findLast((message, messageIndex) => messageIndex < index && message.category === 'UserResponse');
  };

  // Return whether the test results at index are the last for the associated user response.
  const isLastTestResults = (index: number) => {
    let lastIndex = -1;
    for (let i = index; i < messages.length; i++) {
      const { category } = messages[i];
      if (category === 'UserResponse') {
        return lastIndex === index;
      }
      if (category === 'TestResults') {
        lastIndex = i;
      }
    }
    return lastIndex === index;
  };

  const renderTestResults = (message: Message, index: number) => {
    assert(message.type === 'text');
    const testResults = parseTestResultsMessage(message.content);

    return (
      <div
        data-testid="message"
        key={index}
        className={classNames('flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)] mt-4 bg-bolt-elements-messages-background')}
      >
        <div className="flex flex-col gap-2">
          {testResults.map((result) => (
            <div key={result.title}>{result.title}</div>
          ))}
        </div>
      </div>
    );
  };

  const renderMessage = (message: Message, index: number) => {
    const { role, repositoryId } = message;
    const isUserMessage = role === 'user';
    const isFirst = index === 0;
    const isLast = index === messages.length - 1;

    if (!isUserMessage && message.category !== 'UserResponse') {
      const lastUserResponse = getLastUserResponse(index);
      if (!lastUserResponse) {
        return null;
      }

      if (message.category === 'TestResults') {
        // Only show the last test results for each user response.
        if (!isLastTestResults(index)) {
          return null;
        }
        return renderTestResults(message);
      } else {
        const showDetails = showDetailMessageIds.includes(lastUserResponse.id);
        if (!showDetails) {
          return null;
        }
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
                    'text-xl text-white hover:text-bolt-elements-textPrimary transition-colors'
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
                    'text-xl hover:text-bolt-elements-textPrimary transition-colors'
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
    <div id={id} ref={ref} className={props.className}>
      {messages.length > 0
        ? messages.map(renderMessage)
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
