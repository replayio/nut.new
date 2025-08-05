// Support managing state for the development server URL the preview is loading.

import { workbenchStore } from '~/lib/stores/workbench';
import { debounce } from '~/utils/debounce';

export function getRepositoryURL(repositoryId: string | undefined) {
  if (!repositoryId) {
    return undefined;
  }

  return `https://${repositoryId}.http.replay.io`;
}

export const updateDevelopmentServer = debounce((repositoryId: string | undefined) => {
  const repositoryURL = getRepositoryURL(repositoryId);
  console.log('UpdateDevelopmentServer', new Date().toISOString(), repositoryURL);

  workbenchStore.showWorkbench.set(repositoryURL !== undefined);
  workbenchStore.repositoryId.set(repositoryId);
  workbenchStore.previewURL.set(repositoryURL);

  // Prefetch the development server so it will be ready earlier.
  if (repositoryURL) {
    fetch(repositoryURL);
  }
}, 500);
