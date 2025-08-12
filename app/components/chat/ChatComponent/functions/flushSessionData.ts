import { getIFrameSessionData, type SessionData } from '~/lib/replay/MessageHandler';
import { getCurrentIFrame } from '~/components/workbench/Preview/Preview';
import { waitForTime } from '~/utils/nut';
import { createScopedLogger } from '~/utils/logger';
import { pingTelemetry } from '~/lib/hooks/pingTelemetry';

// Maximum time to wait for session data for the iframe.
const FlushSessionDataTimeoutMs = 2000;

const logger = createScopedLogger('FlushSessionData');

export async function flushSessionData(): Promise<SessionData | undefined> {
  logger.trace('Start');

  const iframe = getCurrentIFrame();

  if (!iframe) {
    return undefined;
  }

  const sessionData = await Promise.race([
    getIFrameSessionData(iframe),
    (async () => {
      await waitForTime(FlushSessionDataTimeoutMs);
      return undefined;
    })(),
  ]);

  if (!sessionData) {
    pingTelemetry('FlushSessionData.Timeout', {});
    return undefined;
  }

  logger.trace('Done', sessionData);

  return sessionData;
}
