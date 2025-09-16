import { atom } from 'nanostores';

export class MobileNavStore {
  activeTab = atom<'chat' | 'preview'>('chat');
  showMobileNav = atom<boolean>(false);

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

  setShowMobileNav(show: boolean) {
    this.showMobileNav.set(show);
  }
}

export const mobileNavStore = new MobileNavStore();
