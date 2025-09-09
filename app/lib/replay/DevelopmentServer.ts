// Support managing state for the development server URL the preview is loading.

import { workbenchStore } from '~/lib/stores/workbench';
import { debounce } from '~/utils/debounce';
import { callNutAPI } from './NutAPI';

export function getRepositoryURL(repositoryId: string | undefined) {
  if (!repositoryId) {
    return undefined;
  }

  const override = import.meta.env.VITE_REPOSITORY_URL_OVERRIDE;
  if (override) {
    console.log('Override Repository URL', override);
    return override;
  }

  return `https://${repositoryId}.http.replay.io`;
}

export const updateDevelopmentServer = debounce(async (repositoryId: string | undefined) => {
  const repositoryURL = getRepositoryURL(repositoryId);
  console.log('UpdateDevelopmentServer', new Date().toISOString(), repositoryURL);

  workbenchStore.pendingRepositoryId.set(repositoryId);

  if (repositoryId) {
    try {
      await callNutAPI('wait-for-development-server', { repositoryId });
    } catch (error) {
      console.error('Error waiting for development server', error);
    }
  }

  if (workbenchStore.pendingRepositoryId.get() !== repositoryId) {
    return;
  }

  workbenchStore.showWorkbench.set(repositoryURL !== undefined);
  workbenchStore.repositoryId.set(repositoryId);
  workbenchStore.previewURL.set(repositoryURL);
}, 500);
