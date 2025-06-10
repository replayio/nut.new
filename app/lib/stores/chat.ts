import { atom } from 'nanostores';
import type { ChatContents } from '~/lib/persistence/chats';

export class ChatStore {
  currentChat = atom<ChatContents | undefined>(undefined);

  started = atom<boolean>(false);
  aborted = atom<boolean>(false);
  showChat = atom<boolean>(true);
  pendingMessageStatus = atom<string>('');
}

export const chatStore = new ChatStore();
