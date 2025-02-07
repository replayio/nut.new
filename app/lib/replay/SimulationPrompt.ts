// Core logic for using simulation data from a remote recording to enhance
// the AI developer prompt.

import type { Message } from 'ai';
import type { SimulationData, SimulationPacket } from './SimulationData';
import { SimulationDataVersion } from './SimulationData';
import { assert, ProtocolClient } from './ReplayProtocolClient';
import type { MouseData } from './Recording';
import { getLastFileWriteTime } from '../runtime/action-runner';

interface ChatState {
  client: ProtocolClient;
  chatId: string;
  simulationFinished?: boolean;
}

let gChatState: ChatState | undefined;

const gAllSimulationData: SimulationData = [];

export async function simulationStartChat(repositoryContents: string) {
  if (gChatState) {
    gChatState.client.close();
    gChatState = undefined;
  }

  const client = new ProtocolClient();
  await client.initialize();

  await client.sendCommand({ method: "Recording.globalExperimentalCommand", params: { name: "enableOperatorPods" } });

  const { chatId } = await client.sendCommand({ method: "Nut.startChat", params: {} }) as { chatId: string };
  gChatState = { client, chatId };

  const repositoryContentsPacket: SimulationPacket = {
    kind: "repositoryContents",
    contents: repositoryContents,
    time: getLastFileWriteTime(),
  };
  gAllSimulationData.push(repositoryContentsPacket);

  await client.sendCommand({
    method: "Nut.addSimulation",
    params: {
      chatId,
      version: SimulationDataVersion,
      simulationData: [repositoryContentsPacket],
      completeData: false,
      saveRecording: true,
    },
  });
}

export async function simulationAddData(data: SimulationData) {
  assert(gChatState, "Chat not started");

  gChatState.client.sendCommand({
    method: "Nut.addSimulationData",
    params: { chatId: gChatState.chatId, simulationData: data },
  });

  gAllSimulationData.push(...data);
}

export async function getSimulationRecording(): Promise<string> {
  assert(gChatState, "Chat not started");

  console.log("SimulationData", new Date().toISOString(), JSON.stringify(gAllSimulationData));

  gChatState.simulationFinished = true;

  const { recordingId } = await gChatState.client.sendCommand({
    method: "Nut.finishSimulationData",
    params: { chatId: gChatState.chatId },
  }) as { recordingId: string | undefined };

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
  assert(gChatState.simulationFinished, "Simulation not finished");

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
