// Core logic for using simulation data from a remote recording to enhance
// the AI developer prompt.

import type { Message } from 'ai';
import type { SimulationData } from './SimulationData';
import { SimulationDataVersion } from './SimulationData';
import { assert, ProtocolClient } from './ReplayProtocolClient';
import type { MouseData } from './Recording';

export async function getSimulationRecording(
  interactionData: SimulationData,
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

    const simulationData = [repositoryContentsPacket, ...interactionData];

    console.log("SimulationData", JSON.stringify(simulationData));

    const { recordingId } = await client.sendCommand({
      method: "Nut.addSimulation",
      params: {
        chatId,
        version: SimulationDataVersion,
        simulationData,
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
  content: string;
};

const SystemPrompt = `
The following user message describes a bug or other problem on the page which needs to be fixed.
You must respond with a useful explanation that will help the user understand the source of the problem.
Do not describe the specific fix needed.
`;

export async function getSimulationEnhancedPrompt(
  recordingId: string,
  chatMessages: Message[],
  userMessage: string,
  mouseData: MouseData | undefined
): Promise<string> {
  const client = new ProtocolClient();
  await client.initialize();
  try {
    const { chatId } = await client.sendCommand({ method: "Nut.startChat", params: {} }) as { chatId: string };

    await client.sendCommand({
      method: "Nut.addRecording",
      params: { chatId, recordingId },
    });

    let system = SystemPrompt;
    if (mouseData) {
      system += `The user pointed to an element on the page <element selector=${JSON.stringify(mouseData.selector)} height=${mouseData.height} width=${mouseData.width} x=${mouseData.x} y=${mouseData.y} />`;
    }

    const messages = [
      {
        role: "system",
        type: "text",
        content: system,
      },
      {
        role: "user",
        type: "text",
        content: userMessage,
      },
    ];

    console.log("ChatSendMessage", messages);

    let response: string = "";
    const removeListener = client.listenForMessage("Nut.chatResponsePart", ({ message }: { message: ProtocolMessage }) => {
      console.log("ChatResponsePart", message);
      response += message.content;
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
