// Core logic for using simulation data from a remote recording to enhance
// the AI developer prompt.

import type { Message } from 'ai';
import type { SimulationData } from './SimulationData';
import { SimulationDataVersion } from './SimulationData';
import { assert, ProtocolClient } from './ReplayProtocolClient';

export async function getSimulationRecording(
  simulationData: SimulationData,
  repositoryContents: string
): Promise<string> {
  const client = new ProtocolClient();
  await client.initialize();
  try {
    const { chatId } = await client.sendCommand({ method: "Nut.startChat", params: {} }) as { chatId: string };

    const repositoryContentsPacket = {
      kind: "repositoryContents",
      contents: repositoryContents,
    };

    const { recordingId } = await client.sendCommand({
      method: "Nut.addSimulation",
      params: {
        chatId,
        version: SimulationDataVersion,
        simulationData: [repositoryContentsPacket, ...simulationData],
        completeData: true,
        saveRecording: true,
      },
    }) as { recordingId: string | undefined };

    if (!recordingId) {
      throw new Error("Expected recording ID in result");
    }

    return recordingId;
  } finally {
    client.close();
  }
}

type ProtocolMessage = {
  role: "user" | "assistant" | "system";
  type: "text";
  contents: string;
};

const SystemPrompt = `
The following user message describes a bug or other problem on the page which needs to be fixed.
You must respond with a useful explanation that will help the user understand the source of the problem.
Do not describe the specific fix needed.
`;

export async function getSimulationEnhancedPrompt(
  recordingId: string,
  chatMessages: Message[],
  userMessage: string
): Promise<string> {
  const client = new ProtocolClient();
  await client.initialize();
  try {
    const { chatId } = await client.sendCommand({ method: "Nut.startChat", params: {} }) as { chatId: string };

    await client.sendCommand({
      method: "Nut.addRecording",
      params: { chatId, recordingId },
    });

    const messages = [
      {
        role: "system",
        type: "text",
        content: SystemPrompt,
      },
      {
        role: "user",
        type: "text",
        content: userMessage,
      },
    ];

    let response: string = "";
    const removeListener = client.listenForMessage("Nut.chatResponsePart", ({ message }: { message: ProtocolMessage }) => {
      response += message.contents;
    });

    const responseId = "<response-id>";
    await client.sendCommand({
      method: "Nut.sendChatMessage",
      params: { chatId, responseId, messages },
    });

    removeListener();
    return response;
  } finally {
    client.close();
  }
}
