// Core logic for prompting the AI developer with the repository state and simulation data.

// Currently the simulation prompt is sent from the server.

import { getIFrameSimulationData, type SimulationData, type MouseData } from './Recording';
import { sendCommandDedicatedClient } from './ReplayProtocolClient';

// Data supplied by the client for a simulation prompt, separate from the chat input.
export interface SimulationPromptClientData {
  simulationData: SimulationData;
  repositoryContents: string; // base64 encoded zip file
  mouseData?: MouseData;
}

interface FileChange {
  path: string;
  content: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Params format for the simulationPrompt command.
interface SimulationPrompt {
  simulationData: SimulationData;
  repositoryContents: string; // base64 encoded zip file
  userPrompt: string;
  chatHistory: ChatMessage[];
  mouseData?: MouseData;
  anthropicAPIKey: string;
}

// Result format for the simulationPrompt command.
interface SimulationPromptResult {
  message: string;
  fileChanges: FileChange[];
}

export async function performSimulationPrompt(simulationClientData: SimulationPromptClientData, userPrompt: string, chatHistory: ChatMessage[], anthropicAPIKey: string): Promise<SimulationPromptResult> {
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
