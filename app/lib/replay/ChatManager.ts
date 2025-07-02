/*
 * Core logic for running and managing remote chats.
 */

import type { SimulationData, SimulationPacket } from './SimulationData';
import { simulationDataVersion } from './SimulationData';
import { assert, generateRandomId, ProtocolClient } from './ReplayProtocolClient';
import { updateDevelopmentServer } from './DevelopmentServer';
import type { Message } from '~/lib/persistence/message';
import { database } from '~/lib/persistence/chats';
import { chatStore } from '~/lib/stores/chat';
import { debounce } from '~/utils/debounce';
import { getSupabase } from '~/lib/supabase/client';
import { pingTelemetry } from '~/lib/hooks/pingTelemetry';
import { sendChatMessageMocked, usingMockChat } from './MockChat';
import { APP_SUMMARY_CATEGORY, ARBORETUM_APP_CATEGORY } from '../persistence/messageAppSummary';
import { setInitialAppSummary, setPrebuiltAppSummary } from '../stores/appSummary';
import { finishChat, isFirstChatMessageStore, setFirstChatMessage } from '~/lib/stores/chatProgress';
import { useRef } from 'react';

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
  BuildApp = "BuildApp",

  // Build an abstracted application for adding to the Arboretum.
  BuildAppArboretum = "BuildAppArboretum",

  // Build a new application without using the Arboretum.
  BuildAppFromScratch = "BuildAppFromScratch",

  // Analyze any provided recording.
  AnalyzeRecording = "AnalyzeRecording",

  // Follow the bug fixing steps of the BuildApp workflow.
  FixBug = "FixBug",

  // Follows step 1 of the BuildApp workflow.
  PlanApp = "PlanApp",

  // Follows step 2 of the BuildApp workflow.
  SearchArboretum = "SearchArboretum",

  // Performs steps 1 and 2 of the BuildApp workflow in sequence.
  PlanAppSearchArboretum = "PlanAppSearchArboretum",

  // Follows step 3 of the BuildApp workflow.
  DevelopApp = "DevelopApp",
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

  // Whether there were any errors in commands related to the simulation.
  private hadSimulationError = false;

  constructor() {
    this.chatIdPromise = this.resetChat();
  }

  isValid() {
    return !!this.client;
  }

  private async resetChat() {
    this.client?.close();
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

  // Closes the remote connection and makes sure the backend chat has also shut down.
  // If the client disconnects otherwise the backend chat will continue running.
  async destroy() {
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

    this.client?.close();
    this.client = undefined;
  }

  async setRepositoryId(repositoryId: string) {
    assert(this.client, 'Chat has been destroyed');
    this.repositoryId = repositoryId;

    const packet = createRepositoryIdPacket(repositoryId);

    const chatId = await this.chatIdPromise;
    try {
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
    } catch (e) {
      console.log('Error adding simulation', e);
      this.hadSimulationError = true;
    }
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

    try {
      await this.client.sendCommand({
        method: 'Nut.addSimulationData',
        params: { chatId, simulationData: data },
        errorHandled: true,
      });
    } catch (e) {
      console.log('Error adding simulation data', e);
      this.hadSimulationError = true;
    }
  }

  async finishSimulationData() {
    assert(this.client, 'Chat has been destroyed');
    assert(!this.simulationFinished, 'Simulation has been finished');

    this.simulationFinished = true;

    const chatId = await this.chatIdPromise;
    try {
      await this.client.sendCommand({
        method: 'Nut.finishSimulationData',
        params: { chatId },
        errorHandled: true,
      });
    } catch (e) {
      console.log('Error finishing simulation data', e);
      this.hadSimulationError = true;
    }
  }

  // If we encounter a backend error during simulation the problem is likely that
  // the underlying resources running the simulation were destroyed. Start a new
  // chat and add all the simulation data again, which doesn't let us stream the
  // data up but will work at least.
  async regenerateChat() {
    assert(this.client, 'Chat has been destroyed');

    this.chatIdPromise = this.resetChat();
    const chatId = await this.chatIdPromise;

    if (this.repositoryId) {
      const packet = createRepositoryIdPacket(this.repositoryId);

      try {
        await this.client.sendCommand({
          method: 'Nut.addSimulation',
          params: {
            chatId,
            version: simulationDataVersion,
            simulationData: [packet, ...this.pageData],
            completeData: true,
            saveRecording: true,
          },
        });
      } catch (e) {
        // Simulation will error if for example the repository doesn't build.
        console.error('RegenerateChatError', e);
      }
    }
  }

  async sendChatMessage(messages: Message[], references: ChatReference[], callbacks: ChatMessageCallbacks, mode: ChatMode) {
    assert(this.client, 'Chat has been destroyed');

    if (this.client.closed || this.hadSimulationError) {
      this.client.close();
      this.client = new ProtocolClient();
      this.hadSimulationError = false;
      await this.regenerateChat();
    }

    const timeout = setTimeout(() => {
      pingTelemetry('ChatMessageTimeout', { hasRepository: !!this.repositoryId });
    }, ChatResponseTimeoutMs);

    const responseId = `response-${generateRandomId()}`;

    const removeResponseListener = this.client.listenForMessage(
      'Nut.chatResponsePart',
      ({ responseId: eventResponseId, message }: { responseId: string; message: Message }) => {
        if (responseId == eventResponseId) {
          console.log('ChatResponse', chatId, message);
          clearTimeout(timeout);
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
      params: { chatId, responseId, mode, messages, references },
    });

    console.log('ChatMessageFinished', new Date().toISOString(), chatId);

    removeResponseListener();
    removeTitleListener();
    removeStatusListener();
    
    // Check if this is the first message and finish accordingly
    const isFirst = isFirstChatMessageStore.get();
    if (isFirst) {
      setFirstChatMessage(false); // Mark that first message is done
    }
    finishChat();
  }
}

// At most two chat managers can be running at any one time.
//
// After the user starts the app and interacts with it, we create a simulation
// chat manager to keep track of the simulation data and stream it to the backend.
//
// After the user sends a message, any simulation chat manager is used for that
// and becomes the message chat manager. If there is no simulation chat manager
// we create a new one.

// Chat manager associated with the latest repository and which we are sending
// simulation data to. When we send a message it will be to this manager.
let gSimulationChatManager: ChatManager | undefined;

// Chat manager which is generating response messages for adding to the chat.
// When we send a message, the simulation we switch to this chat manager.
let gMessageChatManager: ChatManager | undefined;

// Update the simulation chat manager to the specified repository and page data.
function startSimulation(repositoryId: string | undefined, pageData: SimulationData) {
  // Clear any existing simulation chat manager.
  if (gSimulationChatManager) {
    gSimulationChatManager.destroy();
  }

  // Create a new simulation chat manager.
  gSimulationChatManager = new ChatManager();

  if (repositoryId) {
    gSimulationChatManager.setRepositoryId(repositoryId);
  }

  if (pageData.length) {
    gSimulationChatManager.addPageData(pageData);
  }
}

/*
 * Called when the repository has changed. We'll update the simulation chat and
 * the remote development server. The message chat manager is unaffected and
 * can perform more repository updates.
 */
export const simulationRepositoryUpdated = debounce((repositoryId: string | undefined) => {
  startSimulation(repositoryId, []);
  updateDevelopmentServer(repositoryId);
}, 500);

/*
 * Called when the page gathering interaction data has been reloaded. We'll
 * start a new chat with the same repository contents as any existing chat.
 */
export function simulationReloaded() {
  assert(gSimulationChatManager, 'Expected to have an active simulation chat');

  const repositoryId = gSimulationChatManager.repositoryId;
  assert(repositoryId, 'Expected active simulation chat to have repository ID');

  startSimulation(repositoryId, []);
}

export function simulationAddData(data: SimulationData) {
  assert(gSimulationChatManager, 'Expected to have an active simulation chat');
  gSimulationChatManager.addPageData(data);
}

let gLastUserSimulationData: SimulationData | undefined;

export function simulationFinishData() {
  if (gSimulationChatManager) {
    gSimulationChatManager.finishSimulationData();
    gLastUserSimulationData = [...gSimulationChatManager.pageData];
  }
}

export function getLastUserSimulationData(): SimulationData | undefined {
  return gLastUserSimulationData;
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
  mode: ChatMode
) {
  if (usingMockChat()) {
    await sendChatMessageMocked(callbacks);
    return;
  }

  if (gMessageChatManager) {
    gMessageChatManager.destroy();
  }

  gMessageChatManager = gSimulationChatManager ?? new ChatManager();
  gSimulationChatManager = undefined;

  startSimulation(gMessageChatManager.repositoryId, gMessageChatManager.pageData);

  gLastSimulationChatMessages = messages;
  gLastSimulationChatReferences = references;

  await gMessageChatManager.sendChatMessage(messages, references, callbacks, mode);
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
