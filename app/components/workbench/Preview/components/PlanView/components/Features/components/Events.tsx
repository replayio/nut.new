import { useStore } from '@nanostores/react';
import type { ChatResponse } from '~/lib/persistence/response';
import { chatStore } from '~/lib/stores/chat';

interface EventsProps {
  featureName: string | undefined;
}

function responseStartsFeature(response: ChatResponse, featureName: string | undefined): boolean {
  if (response.kind !== 'app-event') {
    return false;
  }
  if (featureName) {
    return response.event.name === 'start-feature' && response.event.featureName === featureName;
  }
  return response.event.name === 'start-mockup' || response.event.name === 'finish-mockup';
}

// Return separate streams of events for each worker which has operated on the feature.
function groupWorkerEvents(eventResponses: ChatResponse[], featureName: string | undefined): ChatResponse[][] {
  const chatIds: Set<string> = new Set();
  for (const response of eventResponses) {
    if (response.chatId && responseStartsFeature(response, featureName)) {
      chatIds.add(response.chatId);
    }
  }
  return Array.from(chatIds).map((chatId) => eventResponses.filter((response) => response.chatId === chatId));
}

const Events = ({ featureName }: EventsProps) => {
  const eventResponses = useStore(chatStore.events);
  const workerEvents = groupWorkerEvents(eventResponses, featureName);

  const renderTime = (time: string) => {
    const date = new Date(time);
    const base = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    if (base.endsWith('AM') || base.endsWith('PM')) {
      return base.slice(0, -2).trim();
    }
    return base;
  };

  const renderEventContents = (response: ChatResponse) => {
    switch (response.kind) {
      case 'done':
        return 'Finished';
      case 'error':
        return 'Had an error and failed';
      case 'aborted':
        return 'Development was aborted';
      default:
        break;
    }
    if (response.kind !== 'app-event') {
      return 'unknown';
    }
    const { event } = response;
    switch (event.name) {
      case 'start-feature':
        return event.why === 'implement' ? 'Writing the feature' : 'Writing tests';
      case 'start-mockup':
        return `Writing mockup components for ${event.pageName}`;
      case 'finish-mockup':
        return 'Finishing the mockup';
      case 'run-tests':
        return 'Running tests';
      case 'test-failure':
        if (event.title && event.recordingId) {
          return (
            <div>
              A test failed:
              <a
                href={`https://app.replay.io/recording/${event.recordingId}`}
                className="pl-1 text-blue-500"
                target="_blank"
                rel="noopener noreferrer"
              >
                {event.title}
              </a>
            </div>
          );
        }
        return 'A test failed';
      case 'analyze-test-failure':
        return 'Analyzing the test failure';
      case 'fix-test-failure':
        return 'Fixing the test failure';
      case 'merge-changes':
        return 'Merging changes from another worker';
      case 'resolve-merge-conflict':
        return 'Resolving merge conflict';
      case 'land-changes': {
        const { oldRepositoryId, newRepositoryId } = event;
        return (
          <div>
            Landing changes
            <a
              href={`/view-diff?old=${oldRepositoryId}&new=${newRepositoryId}`}
              className="pl-1 text-blue-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              View diff
            </a>
          </div>
        );
      }
    }
  };

  const renderEvent = (event: ChatResponse, index: number) => {
    const time = renderTime(event.time);
    return (
      <div key={index} className="flex items-center gap-3 pl-4 pb-2">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm" />
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary rounded-lg border border-bolt-elements-borderColor/30">
          {time}
        </span>
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary rounded-lg border border-bolt-elements-borderColor shadow-sm">
          {renderEventContents(event)}
        </span>
      </div>
    );
  };

  const renderWorkerEvents = (events: ChatResponse[], index: number) => {
    let peanuts = 0;
    for (const event of events) {
      if (event.kind === 'app-event' && event.peanuts && event.peanuts > peanuts) {
        peanuts = event.peanuts;
      }
    }

    return (
      <div key={index} className="border-t border-bolt-elements-borderColor/50 mb-2">
        <div className="p-4 pt-3 text-xs font-semibold text-bolt-elements-textSecondary uppercase tracking-wider mb-2 bg-bolt-elements-background-depth-2/30 px-2 py-1 rounded-md inline-block ml-2">
          Worker {index + 1} ({peanuts} peanuts)
        </div>
        {events.map(renderEvent)}
      </div>
    );
  };

  return workerEvents.map(renderWorkerEvents);
};

export default Events;
