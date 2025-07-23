import { renderLogger } from '~/utils/logger';
import ChatImplementer from './components/ChatImplementer/ChatImplementer';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { logStore } from '~/lib/stores/logs';
import { toast } from 'react-toastify';
import type { Message } from '~/lib/persistence/message';
import mergeResponseMessage from './functions/mergeResponseMessages';
import { getExistingAppResponses } from '~/lib/replay/SendChatMessage';
import { chatStore } from '~/lib/stores/chat';
import { database } from '~/lib/persistence/apps';
import type { ChatResponseAppEvent } from '~/lib/persistence/response';

export function Chat() {
  renderLogger.trace('Chat');

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const { id: appId } = useLoaderData<{ id?: string }>() ?? {};

  const [ready, setReady] = useState<boolean>(!appId);

  useEffect(() => {
    (async () => {
      try {
        if (appId) {
          const title = await database.getAppTitle(appId);
          const responses = await getExistingAppResponses(appId);
          let messages: Message[] = [];
          const appEvents: ChatResponseAppEvent[] = [];
          for (const response of responses) {
            switch (response.kind) {
              case 'message':
                messages = mergeResponseMessage(response.message, messages);
                break;
              case 'app-event':
                appEvents.push(response);
                break;
            }
          }
          chatStore.currentAppId.set(appId);
          chatStore.appTitle.set(title);
          setInitialMessages(messages);
          setReady(true);
        }
      } catch (error) {
        logStore.logError('Failed to load chat messages', error);
        toast.error((error as any).message);
      }
    })();
  }, []);

  return <>{ready && <ChatImplementer initialMessages={initialMessages} />}</>;
}
