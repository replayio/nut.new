import { atom, type WritableAtom } from 'nanostores';

export class WorkbenchStore {
  // The current repository.
  repositoryId = atom<string | undefined>(undefined);

  // Repository we are waiting to start up.
  pendingRepositoryId = atom<string | undefined>(undefined);

  // Any available preview URL for the current repository.
  previewURL = atom<string | undefined>(undefined);

  showWorkbench: WritableAtom<boolean> = import.meta.hot?.data.showWorkbench ?? atom(false);

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.showWorkbench = this.showWorkbench;
    }
  }

  setShowWorkbench(show: boolean) {
    this.showWorkbench.set(show);
  }
}

export const workbenchStore = new WorkbenchStore();
