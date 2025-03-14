import { atom, type WritableAtom } from 'nanostores';

export type WorkbenchViewType = 'code' | 'preview';

export class WorkbenchStore {
  // The current repository.
  repositoryId = atom<string | undefined>(undefined);

  // Any available preview URL for the current repository.
  previewURL = atom<string | undefined>(undefined);

  showWorkbench: WritableAtom<boolean> = import.meta.hot?.data.showWorkbench ?? atom(false);
  currentView: WritableAtom<WorkbenchViewType> = import.meta.hot?.data.currentView ?? atom('code');

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.showWorkbench = this.showWorkbench;
      import.meta.hot.data.currentView = this.currentView;
    }
  }

  setShowWorkbench(show: boolean) {
    this.showWorkbench.set(show);
  }
}

export const workbenchStore = new WorkbenchStore();
