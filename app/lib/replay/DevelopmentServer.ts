// Support managing state for the development server URL the preview is loading.

import { workbenchStore } from '~/lib/stores/workbench';
import { debounce } from '~/utils/debounce';

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

export const updateDevelopmentServer = debounce((repositoryId: string | undefined) => {
  repositoryId = '2007d0fa-d571-48fc-8dbf-bef93abea8e0';
  const repositoryURL = getRepositoryURL(repositoryId);
  console.log('UpdateDevelopmentServer', new Date().toISOString(), repositoryURL);

  workbenchStore.showWorkbench.set(repositoryURL !== undefined);
  workbenchStore.repositoryId.set(repositoryId);
  workbenchStore.previewURL.set(repositoryURL);
}, 500);
