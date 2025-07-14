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

// Options specified when sending a chat message.
interface ChatMessageOptions {
  mode: ChatMode;
  messages: Message[];
  references: ChatReference[];
  callbacks: ChatMessageCallbacks;
  simulationData?: SimulationData;
  chatMode?: ChatMode;
}

export enum ChatMode {
  // Default mode, builds or extends the app from the available user input.
  //
  // If the user is reporting a bug then will use the provided simulation data
  // to work on a fix.
  //
  // Otherwise:
  //
  // 1. If there is no AppSummary message provided then a new one will
  //    be created from the user input. If there is an AppSummary it may be revised.
  //
  // 2. When building a new app a prebuilt Arboretum app will be selected as
  //    a starting point if possible.
  //
  // 3. Will then work on developing the features one by one until tests pass and it
  //    can start on the next feature.
  BuildApp = 'BuildApp',

  // Build an abstracted application for adding to the Arboretum.
  BuildAppArboretum = 'BuildAppArboretum',

  // Build a new application without using the Arboretum.
  BuildAppFromScratch = 'BuildAppFromScratch',

  // Analyze any provided recording.
  AnalyzeRecording = 'AnalyzeRecording',

  Discovery = 'Discovery',

  // Follow the bug fixing steps of the BuildApp workflow.
  FixBug = 'FixBug',

  // Follows step 1 of the BuildApp workflow.
  PlanApp = 'PlanApp',

  // Follows step 2 of the BuildApp workflow.
  SearchArboretum = 'SearchArboretum',

  // Performs steps 1 and 2 of the BuildApp workflow in sequence.
  PlanAppSearchArboretum = 'PlanAppSearchArboretum',

  // Follows step 3 of the BuildApp workflow.
  DevelopApp = 'DevelopApp',
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
  chatMode?: ChatMode,
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
    chatMode,
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
