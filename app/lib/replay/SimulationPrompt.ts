// Core logic for prompting the AI developer with the repository state and simulation data.

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

export interface SimulationChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Params format for the simulationPrompt command.
interface SimulationPrompt {
  simulationData: SimulationData;
  repositoryContents: string; // base64 encoded zip file
  userPrompt: string;
  chatHistory: SimulationChatMessage[];
  mouseData?: MouseData;
  anthropicAPIKey: string;
}

// Result format for the simulationPrompt command.
interface SimulationPromptResult {
  message: string;
  fileChanges: ChatFileChange[];
}

export async function performSimulationPrompt(
  simulationClientData: SimulationPromptClientData,
  userPrompt: string,
  chatHistory: SimulationChatMessage[],
  anthropicAPIKey: string,
): Promise<SimulationPromptResult> {
  const { simulationData, repositoryContents, mouseData } = simulationClientData;

  const prompt: SimulationPrompt = {
    simulationData,
    repositoryContents,
    userPrompt,
    chatHistory,
    mouseData,
    anthropicAPIKey,
  };

  const simulationRval = await sendCommandDedicatedClient({
    method: "Recording.globalExperimentalCommand",
    params: {
      name: "simulationPrompt",
      params: prompt,
    },
  });

  return (simulationRval as { rval: SimulationPromptResult }).rval;
}
