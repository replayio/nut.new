/*
 * Core logic for running and managing remote chats.
 */

import type { SimulationData, SimulationPacket } from './SimulationData';
import { assert } from '~/utils/nut';
import { type Message, USER_RESPONSE_CATEGORY } from '~/lib/persistence/message';
import { chatStore } from '~/lib/stores/chat';
import { sendChatMessageMocked, usingMockChat } from './MockChat';
import { flushSimulationData } from '~/components/chat/ChatComponent/functions/flushSimulation';
import { workbenchStore } from '~/lib/stores/workbench';
import { callNutAPI } from './NutAPI';
import { createScopedLogger } from '~/utils/logger';
import type { ChatResponse } from '~/lib/persistence/response';
import { addAppResponse, clearAppResponses, filterOnResponseCallback } from './ResponseFilter';

// Whether to send simulation data with chat messages.
// For now this is disabled while we design a better UX and messaging around reporting
// bugs in Nut apps.
const ENABLE_SIMULATION = false;

const logger = createScopedLogger('ChatMessage');

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

export type ChatResponseCallback = (response: ChatResponse) => void;

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

interface NutChatRequest {
  appId?: string;
  mode?: ChatMode;
  messages?: Message[];
  references?: ChatReference[];
  simulationData?: SimulationData;
  workerCount?: number;
}

function shouldSendMessage(message: Message) {
  return message.role == 'user' || message.category == USER_RESPONSE_CATEGORY;
}

export async function sendChatMessage(
  mode: ChatMode,
  messages: Message[],
  references: ChatReference[],
  onResponse: ChatResponseCallback,
) {
  if (usingMockChat()) {
    await sendChatMessageMocked(onResponse);
    return;
  }

  logger.debug('sendChatMessage', JSON.stringify({ mode, messages, references }));

  const appId = chatStore.currentAppId.get();
  assert(appId, 'No app id');

  let simulationData: SimulationData | undefined;

  const repositoryId = workbenchStore.repositoryId.get();
  if (repositoryId && ENABLE_SIMULATION) {
    simulationData = await flushSimulationData();
    if (simulationData) {
      const packet = createRepositoryIdPacket(repositoryId);
      simulationData.unshift(packet);
    }
  }

  const params: NutChatRequest = {
    appId: chatStore.currentAppId.get(),
    mode,
    messages: messages.filter(shouldSendMessage),
    references,
    simulationData,
  };

  try {
    await callNutAPI('chat', params, filterOnResponseCallback(onResponse));
  } catch (error) {
    console.error('chat message error', error, String(error));
    throw error;
  }

  logger.debug('sendChatMessage finished');
}

// Get all existing responses for the app.
export async function getExistingAppResponses(appId: string): Promise<ChatResponse[]> {
  clearAppResponses();
  const { responses } = await callNutAPI('get-app-responses', { appId });
  return responses.filter((response: ChatResponse) => addAppResponse(response));
}

// Stream any responses from chat messages that were sent previously
// and are still in progress.
export async function resumeChatMessage(onResponse: ChatResponseCallback) {
  const appId = chatStore.currentAppId.get();
  assert(appId, 'No app id');

  await callNutAPI('resume-chat', { appId }, filterOnResponseCallback(onResponse));
}
