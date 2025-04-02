/*
 * Core logic for using simulation data from a remote recording to enhance
 * the AI developer prompt.
 */

import type { SimulationData, SimulationPacket } from './SimulationData';
import { simulationDataVersion } from './SimulationData';
import { assert, generateRandomId, ProtocolClient } from './ReplayProtocolClient';
import { updateDevelopmentServer } from './DevelopmentServer';
import type { Message } from '~/lib/persistence/message';
import { database } from '~/lib/persistence/db';
import { chatStore } from '~/lib/stores/chat';
import { debounce } from '~/utils/debounce';

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

export interface ChatMessageCallbacks {
  onResponsePart: (message: Message) => void;
  onTitle: (title: string) => void;
  onStatus: (status: string) => void;
}

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

  // State to ensure that the chat manager is not destroyed until all messages finish.
  private _pendingMessages = 0;
  private _mustDestroyAfterChatFinishes = false;

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

  private _destroy() {
    this.client?.close();
    this.client = undefined;
  }

  destroyAfterChatFinishes() {
    if (this._pendingMessages == 0) {
      this._destroy();
    } else {
      this._mustDestroyAfterChatFinishes = true;
    }
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

    console.log('ChatAddPageData', new Date().toISOString(), chatId, data.length);

    await this.client.sendCommand({
      method: 'Nut.addSimulationData',
      params: { chatId, simulationData: data },
    });
  }

  async finishSimulationData() {
    assert(this.client, 'Chat has been destroyed');
    assert(!this.simulationFinished, 'Simulation has been finished');

    this.simulationFinished = true;

    const chatId = await this.chatIdPromise;
    await this.client.sendCommand({
      method: 'Nut.finishSimulationData',
      params: { chatId },
    });
  }

  async sendChatMessage(messages: Message[], references: ChatReference[], callbacks: ChatMessageCallbacks) {
    assert(this.client, 'Chat has been destroyed');

    this._pendingMessages++;

    const responseId = `response-${generateRandomId()}`;

    const removeResponseListener = this.client.listenForMessage(
      'Nut.chatResponsePart',
      ({ responseId: eventResponseId, message }: { responseId: string; message: Message }) => {
        if (responseId == eventResponseId) {
          console.log('ChatResponse', chatId, message);
          callbacks.onResponsePart(message);
        }
      },
    );

    const removeTitleListener = this.client.listenForMessage(
      'Nut.chatTitle',
      ({ responseId: eventResponseId, title }: { responseId: string; title: string }) => {
        if (responseId == eventResponseId) {
          console.log('ChatTitle', title);
          callbacks.onTitle(title);
        }
      },
    );

    const removeStatusListener = this.client.listenForMessage(
      'Nut.chatStatus',
      ({ responseId: eventResponseId, status }: { responseId: string; status: string }) => {
        if (responseId == eventResponseId) {
          console.log('ChatStatus', status);
          callbacks.onStatus(status);
        }
      },
    );

    const chatId = await this.chatIdPromise;

    console.log('ChatSendMessage', new Date().toISOString(), chatId, JSON.stringify({ messages, references }));

    const id = chatStore.currentChat.get()?.id;
    assert(id, 'Expected chat ID');
    database.updateChatLastMessage(id, chatId, responseId);

    await this.client.sendCommand({
      method: 'Nut.sendChatMessage',
      params: { chatId, responseId, messages, references },
    });

    console.log('ChatMessageFinished', new Date().toISOString(), chatId);

    removeResponseListener();
    removeTitleListener();
    removeStatusListener();

    if (--this._pendingMessages == 0 && this._mustDestroyAfterChatFinishes) {
      this._destroy();
    }
  }
}

// There is only one chat active at a time.
let gChatManager: ChatManager | undefined;

function startChat(repositoryId: string | undefined, pageData: SimulationData) {
  /*
   * Any existing chat manager won't be used anymore for new messages, but it will
   * not close until its messages actually finish and any future repository updates
   * occur.
   */
  if (gChatManager) {
    gChatManager.destroyAfterChatFinishes();
  }

  gChatManager = new ChatManager();

  if (repositoryId) {
    gChatManager.setRepositoryId(repositoryId);
  }

  if (pageData.length) {
    gChatManager.addPageData(pageData);
  }
}

/*
 * Called when the repository has changed. We'll start a new chat
 * and update the remote development server.
 */
export const simulationRepositoryUpdated = debounce(
  (repositoryId: string) => {
    startChat(repositoryId, []);
    updateDevelopmentServer(repositoryId);
  },
  500,
);

/*
 * Called when the page gathering interaction data has been reloaded. We'll
 * start a new chat with the same repository contents as any existing chat.
 */
export function simulationReloaded() {
  assert(gChatManager, 'Expected to have an active chat');

  const repositoryId = gChatManager.repositoryId;
  assert(repositoryId, 'Expected active chat to have repository ID');

  startChat(repositoryId, []);
}

/*
 * Called when the current message has finished with no repository change.
 * We'll start a new chat with the same simulation data as the previous chat.
 */
export function simulationReset() {
  assert(gChatManager, 'Expected to have an active chat');
  startChat(gChatManager.repositoryId, gChatManager.pageData);
}

export function simulationAddData(data: SimulationData) {
  assert(gChatManager, 'Expected to have an active chat');
  gChatManager.addPageData(data);
}

let gLastUserSimulationData: SimulationData | undefined;

export function simulationFinishData() {
  if (gChatManager) {
    gChatManager.finishSimulationData();
    gLastUserSimulationData = [...gChatManager.pageData];
  }
}

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

let gLastSimulationChatReferences: ChatReference[] | undefined;

export function getLastSimulationChatReferences(): ChatReference[] | undefined {
  return gLastSimulationChatReferences;
}

export async function sendChatMessage(
  messages: Message[],
  references: ChatReference[],
  callbacks: ChatMessageCallbacks,
) {
  if (!gChatManager) {
    gChatManager = new ChatManager();
  }

  gLastSimulationChatMessages = messages;
  gLastSimulationChatReferences = references;

  await gChatManager.sendChatMessage(messages, references, callbacks);
}

export async function resumeChatMessage(
  chatId: string,
  chatResponseId: string,
  callbacks: ChatMessageCallbacks,
) {
  const client = new ProtocolClient();
  await client.initialize();

  try {
    const removeResponseListener = client.listenForMessage(
      'Nut.chatResponsePart',
      ({ message }: { message: Message }) => {
        callbacks.onResponsePart(message);
      },
    );

    const removeTitleListener = client.listenForMessage(
      'Nut.chatTitle',
      ({ title }: { title: string }) => {
        callbacks.onTitle(title);
      },
    );

    const removeStatusListener = client.listenForMessage(
      'Nut.chatStatus',
      ({ status }: { status: string }) => {
        callbacks.onStatus(status);
      },
    );

    await client.sendCommand({
      method: 'Nut.resumeChatMessage',
      params: { chatId, responseId: chatResponseId },
    });

    removeResponseListener();
    removeTitleListener();
    removeStatusListener();
  } finally {
    client.close();
  }
}
