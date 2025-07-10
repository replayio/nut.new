/*
 * Core logic for running and managing remote chats.
 */

import type { SimulationData, SimulationPacket } from './SimulationData';
import { simulationDataVersion } from './SimulationData';
import { assert, generateRandomId, ProtocolClient } from './ReplayProtocolClient';
import type { Message } from '~/lib/persistence/message';
import { database } from '~/lib/persistence/chats';
import { chatStore } from '~/lib/stores/chat';
import { getSupabase } from '~/lib/supabase/client';
import { pingTelemetry } from '~/lib/hooks/pingTelemetry';
import { sendChatMessageMocked, usingMockChat } from './MockChat';
import { flushSimulationData } from '~/components/chat/ChatComponent/functions/flushSimulation';
import { workbenchStore } from '~/lib/stores/workbench';

// We report to telemetry if we start a message and don't get any response
// before this timeout.
const ChatResponseTimeoutMs = 20_000;

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

export enum ChatMode {
  BuildApp = 'BuildApp',
  Discovery = 'Discovery',
}

// Options specified when sending a chat message.
interface ChatMessageOptions {
  mode: ChatMode;
  messages: Message[];
  references: ChatReference[];
  callbacks: ChatMessageCallbacks;
  simulationData?: SimulationData;
}

// Manager for a single chat message. Each chat message is sent off and generates
// a stream of responses before finishing. For now we do not allow multiple chat
// messages to be running at the same time.
class ChatManager {
  // Empty if there is no active message.
  client: ProtocolClient | undefined;

  // Empty if there is no active message.
  chatIdPromise: Promise<string> | undefined;

  constructor() {}

  isRunning() {
    return !!this.client;
  }

  // Closes the remote connection and makes sure the backend chat has also shut down.
  // If the client disconnects otherwise the backend chat will continue running.
  async destroy() {
    if (this.chatIdPromise) {
      try {
        const chatId = await this.chatIdPromise;
        await this.client?.sendCommand({
          method: 'Nut.finishChat',
          params: { chatId },
          errorHandled: true,
        });
      } catch (e) {
        console.error('Error finishing chat', e);
      }
    }

    this.client?.close();
    this.client = undefined;
  }

  private async startChat() {
    assert(!this.client, 'Chat is running');
    this.client = new ProtocolClient();

    await this.client.initialize();

    const {
      data: { user },
    } = await getSupabase().auth.getUser();
    const userId = user?.id || null;

    if (userId) {
      await this.client.sendCommand({ method: 'Nut.setUserId', params: { userId } });
    }

    const { chatId } = (await this.client.sendCommand({ method: 'Nut.startChat', params: {} })) as { chatId: string };

    console.log('ChatStarted', new Date().toISOString(), chatId);

    return chatId;
  }

  async sendMessage(options: ChatMessageOptions) {
    this.chatIdPromise = this.startChat();

    const chatId = await this.chatIdPromise;
    assert(this.client, 'Expected chat client');

    if (options.simulationData) {
      this.client
        .sendCommand({
          method: 'Nut.addSimulation',
          params: {
            chatId,
            version: simulationDataVersion,
            simulationData: options.simulationData,
            completeData: true,
            saveRecording: true,
          },
        })
        .catch((e) => {
          // Simulation will error if for example the repository doesn't build.
          console.error('RegenerateChatError', e);
        });
    }

    const timeout = setTimeout(() => {
      pingTelemetry('ChatMessageTimeout', {});
    }, ChatResponseTimeoutMs);

    const responseId = `response-${generateRandomId()}`;

    const removeResponseListener = this.client.listenForMessage(
      'Nut.chatResponsePart',
      ({ responseId: eventResponseId, message }: { responseId: string; message: Message }) => {
        if (responseId == eventResponseId) {
          console.log('ChatResponse', chatId, message);
          clearTimeout(timeout);
          options.callbacks.onResponsePart(message);
        }
      },
    );

    const removeTitleListener = this.client.listenForMessage(
      'Nut.chatTitle',
      ({ responseId: eventResponseId, title }: { responseId: string; title: string }) => {
        if (responseId == eventResponseId) {
          console.log('ChatTitle', title);
          options.callbacks.onTitle(title);
        }
      },
    );

    const removeStatusListener = this.client.listenForMessage(
      'Nut.chatStatus',
      ({ responseId: eventResponseId, status }: { responseId: string; status: string }) => {
        if (responseId == eventResponseId) {
          console.log('ChatStatus', status);
          options.callbacks.onStatus(status);
        }
      },
    );

    console.log(
      'ChatSendMessage',
      new Date().toISOString(),
      chatId,
      JSON.stringify({ mode: options.mode, messages: options.messages, references: options.references }),
    );

    const id = chatStore.currentChat.get()?.id;
    assert(id, 'Expected chat ID');
    database.updateChatLastMessage(id, chatId, responseId);

    await this.client.sendCommand({
      method: 'Nut.sendChatMessage',
      params: {
        chatId,
        responseId,
        mode: options.mode,
        messages: options.messages,
        references: options.references,
      },
    });

    console.log('ChatMessageFinished', new Date().toISOString(), chatId);

    removeResponseListener();
    removeTitleListener();
    removeStatusListener();
  }
}

// Chat manager which is generating response messages for adding to the chat.
// When we send a message, the simulation we switch to this chat manager.
let gMessageChatManager: ChatManager | undefined;

let gLastSimulationChatMessages: Message[] | undefined;

export function getLastSimulationChatMessages(): Message[] | undefined {
  return gLastSimulationChatMessages;
}

let gLastSimulationChatReferences: ChatReference[] | undefined;

export function getLastSimulationChatReferences(): ChatReference[] | undefined {
  return gLastSimulationChatReferences;
}

export async function sendChatMessage(
  mode: ChatMode,
  messages: Message[],
  references: ChatReference[],
  callbacks: ChatMessageCallbacks,
) {
  if (usingMockChat()) {
    await sendChatMessageMocked(callbacks);
    return;
  }

  let simulationData: SimulationData | undefined;

  const repositoryId = workbenchStore.repositoryId.get();
  if (repositoryId) {
    simulationData = await flushSimulationData();
    if (simulationData) {
      const packet = createRepositoryIdPacket(repositoryId);
      simulationData.unshift(packet);
    }
  }

  if (gMessageChatManager) {
    gMessageChatManager.destroy();
  }

  gMessageChatManager = new ChatManager();

  gLastSimulationChatMessages = messages;
  gLastSimulationChatReferences = references;

  await gMessageChatManager.sendMessage({
    mode,
    messages,
    references,
    callbacks,
    simulationData,
  });
}

export function abortChatMessage() {
  if (gMessageChatManager) {
    gMessageChatManager.destroy();
    gMessageChatManager = undefined;
  }
}

export async function resumeChatMessage(chatId: string, chatResponseId: string, callbacks: ChatMessageCallbacks) {
  const client = new ProtocolClient();
  await client.initialize();

  try {
    const removeResponseListener = client.listenForMessage(
      'Nut.chatResponsePart',
      ({ message }: { message: Message }) => {
        callbacks.onResponsePart(message);
      },
    );

    const removeTitleListener = client.listenForMessage('Nut.chatTitle', ({ title }: { title: string }) => {
      callbacks.onTitle(title);
    });

    const removeStatusListener = client.listenForMessage('Nut.chatStatus', ({ status }: { status: string }) => {
      callbacks.onStatus(status);
    });

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
