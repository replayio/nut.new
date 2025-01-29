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

    const recordingPromise = new Promise<string>((resolve) => {
      const removeListener = client.listenForMessage("Nut.recordingCreated", ({ recordingId }: { recordingId: string }) => {
        removeListener();
        resolve(recordingId);
      });
    });

    await client.sendCommand({
      method: "Nut.addSimulation",
      params: {
        chatId,
        version: SimulationDataVersion,
        simulationData: [repositoryContentsPacket, ...simulationData],
        completeData: true,
        saveRecording: true,
      },
    });

    return await recordingPromise;
  } finally {
    client.close();
  }
}

type ProtocolMessage = {
  role: "user" | "assistant" | "system";
  type: "text";
  contents: string;
};

async function buildProtocolMessages(chatMessages: Message[]): Promise<ProtocolMessage[]> {
  console.log("BuildChatMessages", chatMessages);
  throw new Error("NYI");
}

export async function getSimulationEnhancedPrompt(
  recordingId: string,
  chatMessages: Message[]
): Promise<string> {
  const client = new ProtocolClient();
  await client.initialize();
  try {
    const { chatId } = await client.sendCommand({ method: "Nut.startChat", params: {} }) as { chatId: string };

    await client.sendCommand({
      method: "Nut.addRecording",
      params: { chatId, recordingId },
    });

    const messages = await buildProtocolMessages(chatMessages);

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
