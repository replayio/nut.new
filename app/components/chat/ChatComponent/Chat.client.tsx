import { renderLogger } from '~/utils/logger';
import ChatImplementer from './components/ChatImplementer/ChatImplementer';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { logStore } from '~/lib/stores/logs';
import { toast } from 'react-toastify';
import type { Message } from '~/lib/persistence/message';
import mergeResponseMessage from './functions/mergeResponseMessages';
import { getExistingAppResponses } from '~/lib/replay/SendChatMessage';
import { chatStore, doListenAppResponses, isResponseEvent } from '~/lib/stores/chat';
import { database } from '~/lib/persistence/apps';
import type { ChatResponse } from '~/lib/persistence/response';

export function Chat() {
  renderLogger.trace('Chat');

  const { id: appId } = useLoaderData<{ id?: string }>() ?? {};

  const [ready, setReady] = useState<boolean>(!appId);

  useEffect(() => {
    if (!appId) {
      return;
    }
    (async () => {
      try {
        const title = await database.getAppTitle(appId);
        const responses = await getExistingAppResponses(appId);
        let messages: Message[] = [];
        const eventResponses: ChatResponse[] = [];
        for (const response of responses) {
          if (response.kind == 'message') {
            messages = mergeResponseMessage(response.message, messages);
          }
          if (isResponseEvent(response)) {
            eventResponses.push(response);
          }
        }
        chatStore.currentAppId.set(appId);
        chatStore.appTitle.set(title);
        chatStore.events.set(eventResponses);
        chatStore.messages.set(messages);
        chatStore.started.set(chatStore.messages.get().length > 0);

        // Always check for ongoing work when we first start the chat.
        doListenAppResponses();

        setReady(true);
      } catch (error) {
        logStore.logError('Failed to load chat messages', error);
        toast.error((error as any).message);
      }
    })();
  }, []);

  return <>{ready && <ChatImplementer />}</>;
}
