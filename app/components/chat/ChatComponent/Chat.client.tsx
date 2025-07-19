import { renderLogger } from '~/utils/logger';
import ChatImplementer from './components/ChatImplementer/ChatImplementer';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { logStore } from '~/lib/stores/logs';
import type { Message } from '~/lib/persistence/message';
import { database } from '~/lib/persistence/apps';
import { toast } from 'react-toastify';
import mergeResponseMessage from './functions/mergeResponseMessages';

export function Chat() {
  renderLogger.trace('Chat');

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const { id: appId } = useLoaderData<{ id?: string }>() ?? {};

  const [ready, setReady] = useState<boolean>(!appId);

  useEffect(() => {
    (async () => {
      try {
        if (appId) {
          const rawMessages = await database.getInitialMessages(appId);
          let messages: Message[] = [];
          for (const rawMessage of rawMessages) {
            messages = mergeResponseMessage(rawMessage, messages);
          }
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
