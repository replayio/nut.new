import { atom } from 'nanostores';
import mergeResponseMessage from '~/components/chat/ChatComponent/functions/mergeResponseMessages';
import type { Message } from '~/lib/persistence/message';
import type { ChatResponse } from '~/lib/persistence/response';

export class ChatStore {
  currentAppId = atom<string | undefined>(undefined);
  appTitle = atom<string | undefined>(undefined);

  started = atom<boolean>(false);
  aborted = atom<boolean>(false);
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
