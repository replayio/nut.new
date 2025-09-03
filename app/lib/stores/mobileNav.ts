import { atom } from 'nanostores';

export class MobileNavStore {
  activeTab = atom<'chat' | 'preview'>('chat');

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.activeTab = this.activeTab;
    }
  }

  setActiveTab(tab: 'chat' | 'preview') {
    this.activeTab.set(tab);
  }

  getActiveTab() {
    return this.activeTab.get();
  }
}

export const mobileNavStore = new MobileNavStore();
