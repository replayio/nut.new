/*
 * Mock chats generate a hardcoded series of responses to a chat message.
 * This avoids non-deterministic behavior in the chat backend and is helpful for
 * development, testing, demos etc.
 */

import { assert, waitForTime } from '~/lib/replay/ReplayProtocolClient';
import type { Message } from '~/lib/persistence/message';
import type { ChatMessageCallbacks } from './ChatManager';
import { disableTelemetry } from '~/lib/hooks/pingTelemetry';

// Add your mock chat messages here!
const gMockChat: Message[] | undefined = undefined;

// Add any status events to emit here!
const gMockStatus: MockChatStatus[] | undefined = undefined;

interface MockChatStatus {
  time: string;
  status: string;
}

if (gMockChat) {
  disableTelemetry();
}

export function usingMockChat() {
  return !!gMockChat;
}

export async function sendChatMessageMocked(callbacks: ChatMessageCallbacks) {
  assert(gMockChat, 'Mock chat is not defined');

  console.log('Using mock chat', gMockChat);

  const startTime = gMockChat.find((msg) => msg.createTime)?.createTime;
  assert(startTime, 'Mock chat must have a start time');
  let currentTime = Date.parse(startTime);

  for (const status of gMockStatus || []) {
    const delta = Math.max(Date.parse(status.time) - currentTime, 0);
    waitForTime(delta).then(() => callbacks.onStatus(status.status));
  }

  for (const message of gMockChat) {
    if (message.role === 'user') {
      continue;
    }

    if (message.createTime) {
      const messageTime = Date.parse(message.createTime);
      if (messageTime > currentTime) {
        await waitForTime(messageTime - currentTime);
        currentTime = messageTime;
      }
    }

    callbacks.onResponsePart(message);
  }
}
