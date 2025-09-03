import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { Suspense } from 'react';
import { ClientAuth } from '~/components/auth/ClientAuth';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import { IconButton } from '~/components/ui/IconButton';
import { userStore } from '~/lib/stores/userAuth';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { DeployChatButton } from './DeployChat/DeployChatButton';
import { DownloadButton } from './DownloadButton';
import ViewVersionHistoryButton from '~/components/workbench/VesionHistory/ViewVersionHistoryButton';
import useViewport from '~/lib/hooks';

export function Header() {
  const chatStarted = useStore(chatStore.started);
  const user = useStore(userStore.user);
  const appSummary = useStore(chatStore.appSummary);
  const appId = useStore(chatStore.currentAppId);
  const isSmallViewport = useViewport(800);

  return (
    <header
      className={classNames(
        'flex items-center justify-between px-4 py-4 border-b h-[var(--header-height)] bg-bolt-elements-background-depth-1/80 transition-all duration-300 z-10',
        {
          'border-transparent shadow-none': !chatStarted,
          'border-bolt-elements-borderColor/50 shadow-sm backdrop-blur-md': chatStarted,
        },
      )}
    >
      <div className="flex items-center gap-4 text-bolt-elements-textPrimary">
        {user && (
          <IconButton
            onClick={() => sidebarMenuStore.toggle()}
            data-testid="sidebar-icon"
            icon="i-ph:sidebar-simple-duotone"
            size="xl"
            title="Toggle Sidebar"
          />
        )}
        {appSummary && !isSmallViewport && <ChatDescription />}
      </div>

      {appSummary && !isSmallViewport && (
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-3">
            {appId && <ViewVersionHistoryButton />}
            <DownloadButton />
            <DeployChatButton />
          </div>
        </div>
      )}

      <ClientOnly>
        {() => (
          <Suspense
            fallback={
              <div className="w-10 h-10 rounded-xl bg-bolt-elements-background-depth-2 animate-pulse border border-bolt-elements-borderColor gap-2" />
            }
          >
            <div className="flex items-center gap-3">
              <ThemeSwitch />
              <ClientAuth />
            </div>
          </Suspense>
        )}
      </ClientOnly>
    </header>
  );
}
