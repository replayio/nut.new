import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { simulationAddData } from '~/lib/replay/ChatManager';
import { getCurrentIFrame } from '~/components/workbench/Preview/Preview';

async function flushSimulationData() {
  //console.log("FlushSimulationData");

  const iframe = getCurrentIFrame();

  if (!iframe) {
    return;
  }

  const simulationData = await getIFrameSimulationData(iframe);

  if (!simulationData.length) {
    return;
  }

  //console.log("HaveSimulationData", simulationData.length);

  // Add the simulation data to the chat.
  simulationAddData(simulationData);
}

export default flushSimulationData;
