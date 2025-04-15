// Support managing state for the development server URL the preview is loading.

import { workbenchStore } from '~/lib/stores/workbench';

function getRepositoryURL(repositoryId: string | undefined) {
  if (!repositoryId) {
    return undefined;
  }

  return `https://${repositoryId}.http.replay.io`;
}

export async function updateDevelopmentServer(repositoryId: string | undefined) {
  const repositoryURL = getRepositoryURL(repositoryId);
  console.log('UpdateDevelopmentServer', new Date().toISOString(), repositoryURL);

  workbenchStore.showWorkbench.set(repositoryURL !== undefined);
  workbenchStore.repositoryId.set(repositoryURL);
  workbenchStore.previewURL.set(repositoryURL);
}
