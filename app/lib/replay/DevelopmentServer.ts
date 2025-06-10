// Support managing state for the development server URL the preview is loading.

import { workbenchStore } from '~/lib/stores/workbench';
import { chatStore } from '~/lib/stores/chat';

function getRepositoryURL(repositoryId: string | undefined) {
  if (!repositoryId) {
    return undefined;
  }

  return `https://${repositoryId}.http.replay.io`;
}

export async function updateDevelopmentServer(repositoryId: string | undefined) {
  const repositoryURL = getRepositoryURL(repositoryId);
  console.log('UpdateDevelopmentServer', new Date().toISOString(), repositoryURL);

  if (!workbenchStore.showWorkbench.get()) {
    chatStore.showChat.set(false);
  }

  workbenchStore.showWorkbench.set(repositoryURL !== undefined);
  workbenchStore.repositoryId.set(repositoryId);
  workbenchStore.previewURL.set(repositoryURL);
}
