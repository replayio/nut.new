import { useStore } from '@nanostores/react';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { chatStore, onChatResponse } from '~/lib/stores/chat';

interface WebhookConfig {
  // Functions that can be called without any access keys.
  publicFunctions?: string[];

  // Functions that can be called with an access key set.
  accessKeyFunctions?: string[];

  // The key to use for the access key functions.
  accessKey?: string;
}

interface WebhookDocumentation {
  // Map function name to description.
  functions?: Record<string, string>;
}

async function getWebhookConfig(): Promise<{ config: WebhookConfig; documentation: WebhookDocumentation }> {
  const appId = useStore(chatStore.currentAppId);
  if (!appId) {
    return { config: {}, documentation: {} };
  }
  const { config, documentation } = await callNutAPI('get-webhook-config', { appId });
  return { config, documentation };
}

async function setWebhookConfig(config: WebhookConfig): Promise<void> {
  const appId = useStore(chatStore.currentAppId);
  if (!appId) {
    return;
  }
  const { response } = await callNutAPI('set-webhook-config', { appId, config });
  if (response) {
    onChatResponse(response, 'SetWebhookConfig');
  }
}

export const WebhooksPanel = () => {
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-xl font-bold text-bolt-elements-textHeading mb-4">Webhooks</h2>
      <p className="text-bolt-elements-textSecondary">Webhooks configuration coming soon...</p>
    </div>
  );
};
