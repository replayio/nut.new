import { atom } from 'nanostores';

export type SidebarNavTab = 'chat' | 'design-system' | 'version-history' | 'app-settings' | 'deploy';

export const activeSidebarTab = atom<SidebarNavTab>('chat');

export const sidebarNavStore = {
  setActiveTab: (tab: SidebarNavTab) => {
    activeSidebarTab.set(tab);
  },
  getActiveTab: () => activeSidebarTab.get(),
};
