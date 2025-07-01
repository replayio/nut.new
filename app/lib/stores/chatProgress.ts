import { atom } from 'nanostores';

// Store for tracking if a chat is currently in progress
export const chatProgressStore = atom<boolean>(false);

// Store for tracking if this is the first chat message
export const isFirstChatMessageStore = atom<boolean>(true);

// Helper functions to update the chat progress
export function setChatInProgress(inProgress: boolean) {
  chatProgressStore.set(inProgress);
}

export function startChat() {
  chatProgressStore.set(true);
}

export function finishChat() {
  chatProgressStore.set(false);
}

export function setFirstChatMessage(isFirst: boolean) {
  isFirstChatMessageStore.set(isFirst);
} 