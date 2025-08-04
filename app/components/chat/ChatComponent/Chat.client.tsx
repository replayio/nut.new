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
import { NutAPIError } from '~/lib/replay/NutAPI';
import { logAppSummaryMessage } from '~/lib/persistence/messageAppSummary';
import { Unauthorized } from '~/components/chat/Unauthorized';

async function isAppAccessible(appId: string) {
  try {
    await database.getAppTitle(appId);
    return true;
  } catch (error) {
    if (error instanceof NutAPIError && error.status == 401) {
      return false;
    }
    throw error;
  }
}

export function Chat() {
  renderLogger.trace('Chat');

  const { id: appId } = useLoaderData<{ id?: string }>() ?? {};

  const [ready, setReady] = useState<boolean>(!appId);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);

  useEffect(() => {
    if (!appId) {
      return;
    }
    (async () => {
      try {
        if (!await isAppAccessible(appId)) {
          setUnauthorized(true);
          return;
        }

        const title = await database.getAppTitle(appId);
        const responses = await getExistingAppResponses(appId);
        let messages: Message[] = [];
        const eventResponses: ChatResponse[] = [];
        for (const response of responses) {
          if (response.kind == 'message') {
            logAppSummaryMessage(response.message, 'InitialLoad');
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

  return (
    <>
      {ready && <ChatImplementer />}
      {unauthorized && <Unauthorized />}
    </>
  );
}
