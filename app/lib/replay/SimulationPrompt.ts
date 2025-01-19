// Core logic for using simulation data from remote recording to enhance
// the AI developer prompt.

// Currently the simulation prompt is sent from the server.

import { type SimulationData, type MouseData } from './Recording';
import { sendCommandDedicatedClient } from './ReplayProtocolClient';
import { type ChatFileChange } from '~/utils/chatStreamController';

// Data supplied by the client for a simulation prompt, separate from the chat input.
export interface SimulationPromptClientData {
  simulationData: SimulationData;
  repositoryContents: string; // base64 encoded zip file
  mouseData?: MouseData;
}

interface RerecordGenerateParams {
  rerecordData: SimulationData;
  repositoryContents: string;
}

export async function getSimulationPromptRecording(
  simulationData: SimulationData,
  repositoryContents: string
): Promise<string> {
  const params: RerecordGenerateParams = {
    rerecordData: simulationData,
    repositoryContents,
  };
  const rv = await sendCommandDedicatedClient({
    method: "Recording.globalExperimentalCommand",
    params: {
      name: "rerecordGenerate",
      params,
    },
  });

  return (rv as { rval: { rerecordedRecordingId: string } }).rval.rerecordedRecordingId;
}
