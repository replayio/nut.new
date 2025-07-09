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
const gMockChat: Message[] | undefined = [
  {
    "id": "user-6664e18e",
    "role": "user",
    "type": "text",
    "content": "Build a todo app"
  },
  {
    "id": "operator-run-9a39c7dd-2e1b-4a9f-a998-60c3a64ae0c3#1",
    "role": "assistant",
    "type": "text",
    "content": "I can help you build a todo app! This is a great project to work on.\n\nTo get started, I need to understand a key aspect of how you want the app to function:\n\n**Do you want the todos to be saved permanently so they persist when you close and reopen the app?**\n\n- [ ] Yes - Save todos to a database (I'll configure this automatically)\n- [ ] No - Just keep them in memory for the current session\n\nThis will help me determine whether to include database functionality in your todo app.",
    "category": "DiscoveryResponse",
    "createTime": "2025-07-09T20:11:07.002Z"
  },
  {
    "id": "operator-run-9a39c7dd-2e1b-4a9f-a998-60c3a64ae0c3#1-message-1",
    "role": "assistant",
    "type": "text",
    "content": "{\"rating\":4}",
    "category": "DiscoveryRating",
    "createTime": "2025-07-09T20:11:07.002Z"
  },
  {
    "id": "user-4957bf54",
    "role": "user",
    "type": "text",
    "content": "yes"
  },
  {
    "id": "operator-run-caa61b9c-3610-4ddc-a70e-a35535a1734d#1",
    "role": "assistant",
    "type": "text",
    "content": "Great! I'll include database functionality to save your todos permanently - this will be configured automatically for you.\n\nNow I'd like to understand what features you want in your todo app:\n\n**What core functionality do you want beyond basic add/delete todos?**\n\n- [ ] Mark todos as complete/incomplete\n- [ ] Edit existing todos\n- [ ] Add due dates to todos\n- [ ] Organize todos into categories/lists\n- [ ] Add priority levels (high, medium, low)\n- [ ] Search/filter todos\n\nYou can select any combination of these features, or let me know if you have other specific features in mind!",
    "category": "DiscoveryResponse",
    "createTime": "2025-07-09T20:11:55.283Z"
  },
  {
    "id": "operator-run-caa61b9c-3610-4ddc-a70e-a35535a1734d#1-message-1",
    "role": "assistant",
    "type": "text",
    "content": "{\"rating\":6}",
    "category": "DiscoveryRating",
    "createTime": "2025-07-09T20:11:55.283Z"
  }
];

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

  const startTime = gMockChat.find(msg => msg.createTime)?.createTime;
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
