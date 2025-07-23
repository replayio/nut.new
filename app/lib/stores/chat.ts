import { atom } from 'nanostores';
import type { ChatResponse } from '~/lib/persistence/response';

export class ChatStore {
  currentAppId = atom<string | undefined>(undefined);
  appTitle = atom<string | undefined>(undefined);

  started = atom<boolean>(false);
  aborted = atom<boolean>(false);
  showChat = atom<boolean>(true);

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
