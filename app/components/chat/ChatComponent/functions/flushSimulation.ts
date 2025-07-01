import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { getCurrentIFrame } from '~/components/workbench/Preview/Preview';
import { waitForTime } from '~/lib/replay/ReplayProtocolClient';
import { createScopedLogger } from '~/utils/logger';
import { pingTelemetry } from '~/lib/hooks/pingTelemetry';
import type { SimulationData } from '~/lib/replay/SimulationData';

// Maximum time to wait for simulation data for the iframe.
const FlushSimulationTimeoutMs = 2000;

const logger = createScopedLogger('FlushSimulation');

export async function flushSimulationData(): Promise<SimulationData | undefined> {
  logger.trace('Start');

  const iframe = getCurrentIFrame();

  if (!iframe) {
    return undefined;
  }

  const simulationData = await Promise.race([
    getIFrameSimulationData(iframe),
    (async () => {
      await waitForTime(FlushSimulationTimeoutMs);
      return undefined;
    })(),
  ]);

  if (!simulationData) {
    pingTelemetry('FlushSimulation.Timeout', {});
    return undefined;
  }

  if (!simulationData.length) {
    return undefined;
  }

  logger.trace('Done', simulationData.length);

  return simulationData;
}
