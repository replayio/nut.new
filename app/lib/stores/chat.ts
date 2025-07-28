import { atom } from 'nanostores';
import mergeResponseMessage from '~/components/chat/ChatComponent/functions/mergeResponseMessages';
import type { Message } from '~/lib/persistence/message';
import type { ChatResponse } from '~/lib/persistence/response';
import { clearPendingMessageStatus } from './status';
import { database } from '~/lib/persistence/apps';
import { sendChatMessage, type ChatReference, listenAppResponses, ChatMode } from '~/lib/replay/SendChatMessage';
import { setPendingMessageStatus } from './status';
import { getLatestAppRepositoryId } from '~/lib/persistence/messageAppSummary';
import { updateDevelopmentServer } from '~/lib/replay/DevelopmentServer';
import { toast } from 'react-toastify';

export class ChatStore {
  currentAppId = atom<string | undefined>(undefined);
  appTitle = atom<string | undefined>(undefined);

  started = atom<boolean>(false);
  numAborts = atom<number>(0);
  showChat = atom<boolean>(true);

  // Whether there is an outstanding message sent to the chat.
  hasPendingMessage = atom<boolean>(false);

  // Set if work to build the app is actively going on and we are listening for responses.
  listenResponses = atom<boolean>(false);

  messages = atom<Message[]>([]);
  events = atom<ChatResponse[]>([]);
}

export const chatStore = new ChatStore();

// Return whether a response is relevant to reconstructing the progress on each feature.
export function isResponseEvent(response: ChatResponse) {
  switch (response.kind) {
    case 'app-event':
    case 'done':
    case 'error':
    case 'aborted':
      return true;
    default:
      return false;
  }
}

export function addResponseEvent(response: ChatResponse) {
  chatStore.events.set([...chatStore.events.get(), response]);
}

export function addChatMessage(message: Message) {
  chatStore.messages.set(mergeResponseMessage(message, chatStore.messages.get()));
}

export function doAbortChat() {
  chatStore.numAborts.set(chatStore.numAborts.get() + 1);
  chatStore.hasPendingMessage.set(false);
  chatStore.listenResponses.set(false);
  clearPendingMessageStatus();

  const appId = chatStore.currentAppId.get();
  if (appId) {
    database.abortAppChats(appId);
  }
}

export async function doSendMessage(mode: ChatMode, messages: Message[], references?: ChatReference[]) {
  const numAbortsAtStart = chatStore.numAborts.get();

  chatStore.hasPendingMessage.set(true);
  clearPendingMessageStatus();

  const onResponse = (response: ChatResponse) => {
    if (chatStore.numAborts.get() != numAbortsAtStart) {
      return;
    }

    switch (response.kind) {
      case 'message': {
        const existingRepositoryId = getLatestAppRepositoryId(chatStore.messages.get());

        addChatMessage(response.message);

        const responseRepositoryId = getLatestAppRepositoryId(chatStore.messages.get());

        if (responseRepositoryId && existingRepositoryId != responseRepositoryId) {
          updateDevelopmentServer(responseRepositoryId);
        }
        break;
      }
      case 'app-event':
        addResponseEvent(response);
        break;
      case 'title':
        chatStore.appTitle.set(response.title);
        break;
      case 'status':
        setPendingMessageStatus(response.status);
        break;
      case 'error':
        toast.error('Error sending message');
        console.error('Error sending message', response.error);
        break;
      case 'done':
      case 'aborted':
        break;
      default:
        console.error('Unknown chat response:', response);
        break;
    }
  };

  await sendChatMessage(mode, messages, references ?? [], onResponse);

  if (chatStore.numAborts.get() != numAbortsAtStart) {
    return;
  }

  chatStore.hasPendingMessage.set(false);

  doListenAppResponses();
}

export async function doListenAppResponses() {
  if (!chatStore.currentAppId.get()) {
    return;
  }

  if (chatStore.listenResponses.get()) {
    return;
  }
  chatStore.listenResponses.set(true);

  const numAbortsAtStart = chatStore.numAborts.get();

  const onResponse = (response: ChatResponse) => {
    if (chatStore.numAborts.get() != numAbortsAtStart) {
      return;
    }

    switch (response.kind) {
      case 'message': {
        const existingRepositoryId = getLatestAppRepositoryId(chatStore.messages.get());

        addChatMessage(response.message);

        const responseRepositoryId = getLatestAppRepositoryId(chatStore.messages.get());

        if (responseRepositoryId && existingRepositoryId != responseRepositoryId) {
          updateDevelopmentServer(responseRepositoryId);
        }
        break;
      }
      case 'app-event':
        addResponseEvent(response);
        break;
      case 'title':
        chatStore.appTitle.set(response.title);
        break;
      case 'status':
        setPendingMessageStatus(response.status);
        break;
      case 'done':
      case 'error':
      case 'aborted':
        break;
      default:
        console.error('Unknown chat response:', response);
        break;
    }
  };

  console.log('ListenAppResponsesStart');

  try {
    await listenAppResponses(onResponse);
  } catch (e) {
    toast.error('Error listing to app responses');
    console.error('Error listing to app response', e);
  }

  console.log('ListenAppResponsesDone');

  if (chatStore.numAborts.get() != numAbortsAtStart) {
    return;
  }

  chatStore.listenResponses.set(false);
}
