import { atom } from 'nanostores';

export type AccountTabType = 'account' | 'billing' | null;

const isOpen = atom<boolean>(false);
const activeTab = atom<AccountTabType>('account');

export const accountModalStore = {
  isOpen,
  activeTab,

  open(tab: AccountTabType = 'account') {
    activeTab.set(tab);
    isOpen.set(true);
  },

  close() {
    isOpen.set(false);
  },

  toggle() {
    isOpen.set(!isOpen.get());
  },
};
