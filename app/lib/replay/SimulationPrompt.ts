// Core logic for using simulation data from remote recording to enhance
// the AI developer prompt.

// Currently the simulation prompt is sent from the server.

import { type SimulationData, type MouseData } from './Recording';
import { ProtocolClient, sendCommandDedicatedClient } from './ReplayProtocolClient';

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

export async function getSimulationRecording(
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

export async function getSimulationEnhancedPrompt(recordingId: string): Promise<string> {
  const client = new ProtocolClient();
  await client.initialize();
  try {
    const createSessionRval = await client.sendCommand({ method: "Recording.createSession", params: { recordingId } });
    const sessionId = (createSessionRval as { sessionId: string }).sessionId;

    const rval = await client.sendCommand({
      method: "Session.experimentalCommand",
      params: {
        name: "analyzeExecutionPoint",
        params: {},
      },
      sessionId,
    });

    console.log("analyzeExecutionPointRval", rval);
  } finally {
    client.close();
  }
  return "";
}
