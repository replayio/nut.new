import { renderLogger } from '~/utils/logger';
import ChatImplementer from './components/ChatImplementer/ChatImplementer';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { logStore } from '~/lib/stores/logs';
import { database } from '~/lib/persistence/apps';
import { toast } from 'react-toastify';
import type { ChatResponse } from '~/lib/persistence/response';

export function Chat() {
  renderLogger.trace('Chat');

  const [initialResponses, setInitialResponses] = useState<ChatResponse[]>([]);
  const { id: appId } = useLoaderData<{ id?: string }>() ?? {};

  const [ready, setReady] = useState<boolean>(!appId);

  useEffect(() => {
    (async () => {
      try {
        if (appId) {
          const responses = await database.getAppResponses(appId);
          setInitialResponses(responses);
          setReady(true);
        }
      } catch (error) {
        logStore.logError('Failed to load chat messages', error);
        toast.error((error as any).message);
      }
    })();
  }, []);

  return <>{ready && <ChatImplementer initialResponses={initialResponses} />}</>;
}
