import { atom } from 'nanostores';

export const accountModalStore = {
  isOpen: atom<boolean>(false),

  open() {
    this.isOpen.set(true);
  },

  close() {
    this.isOpen.set(false);
  },

  toggle() {
    this.isOpen.set(!this.isOpen.get());
  },
};
