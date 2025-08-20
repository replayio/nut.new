import { getIFrameSimulationData, type SimulationData } from '~/lib/replay/MessageHandler';
import { getCurrentIFrame } from '~/components/workbench/Preview/Preview';
import { waitForTime } from '~/utils/nut';
import { createScopedLogger } from '~/utils/logger';
import { pingTelemetry } from '~/lib/hooks/pingTelemetry';

// Maximum time to wait for simulation data for the iframe.
const FlushSimulationDataTimeoutMs = 2000;

const logger = createScopedLogger('FlushSimulationData');

export async function flushSimulationData(): Promise<SimulationData | undefined> {
  logger.trace('Start');

  const iframe = getCurrentIFrame();

  if (!iframe) {
    return undefined;
  }

  const simulationData = await Promise.race([
    getIFrameSimulationData(iframe),
    (async () => {
      await waitForTime(FlushSimulationDataTimeoutMs);
      return undefined;
    })(),
  ]);

  if (!simulationData) {
    pingTelemetry('FlushSimulationData.Timeout', {});
    return undefined;
  }

  logger.trace('Done', simulationData);

  return simulationData;
}
