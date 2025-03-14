// Support using the Nut API for the development server.

import { assert, ProtocolClient } from './ReplayProtocolClient';
import { workbenchStore } from '~/lib/stores/workbench';
import { recordingMessageHandlerScript } from './Recording';
import { toast } from 'react-toastify';

class DevelopmentServerManager {
  // Empty if this chat has been destroyed.
  client: ProtocolClient | undefined;

  // Resolves when the chat has started.
  chatIdPromise: Promise<string>;

  constructor() {
    this.client = new ProtocolClient();

    this.chatIdPromise = (async () => {
      assert(this.client, 'Chat has been destroyed');

      await this.client.initialize();

      const { chatId } = (await this.client.sendCommand({ method: 'Nut.startChat', params: {} })) as { chatId: string };

      console.log('DevelopmentServerChat', new Date().toISOString(), chatId);

      return chatId;
    })();
  }

  destroy() {
    this.client?.close();
    this.client = undefined;
  }

  async setRepositoryContents(repositoryId: string): Promise<string | undefined> {
    assert(this.client, 'Chat has been destroyed');

    try {
      const chatId = await this.chatIdPromise;
      const { url } = (await this.client.sendCommand({
        method: 'Nut.startDevelopmentServer',
        params: {
          chatId,
          repositoryId,
          injectedScript: recordingMessageHandlerScript,
        },
      })) as { url: string };

      return url;
    } catch (e) {
      console.error('DevelopmentServerError', e);
      return undefined;
    }
  }
}

let gActiveDevelopmentServer: DevelopmentServerManager | undefined;

export async function updateDevelopmentServer(repositoryId: string) {
  workbenchStore.repositoryId.set(repositoryId);
  workbenchStore.previewURL.set(undefined);

  if (!gActiveDevelopmentServer) {
    gActiveDevelopmentServer = new DevelopmentServerManager();
  }

  const url = await gActiveDevelopmentServer.setRepositoryContents(repositoryId);

  if (!url) {
    toast.error('Failed to start development server');
  }

  workbenchStore.previewURL.set(url);
}
