import { atom } from 'nanostores';

interface AppHistoryModalState {
  isOpen: boolean;
  appId?: string;
}

export const appHistoryModalStore = atom<AppHistoryModalState>({
  isOpen: false,
  appId: undefined,
});

export const openAppHistoryModal = (appId: string) => {
  appHistoryModalStore.set({ isOpen: true, appId });
};

export const closeAppHistoryModal = () => {
  appHistoryModalStore.set({ isOpen: false, appId: undefined });
};
