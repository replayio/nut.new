/*
 * Core logic for using simulation data from a remote recording to enhance
 * the AI developer prompt.
 */

import type { SimulationData, SimulationPacket } from './SimulationData';
import { simulationDataVersion } from './SimulationData';
import { assert, generateRandomId, ProtocolClient } from './ReplayProtocolClient';
import { updateDevelopmentServer } from './DevelopmentServer';
import type { Message } from '~/lib/persistence/useChatHistory';

function createRepositoryIdPacket(repositoryId: string): SimulationPacket {
  return {
    kind: 'repositoryId',
    repositoryId,
    time: new Date().toISOString(),
  };
}

interface ChatReferenceElement {
  kind: 'element';
  selector: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export type ChatReference = ChatReferenceElement;

type ChatResponsePartCallback = (message: Message) => void;

class ChatManager {
  // Empty if this chat has been destroyed.
  client: ProtocolClient | undefined;

  // Resolves when the chat has started.
  chatIdPromise: Promise<string>;

  // Whether all simulation data has been sent.
  simulationFinished?: boolean;

  // Any repository ID we specified for this chat.
  repositoryId?: string;

  // Simulation data for the page itself and any user interactions.
  pageData: SimulationData = [];

  constructor() {
    this.client = new ProtocolClient();
    this.chatIdPromise = (async () => {
      assert(this.client, 'Chat has been destroyed');

      await this.client.initialize();

      const { chatId } = (await this.client.sendCommand({ method: 'Nut.startChat', params: {} })) as { chatId: string };

      console.log('ChatStarted', new Date().toISOString(), chatId);

      return chatId;
    })();
  }

  isValid() {
    return !!this.client;
  }

  destroy() {
    this.client?.close();
    this.client = undefined;
  }

  async setRepositoryId(repositoryId: string) {
    assert(this.client, 'Chat has been destroyed');
    this.repositoryId = repositoryId;

    const packet = createRepositoryIdPacket(repositoryId);

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: 'Nut.addSimulation',
      params: {
        chatId,
        version: simulationDataVersion,
        simulationData: [packet],
        completeData: false,
        saveRecording: true,
      },
    });
  }

  async addPageData(data: SimulationData) {
    assert(this.client, 'Chat has been destroyed');
    assert(this.repositoryId, 'Expected repository ID');

    this.pageData.push(...data);

    /*
     * If page data comes in while we are waiting for the chat to finish
     * we remember it but don't update the existing chat.
     */
    if (this.simulationFinished) {
      return;
    }

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: 'Nut.addSimulationData',
      params: { chatId, simulationData: data },
    });
  }

  finishSimulationData(): SimulationData {
    assert(this.client, 'Chat has been destroyed');
    assert(!this.simulationFinished, 'Simulation has been finished');
    assert(this.repositoryId, 'Expected repository ID');

    const allData = [createRepositoryIdPacket(this.repositoryId), ...this.pageData];
    this.simulationFinished = true;

    return allData;
  }

  async sendChatMessage(messages: Message[], references: ChatReference[], onResponsePart: ChatResponsePartCallback) {
    assert(this.client, 'Chat has been destroyed');

    const responseId = `response-${generateRandomId()}`;

    const removeResponseListener = this.client.listenForMessage(
      'Nut.chatResponsePart',
      ({ responseId: eventResponseId, message }: { responseId: string; message: Message }) => {
        if (responseId == eventResponseId) {
          console.log('ChatResponse', chatId, message);
          onResponsePart(message);
        }
      },
    );

    const chatId = await this.chatIdPromise;

    console.log(
      'ChatSendMessage',
      new Date().toISOString(),
      chatId,
      JSON.stringify({ messages }),
    );

    await this.client.sendCommand({
      method: 'Nut.sendChatMessage',
      params: { chatId, responseId, messages, references },
    });

    removeResponseListener();
  }
}

// There is only one chat active at a time.
let gChatManager: ChatManager | undefined;

function startChat(repositoryId: string, pageData: SimulationData) {
  if (gChatManager) {
    gChatManager.destroy();
  }

  gChatManager = new ChatManager();

  gChatManager.setRepositoryId(repositoryId);

  if (pageData.length) {
    gChatManager.addPageData(pageData);
  }
}

/*
 * Called when the repository has changed. We'll start a new chat
 * and update the remote development server.
 */
export function simulationRepositoryUpdated(repositoryId: string) {
  startChat(repositoryId, []);
  updateDevelopmentServer(repositoryId);
}

/*
 * Called when the page gathering interaction data has been reloaded. We'll
 * start a new chat with the same repository contents as any existing chat.
 */
export async function simulationReloaded() {
  assert(gChatManager, 'Expected to have an active chat');

  const repositoryId = gChatManager.repositoryId;
  assert(repositoryId, 'Expected active chat to have repository ID');

  startChat(repositoryId, []);
}

export function simulationAddData(data: SimulationData) {
  assert(gChatManager, 'Expected to have an active chat');
  gChatManager.addPageData(data);
}

export function simulationFinishData() {
  assert(gChatManager, 'Expected to have an active chat');
  gChatManager.finishSimulationData();
}

let gLastUserSimulationData: SimulationData | undefined;

export function getLastUserSimulationData(): SimulationData | undefined {
  return gLastUserSimulationData;
}

export function isSimulatingOrHasFinished(): boolean {
  return gChatManager?.isValid() ?? false;
}

let gLastSimulationChatMessages: Message[] | undefined;

export function getLastSimulationChatMessages(): Message[] | undefined {
  return gLastSimulationChatMessages;
}

export async function sendChatMessage(
  messages: Message[],
  references: ChatReference[],
  onResponsePart: ChatResponsePartCallback,
) {
  if (!gChatManager) {
    gChatManager = new ChatManager();
  }

  await gChatManager.sendChatMessage(messages, references, onResponsePart);
}
