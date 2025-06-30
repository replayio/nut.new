/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useChatHistory } from '~/lib/persistence';
import { renderLogger } from '~/utils/logger';
import ChatImplementer from './components/ChatImplementer/ChatImplementer';
import flushSimulationData from './functions/flushSimulation';

setInterval(async () => {
  flushSimulationData();
}, 1000);

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, resumeChat, storeMessageHistory } = useChatHistory();

  return (
    <>
      {ready && (
        <ChatImplementer
          initialMessages={initialMessages}
          resumeChat={resumeChat}
          storeMessageHistory={storeMessageHistory}
        />
      )}
    </>
  );
}
