import React, { Suspense, useState } from 'react';
import { classNames } from '~/utils/classNames';
import WithTooltip from '~/components/ui/Tooltip';
import {
  parseTestResultsMessage,
  type Message,
  TEST_RESULTS_CATEGORY,
  DESCRIBE_APP_CATEGORY,
  parseDescribeAppMessage,
  SEARCH_ARBORETUM_CATEGORY,
  type AppDescription,
  parseSearchArboretumResult,
  FEATURE_DONE_CATEGORY,
  parseFeatureDoneMessage,
  USER_RESPONSE_CATEGORY,
} from '~/lib/persistence/message';
import { MessageContents } from './MessageContents';

interface MessagesProps {
  id?: string;
  className?: string;
  hasPendingMessage?: boolean;
  pendingMessageStatus?: string;
  messages?: Message[];
}

function renderAppFeatures(allMessages: Message[], message: Message, index: number) {
  let arboretumDescription: AppDescription | undefined;
  let appDescription: AppDescription | undefined;
  switch (message.category) {
    case DESCRIBE_APP_CATEGORY:
      appDescription = parseDescribeAppMessage(message);
      break;
    case SEARCH_ARBORETUM_CATEGORY: {
      const result = parseSearchArboretumResult(message);
      if (result) {
        arboretumDescription = result.arboretumDescription;
        appDescription = result.revisedDescription;
      }
      break;
    }
  }

  if (!appDescription) {
    return null;
  }

  const finishedFeatures = new Set<string>();
  for (let i = index; i < allMessages.length; i++) {
    if (allMessages[i].category == USER_RESPONSE_CATEGORY) {
      break;
    }
    if (allMessages[i].category == FEATURE_DONE_CATEGORY) {
      const result = parseFeatureDoneMessage(allMessages[i]);
      if (result) {
        finishedFeatures.add(result.featureDescription);
      }
    }
  }

  return (
    <div
      data-testid="message"
      key={index}
      className={classNames(
        'flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)] mt-4 bg-bolt-elements-messages-background text-bolt-elements-textPrimary',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold mb-2">Development Plan</div>
        <div>{appDescription.description}</div>
        {arboretumDescription && (
          <>
            <div className="text-lg font-semibold mb-2">Prebuilt App</div>
            <div>I found a prebuilt app that will be a good starting point:</div>
            <div>{arboretumDescription.description}</div>
          </>
        )}
        <div className="text-lg font-semibold mb-2">Features</div>
        {appDescription.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <div
              className={classNames('w-3 h-3 rounded-full border border-black', {
                'bg-gray-300': !finishedFeatures.has(feature),
                'bg-green-500': finishedFeatures.has(feature),
              })}
            />
            <div>{feature}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderTestResults(message: Message, index: number) {
  const testResults = parseTestResultsMessage(message);

  return (
    <div
      data-testid="message"
      key={index}
      className={classNames(
        'flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)] mt-4 bg-bolt-elements-messages-background text-bolt-elements-textPrimary',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold mb-2">Test Results</div>
        {testResults.map((result) => (
          <div key={result.title} className="flex items-center gap-2">
            <div
              className={classNames('w-3 h-3 rounded-full border border-black', {
                'bg-green-500': result.status === 'Pass',
                'bg-red-500': result.status === 'Fail',
                'bg-gray-300': result.status === 'NotRun',
              })}
            />
            {result.recordingId ? (
              <a
                href={`https://app.replay.io/recording/${result.recordingId}`}
                className="underline hover:text-blue-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                {result.title}
              </a>
            ) : (
              <div>{result.title}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderFeatureDone(message: Message, index: number) {
  const result = parseFeatureDoneMessage(message);
  if (!result) {
    return null;
  }
  return (
    <div
      data-testid="message"
      key={index}
      className={classNames(
        'flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)] mt-4 bg-bolt-elements-messages-background text-bolt-elements-textPrimary',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold mb-2">Feature Done</div>
        <div>{result.featureDescription}</div>
      </div>
    </div>
  );
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, hasPendingMessage = false, pendingMessageStatus = '', messages = [] } = props;
  const [showDetailMessageIds, setShowDetailMessageIds] = useState<string[]>([]);

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

  // Return whether the test results at index are the last for the associated user response.
  const isLastTestResults = (index: number) => {
    let lastIndex = -1;
    for (let i = index; i < messages.length; i++) {
      const { category } = messages[i];
      if (category === USER_RESPONSE_CATEGORY) {
        return lastIndex === index;
      }
      if (category === TEST_RESULTS_CATEGORY) {
        lastIndex = i;
      }
    }
    return lastIndex === index;
  };

  const hasLaterSearchArboretumMessage = (index: number) => {
    for (let i = index + 1; i < messages.length; i++) {
      const { category } = messages[i];
      if (category === USER_RESPONSE_CATEGORY) {
        return false;
      }
      if (category === SEARCH_ARBORETUM_CATEGORY) {
        return true;
      }
    }
    return false;
  };

  const renderMessage = (message: Message, index: number) => {
    const { role, repositoryId } = message;
    const isUserMessage = role === 'user';
    const isFirst = index === 0;
    const isLast = index === messages.length - 1;

    if (!isUserMessage && message.category && message.category !== USER_RESPONSE_CATEGORY) {
      const lastUserResponse = getLastUserResponse(index);
      const showDetails = !lastUserResponse || showDetailMessageIds.includes(lastUserResponse.id);

      if (message.category === DESCRIBE_APP_CATEGORY) {
        // We only render the DescribeApp if there is no later arboretum match,
        // which will be rendered instead.
        if (hasLaterSearchArboretumMessage(index) && !showDetails) {
          return null;
        }
        return renderAppFeatures(messages, message, index);
      }

      if (message.category === TEST_RESULTS_CATEGORY) {
        // The default view only shows the last test results for each user response.
        if (!isLastTestResults(index) && !showDetails) {
          return null;
        }
        return renderTestResults(message, index);
      }

      if (message.category === SEARCH_ARBORETUM_CATEGORY) {
        return renderAppFeatures(messages, message, index);
      }

      if (message.category === FEATURE_DONE_CATEGORY && showDetails) {
        return renderFeatureDone(message, index);
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
    <div id={id} ref={ref} className={props.className}>
      {messages.length > 0 ? messages.map(renderMessage) : null}
      {hasPendingMessage && (
        <div className="w-full text-bolt-elements-textSecondary flex items-center">
          <span className="i-svg-spinners:3-dots-fade inline-block w-[1em] h-[1em] mr-2 text-4xl"></span>
          <span className="text-lg">{pendingMessageStatus ? `${pendingMessageStatus}...` : ''}</span>
        </div>
      )}
    </div>
  );
});
