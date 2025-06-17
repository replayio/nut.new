import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { getCurrentIFrame } from '~/components/workbench/Preview/Preview';
import { simulationAddData } from '~/lib/replay/ChatManager';

export async function flushSimulationData() {
  const iframe = getCurrentIFrame();

  if (!iframe) {
    return;
  }

  const simulationData = await getIFrameSimulationData(iframe);

  if (!simulationData.length) {
    return;
  }

  simulationAddData(simulationData);
}

export function setupSimulationInterval() {
  setInterval(async () => {
    flushSimulationData();
  }, 1000);
}
