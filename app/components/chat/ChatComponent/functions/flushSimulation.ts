import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { simulationAddData } from '~/lib/replay/ChatManager';
import { getCurrentIFrame } from '~/components/workbench/Preview/Preview';
import { waitForTime } from '~/lib/replay/ReplayProtocolClient';
import { createScopedLogger } from '~/utils/logger';
import { pingTelemetry } from '~/lib/hooks/pingTelemetry';

// Maximum time to wait for simulation data for the iframe.
const FlushSimulationTimeoutMs = 2000;

const logger = createScopedLogger('FlushSimulation');

async function flushSimulationData() {
  logger.trace('Start');

  const iframe = getCurrentIFrame();

  if (!iframe) {
    return;
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
    return;
  }

  if (!simulationData.length) {
    return;
  }

  logger.trace('Done', simulationData.length);

  // Add the simulation data to the chat.
  simulationAddData(simulationData);
}

export default flushSimulationData;
