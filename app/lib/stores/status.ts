import { atom } from 'nanostores';

// Store for tracking the current pending message status
export const pendingMessageStatusStore = atom<string>('');

// Helper functions to update the status
export function setPendingMessageStatus(status: string) {
  pendingMessageStatusStore.set(status);
}

export function clearPendingMessageStatus() {
  pendingMessageStatusStore.set('');
}
