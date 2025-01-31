// Core logic for using simulation data from a remote recording to enhance
// the AI developer prompt.

import type { Message } from 'ai';
import type { SimulationData } from './SimulationData';
import { SimulationDataVersion } from './SimulationData';
import { assert, ProtocolClient } from './ReplayProtocolClient';
import type { MouseData } from './Recording';

interface ChatState {
  client: ProtocolClient;
  chatId: string;
  addSimulationPromise?: Promise<{ recordingId: string | undefined }>;
}

let gChatState: ChatState | undefined;

export async function simulationStartChat(repositoryContents: string) {
  if (gChatState) {
    gChatState.client.close();
    gChatState = undefined;
  }

  const client = new ProtocolClient();
  await client.initialize();

  const { chatId } = await client.sendCommand({ method: "Nut.startChat", params: {} }) as { chatId: string };
  gChatState = { client, chatId };

  const repositoryContentsPacket = {
    kind: "repositoryContents",
    contents: repositoryContents,
  };

  gChatState.addSimulationPromise = client.sendCommand({
    method: "Nut.addSimulation",
    params: {
      chatId,
      version: SimulationDataVersion,
      simulationData: [repositoryContentsPacket],
      completeData: false,
      saveRecording: true,
    },
  }) as Promise<{ recordingId: string | undefined }>;
}

export async function simulationAddData(data: SimulationData) {
  assert(gChatState, "Chat not started");

  gChatState.client.sendCommand({
    method: "Nut.addSimulationData",
    params: { chatId: gChatState.chatId, simulationData: data },
  });
}

export async function getSimulationRecording(): Promise<string> {
  assert(gChatState, "Chat not started");

  gChatState.client.sendCommand({
    method: "Nut.finishSimulationData",
    params: { chatId: gChatState.chatId },
  });

  assert(gChatState.addSimulationPromise, "Add simulation promise not set");
  const { recordingId } = await gChatState.addSimulationPromise;
  assert(recordingId, "Recording ID not set");
  return recordingId;
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
  chatMessages: Message[],
  userMessage: string,
  mouseData: MouseData | undefined
): Promise<string> {
  assert(gChatState, "Chat not started");

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
  gChatState.client.listenForMessage("Nut.chatResponsePart", ({ message }: { message: ProtocolMessage }) => {
    console.log("ChatResponsePart", message);
    response += message.content;
  });

  try {
    const responseId = "<response-id>";
    await gChatState.client.sendCommand({
      method: "Nut.sendChatMessage",
      params: { chatId: gChatState.chatId, responseId, messages },
    });
  } finally {
    gChatState.client.close();
    gChatState = undefined;
  }

  return response;
}
