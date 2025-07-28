import { atom } from 'nanostores';

export class StatusModalStore {
  isOpen = atom<boolean>(false);

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.isOpen = this.isOpen;
    }
  }

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  toggle() {
    this.isOpen.set(!this.isOpen.get());
  }
}

export const statusModalStore = new StatusModalStore();
