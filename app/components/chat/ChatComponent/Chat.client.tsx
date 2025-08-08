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
import { navigateApp } from '~/utils/nut';
import { useStore } from '@nanostores/react';
import { statusModalStore } from '~/lib/stores/statusModal';

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

async function updateAppState(appId: string) {
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
}

export function Chat() {
  renderLogger.trace('Chat');

  const { id: initialAppId } = useLoaderData<{ id?: string }>() ?? {};

  const [ready, setReady] = useState<boolean>(!initialAppId);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState(false);
  const appTitle = useStore(chatStore.appTitle);

  // Listen for document visibility changes. If the document becomes visible
  // we don't trust that we have the latest version of the app, so will refresh
  // state and show the status modal if it was open earlier and there is no
  // in progress chat.
  useEffect(() => {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        const appId = chatStore.currentAppId.get();
        if (appId && !chatStore.listenResponses.get()) {
          const wasStatusModalOpen = statusModalStore.isOpen.get();
          console.log('DocumentReloadApp', wasStatusModalOpen);
          statusModalStore.close();
          await updateAppState(appId);
          doListenAppResponses(wasStatusModalOpen);
        }
      }
    });
  }, []);

  // Update document title when app title changes
  useEffect(() => {
    if (appTitle) {
      document.title = `Nut: ${appTitle}`;
    } else {
      document.title = 'Nut';
    }
  }, [appTitle]);

  const loadApp = async (appId: string) => {
    try {
      if (!(await isAppAccessible(appId))) {
        setUnauthorized(true);
        return;
      }

      await updateAppState(appId);

      // Always check for ongoing work when we first start the chat.
      doListenAppResponses();

      setReady(true);
    } catch (error) {
      logStore.logError('Failed to load chat messages', error);
      toast.error((error as any).message);
    }
  };

  const handleCopyApp = async () => {
    if (!initialAppId || isCopying) {
      return;
    }

    setIsCopying(true);
    try {
      const newAppId = await database.copyApp(initialAppId);
      toast.success('App copied successfully!');
      navigateApp(newAppId);
      await loadApp(newAppId);
      setUnauthorized(false);
    } catch (error) {
      console.error('Failed to copy app:', error);
      toast.error('Failed to copy app. Please try again.');
    } finally {
      setIsCopying(false);
    }
  };

  useEffect(() => {
    if (initialAppId) {
      loadApp(initialAppId);
    }
  }, []);

  return (
    <>
      {ready && <ChatImplementer />}
      {unauthorized && <Unauthorized handleCopyApp={handleCopyApp} isCopying={isCopying} />}
    </>
  );
}
