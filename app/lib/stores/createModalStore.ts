import { atom, type WritableAtom } from 'nanostores';

export interface BaseModalStore<T = void> {
  isOpen: WritableAtom<boolean>;
  data: WritableAtom<T | null>;
  open: (payload?: T) => void;
  close: () => void;
  toggle: () => void;
}

export function createModalStore<T = void>(_name?: string): BaseModalStore<T> {
  const isOpen = atom<boolean>(false);
  const data = atom<T | null>(null);

  return {
    isOpen,
    data,

    open(payload?: T) {
      data.set(payload ?? null);
      isOpen.set(true);
    },

    close() {
      isOpen.set(false);
      data.set(null);
    },

    toggle() {
      const currentState = isOpen.get();

      if (currentState) {
        data.set(null);
      }

      isOpen.set(!currentState);
    },
  };
}

export interface ModalStoreWithTab<T = void, Tab extends string = string> extends BaseModalStore<T> {
  activeTab: WritableAtom<Tab>;
  setTab: (tab: Tab) => void;
  openWithTab: (tab: Tab, payload?: T) => void;
}

export function createModalStoreWithTab<T = void, Tab extends string = string>(
  defaultTab: Tab,
  _name?: string,
): ModalStoreWithTab<T, Tab> {
  const baseStore = createModalStore<T>(_name);
  const activeTab = atom<Tab>(defaultTab);

  return {
    ...baseStore,
    activeTab,

    setTab(tab: Tab) {
      activeTab.set(tab);
    },

    openWithTab(tab: Tab, payload?: T) {
      activeTab.set(tab);
      baseStore.open(payload);
    },

    open(payload?: T) {
      activeTab.set(defaultTab);
      baseStore.open(payload);
    },

    close() {
      baseStore.close();
      activeTab.set(defaultTab);
    },
  };
}

export function useModalActions<T>(store: BaseModalStore<T>) {
  return {
    open: store.open,
    close: store.close,
    toggle: store.toggle,
  };
}
