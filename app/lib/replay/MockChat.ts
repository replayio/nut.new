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

if (gMockChat) {
  disableTelemetry();
}

export function usingMockChat() {
  return !!gMockChat;
}

export async function sendChatMessageMocked(callbacks: ChatMessageCallbacks) {
  assert(gMockChat, 'Mock chat is not defined');

  console.log('Using mock chat', gMockChat);

  assert(gMockChat[0].createTime, 'Mock chat first message must have a create time');
  let currentTime = Date.parse(gMockChat[0].createTime);

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
