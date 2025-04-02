import { atom } from 'nanostores';

export class ChatStore {
  started = atom<boolean>(false);
  aborted = atom<boolean>(false);
  showChat = atom<boolean>(true);

  // Information about the current chat.
  chatId = atom<string | undefined>(undefined);
  chatTitle = atom<string | undefined>(undefined);
}

export const chatStore = new ChatStore();
