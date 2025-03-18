import { atom } from 'nanostores';

export const isAuthModalOpenStore = atom(false);

export const authModalStore = {
  open: () => isAuthModalOpenStore.set(true),
  close: () => isAuthModalOpenStore.set(false),
};
