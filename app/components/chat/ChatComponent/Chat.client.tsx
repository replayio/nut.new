import { renderLogger } from '~/utils/logger';
import ChatImplementer from './components/ChatImplementer/ChatImplementer';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { logStore } from '~/lib/stores/logs';
import { toast } from 'react-toastify';
import { getExistingAppResponses } from '~/lib/replay/SendChatMessage';
import { chatStore, doListenAppResponses, onChatResponse } from '~/lib/stores/chat';
import { database } from '~/lib/persistence/apps';
import { Unauthorized } from '~/components/chat/Unauthorized';
import { navigateApp } from '~/utils/nut';
import { useStore } from '@nanostores/react';
import { statusModalStore } from '~/lib/stores/statusModal';
import { clearAppResponses } from '~/lib/replay/ResponseFilter';
import { AppLoadingScreen } from '~/components/ui/AppLoadingScreen';
import { isAppOwnerStore, permissionsStore } from '~/lib/stores/permissions';
import type { AppPermissions } from '~/lib/api/permissions';
import { AppAccessKind, isAppAccessAllowed } from '~/lib/api/permissions';
import { userStore } from '~/lib/stores/userAuth';

async function isAppViewable(isAppOwner: boolean, permissions: AppPermissions, userEmail: string) {
  if (isAppOwner) {
    return true;
  }

  if (!permissions || permissions.length === 0) {
    return false;
  }

  if (isAppAccessAllowed(permissions, AppAccessKind.View, userEmail, isAppOwner)) {
    return true;
  }

  return false;
}

async function isAppCopyable(isAppOwner: boolean, permissions: AppPermissions, userEmail: string) {
  if (isAppOwner) {
    return true;
  }

  if (!permissions || permissions.length === 0) {
    return false;
  }

  if (isAppAccessAllowed(permissions, AppAccessKind.Copy, userEmail, isAppOwner)) {
    return true;
  }

  return false;
}

export async function updateAppState(appId: string) {
  const title = await database.getAppTitle(appId);
  const responses = await getExistingAppResponses(appId);
  for (const response of responses) {
    onChatResponse(response, 'InitialLoad');
  }
  chatStore.currentAppId.set(appId);
  chatStore.appTitle.set(title);
  chatStore.started.set(chatStore.messages.get().length > 0);
}

export function Chat() {
  renderLogger.trace('Chat');

  const { id: initialAppId } = useLoaderData<{ id?: string }>() ?? {};

  const [ready, setReady] = useState<boolean>(!initialAppId);
  const [isCopying, setIsCopying] = useState(false);
  const appTitle = useStore(chatStore.appTitle);
  const isOpen = useStore(statusModalStore.isOpen);
  const appSummary = useStore(chatStore.appSummary);
  const isAppOwner = useStore(isAppOwnerStore);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [authorizedCopy, setAuthorizedCopy] = useState<boolean>(true);
  const permissions = useStore(permissionsStore);
  const user = useStore(userStore.user);

  useEffect(() => {
    if (appTitle) {
      document.title = `Nut: ${appTitle}`;
    } else {
      document.title = 'Nut';
    }
  }, [appTitle]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    let documentVisible = document.visibilityState === 'visible';

    const handleVisibilityChange = async () => {
      const visible = document.visibilityState === 'visible';
      if (visible !== documentVisible) {
        documentVisible = visible;
        if (visible) {
          const appId = chatStore.currentAppId.get();
          if (appId && !chatStore.listenResponses.get()) {
            const wasStatusModalOpen = isOpen;
            statusModalStore.close();
            await updateAppState(appId);
            doListenAppResponses(wasStatusModalOpen, (appSummary?.features?.length ?? 0) > 0);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadApp = async (appId: string) => {
    try {
      if ((await isAppViewable(isAppOwner, permissions, user?.email ?? ''))) {
        setUnauthorized(false);
        return;
      }

      if ((await isAppCopyable(isAppOwner, permissions, user?.email ?? ''))) {
        setAuthorizedCopy(true);
        return;
      }

      clearAppResponses();
      await updateAppState(appId);

      // Always check for ongoing work when we first start the chat.
      doListenAppResponses(false, (appSummary?.features?.length ?? 0) > 0);

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
    if (initialAppId && user) {
      loadApp(initialAppId);
    }
  }, [initialAppId, user, permissions]);

  return (
    <>
      {!ready && initialAppId && !unauthorized && <AppLoadingScreen appId={initialAppId} />}
      {ready && !unauthorized && <ChatImplementer />}
      {ready && unauthorized && <Unauthorized authorizedCopy={authorizedCopy} handleCopyApp={handleCopyApp} isCopying={isCopying} />}
    </>
  );
}
