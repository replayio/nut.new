// Core logic for using simulation data from a remote recording to enhance
// the AI developer prompt.

import type { Message } from 'ai';
import type { SimulationData, SimulationPacket } from './SimulationData';
import { SimulationDataVersion } from './SimulationData';
import { assert, ProtocolClient } from './ReplayProtocolClient';
import type { MouseData } from './Recording';

function createRepositoryContentsPacket(contents: string): SimulationPacket {
  return {
    kind: "repositoryContents",
    contents,
    time: new Date().toISOString(),
  };
}

export type ProtocolMessage = {
  role: "user" | "assistant" | "system";
  type: "text";
  content: string;
};

class ChatManager {
  // Empty if this chat has been destroyed.
  client: ProtocolClient | undefined;

  // Resolves when the chat has started.
  chatIdPromise: Promise<string>;

  // Resolves when the recording has been created.
  recordingIdPromise: Promise<string> | undefined;

  // Whether all simulation data has been sent.
  simulationFinished?: boolean;

  // Any repository contents we sent up for this chat.
  repositoryContents?: string;

  // Simulation data for the page itself and any user interactions.
  pageData: SimulationData = [];

  constructor() {
    this.client = new ProtocolClient();
    this.chatIdPromise = (async () => {
      assert(this.client, "Chat has been destroyed");

      await this.client.initialize();

      const { chatId } = (await this.client.sendCommand({ method: "Nut.startChat", params: {} })) as { chatId: string };

      console.log("ChatStarted", new Date().toISOString(), chatId);

      return chatId;
    })();
  }

  destroy() {
    this.client?.close();
    this.client = undefined;
  }

  async setRepositoryContents(contents: string) {
    assert(this.client, "Chat has been destroyed");
    this.repositoryContents = contents;

    const packet = createRepositoryContentsPacket(contents);

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: "Nut.addSimulation",
      params: {
        chatId,
        version: SimulationDataVersion,
        simulationData: [packet],
        completeData: false,
        saveRecording: true,
      },
    });
  }

  async addPageData(data: SimulationData) {
    assert(this.client, "Chat has been destroyed");
    assert(this.repositoryContents, "Expected repository contents");

    this.pageData.push(...data);

    // If page data comes in while we are waiting for the chat to finish
    // we remember it but don't update the existing chat.
    if (this.simulationFinished) {
      return;
    }

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: "Nut.addSimulationData",
      params: { chatId, simulationData: data },
    });
  }

  finishSimulationData(): SimulationData {
    assert(this.client, "Chat has been destroyed");
    assert(!this.simulationFinished, "Simulation has been finished");
    assert(this.repositoryContents, "Expected repository contents");

    this.recordingIdPromise = (async () => {
      assert(this.client, "Chat has been destroyed");
  
      const chatId = await this.chatIdPromise;
      const { recordingId } = await this.client.sendCommand({
        method: "Nut.finishSimulationData",
        params: { chatId },
      }) as { recordingId: string | undefined };

      assert(recordingId, "Recording ID not set");
      return recordingId;
    })();  

    const allData = [createRepositoryContentsPacket(this.repositoryContents), ...this.pageData];
    this.simulationFinished = true;
    return allData;
  }

  async sendChatMessage(messages: ProtocolMessage[]) {
    assert(this.client, "Chat has been destroyed");

    let response: string = "";
    this.client.listenForMessage("Nut.chatResponsePart", ({ message }: { message: ProtocolMessage }) => {
      console.log("ChatResponsePart", message);
      response += message.content;
    });

    const responseId = "<response-id>";
    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: "Nut.sendChatMessage",
      params: { chatId, responseId, messages },
    });

    return response;
  }
}

// There is only one chat active at a time.
let gChatManager: ChatManager | undefined;

function startChat(repositoryContents: string, pageData: SimulationData) {
  if (gChatManager) {
    gChatManager.destroy();
  }
  gChatManager = new ChatManager();

  gChatManager.setRepositoryContents(repositoryContents);
  if (pageData.length) {
    gChatManager.addPageData(pageData);
  }
}

// Called when the repository contents have changed. We'll start a new chat
// with the same interaction data as any existing chat.
export async function simulationRepositoryUpdated(repositoryContents: string) {
  startChat(repositoryContents, gChatManager?.pageData ?? []);
}

// Called when the page gathering interaction data has been reloaded. We'll
// start a new chat with the same repository contents as any existing chat.
export async function simulationReloaded() {
  assert(gChatManager, "Expected to have an active chat");

  const repositoryContents = gChatManager.repositoryContents;
  assert(repositoryContents, "Expected active chat to have repository contents");

  startChat(repositoryContents, []);
}

export async function simulationAddData(data: SimulationData) {
  assert(gChatManager, "Expected to have an active chat");
  gChatManager.addPageData(data);
}

let gLastUserSimulationData: SimulationData | undefined;

export function getLastUserSimulationData(): SimulationData | undefined {
  return gLastUserSimulationData;
}

export async function getSimulationRecording(): Promise<string> {
  assert(gChatManager, "Expected to have an active chat");

  const simulationData = gChatManager.finishSimulationData();

  // The repository contents are part of the problem and excluded from the simulation data
  // reported for solutions.
  gLastUserSimulationData = simulationData.filter(packet => packet.kind != "repositoryContents");

  console.log("SimulationData", new Date().toISOString(), JSON.stringify(simulationData));

  assert(gChatManager.recordingIdPromise, "Expected recording promise");
  return gChatManager.recordingIdPromise;
}

let gLastSimulationChatMessages: ProtocolMessage[] | undefined;

export function getLastSimulationChatMessages(): ProtocolMessage[] | undefined {
  return gLastSimulationChatMessages;
}

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
  assert(gChatManager, "Chat not started");
  assert(gChatManager.simulationFinished, "Simulation not finished");

  let system = SystemPrompt;
  if (mouseData) {
    system += `The user pointed to an element on the page <element selector=${JSON.stringify(mouseData.selector)} height=${mouseData.height} width=${mouseData.width} x=${mouseData.x} y=${mouseData.y} />`;
  }

  const messages: ProtocolMessage[] = [
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

  gLastSimulationChatMessages = messages;

  console.log("ChatSendMessage", new Date().toISOString(), JSON.stringify(messages));

  return gChatManager.sendChatMessage(messages);
}
