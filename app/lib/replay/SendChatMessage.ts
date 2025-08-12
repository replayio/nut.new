/*
 * Core logic for running and managing remote chats.
 */

import { assert } from '~/utils/nut';
import { type Message, DISCOVERY_RESPONSE_CATEGORY, USER_RESPONSE_CATEGORY } from '~/lib/persistence/message';
import { chatStore } from '~/lib/stores/chat';
import { sendChatMessageMocked, usingMockChat } from './MockChat';
import { flushSessionData } from '~/components/chat/ChatComponent/functions/flushSessionData';
import { workbenchStore } from '~/lib/stores/workbench';
import { callNutAPI } from './NutAPI';
import { createScopedLogger } from '~/utils/logger';
import { waitForTime } from '~/utils/nut';
import type { ChatResponse } from '~/lib/persistence/response';
import { getLastResponseTime } from './ResponseFilter';
import type { MouseData, SessionData } from './MessageHandler';

// Whether to send session data to the backend with chat messages.
// For now this is disabled while we design a better UX and messaging around reporting
// bugs in Nut apps.
const ENABLE_SESSION_DATA = false;

const logger = createScopedLogger('ChatMessage');

interface ChatReferenceElement {
  kind: 'element';
  mouseData: MouseData;
}

export type ChatReference = ChatReferenceElement;

export type ChatResponseCallback = (response: ChatResponse) => void;

export enum ChatMode {
  BuildApp = 'BuildApp',
  Discovery = 'Discovery',
  DevelopApp = 'DevelopApp',
}

interface NutChatRequest {
  appId?: string;
  mode?: ChatMode;
  messages?: Message[];
  references?: ChatReference[];
  sessionData?: SessionData;
}

// Messages that are rendered normally in the chat.
export function shouldDisplayMessage(message: Message) {
  return (
    message.role == 'user' ||
    message.category == DISCOVERY_RESPONSE_CATEGORY ||
    message.category == USER_RESPONSE_CATEGORY
  );
}

const SHORT_POLL_INTERVAL = 10000;

// We use a belt-and-suspenders approach to gathering responses where we both do
// long polling while calling the Nut API and occasional short polling to see if
// there are other responses we haven't received yet for some reason. This covers
// for cases where long polling does not return responses in a timely fashion.
async function pollResponses(appId: string, onResponse: ChatResponseCallback, callback: () => Promise<void>) {
  const getResponses = async () => {
    const lastResponseTime = getLastResponseTime();
    const { responses } = await callNutAPI('get-app-responses', { appId, lastResponseTime });
    for (const response of responses) {
      onResponse(response);
    }
  };

  const interval = setInterval(getResponses, SHORT_POLL_INTERVAL);

  try {
    await callback();
  } finally {
    clearInterval(interval);
    await getResponses();
  }
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

  let sessionData: SessionData | undefined;

  const repositoryId = workbenchStore.repositoryId.get();
  if (repositoryId && ENABLE_SESSION_DATA) {
    sessionData = await flushSessionData();
  }

  const params: NutChatRequest = {
    appId,
    mode,
    messages: messages.filter(shouldDisplayMessage),
    references,
    sessionData,
  };

  await pollResponses(appId, onResponse, () => callNutAPI('chat', params, onResponse));

  logger.debug('sendChatMessage finished');
}

// Get all existing responses for the app.
export async function getExistingAppResponses(appId: string): Promise<ChatResponse[]> {
  const { responses } = await callNutAPI('get-app-responses', { appId });
  return responses;
}

// Stream any responses from ongoing work that is modifying the app.
export async function listenAppResponses(onResponse: ChatResponseCallback) {
  const appId = chatStore.currentAppId.get();
  assert(appId, 'No app id');

  await pollResponses(appId, onResponse, async () => {
    while (true) {
      try {
        await callNutAPI('listen-app-responses', { appId }, onResponse);
        break;
      } catch (error) {
        // Retry with a delay until the message finishes successfully.
        console.log('listenAppResponses error, retrying', error);
        await waitForTime(5000);
        continue;
      }
    }
  });
}
