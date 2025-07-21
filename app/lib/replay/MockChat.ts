/*
 * Mock chats generate a hardcoded series of responses to a chat message.
 * This avoids non-deterministic behavior in the chat backend and is helpful for
 * development, testing, demos etc.
 */

import { assert, waitForTime } from '~/utils/nut';
import { disableTelemetry } from '~/lib/hooks/pingTelemetry';
import type { ChatResponseCallback } from './SendChatMessage';
import type { ChatResponse } from '~/lib/persistence/response';

// Add your mock chat messages here!
const gMockResponses: ChatResponse[] | undefined = undefined;

if (gMockResponses) {
  disableTelemetry();
}

export function usingMockChat() {
  return !!gMockResponses;
}

export async function sendChatMessageMocked(onResponse: ChatResponseCallback) {
  assert(gMockResponses, 'Mock chat is not defined');

  console.log('Using mock chat', gMockResponses);

  const startTime = gMockResponses[0].time;
  assert(startTime, 'Mock chat must have a start time');
  let currentTime = Date.parse(startTime);

  for (const response of gMockResponses) {
    const delta = Math.max(Date.parse(response.time) - currentTime, 0);
    waitForTime(delta).then(() => onResponse(response));
  }

  for (const response of gMockResponses) {
    const responseTime = Date.parse(response.time);
    if (responseTime > currentTime) {
      await waitForTime(responseTime - currentTime);
      currentTime = responseTime;
    }

    onResponse(response);
  }
}
