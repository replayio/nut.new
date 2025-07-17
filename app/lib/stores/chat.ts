import { atom } from 'nanostores';

export class ChatStore {
  currentAppId = atom<string | undefined>(undefined);
  appTitle = atom<string | undefined>(undefined);

  started = atom<boolean>(false);
  aborted = atom<boolean>(false);
  showChat = atom<boolean>(true);
}

export const chatStore = new ChatStore();

// Title used for new apps.
export const DefaultTitle = 'New App';
