import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { Suspense } from 'react';
import { ClientAuth } from '~/components/auth/ClientAuth';
import WithTooltip from '~/components/ui/Tooltip';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import { IconButton } from '~/components/ui/IconButton';
import { userStore } from '~/lib/stores/userAuth';

export function Header() {
  const chatStarted = useStore(chatStore.started);
  const user = useStore(userStore.user);

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
      <div className="flex flex-1 items-center gap-4 text-bolt-elements-textPrimary">
        {user && (
          <IconButton
            onClick={() => sidebarMenuStore.toggle()}
            data-testid="sidebar-icon"
            icon="i-ph:sidebar-simple-duotone"
            size="xl"
            title="Toggle Sidebar"
          />
        )}
        <TooltipProvider>
          <WithTooltip tooltip="Join Discord">
            <a
              href="https://www.replay.io/discord"
              className="p-2 rounded-lg bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] hover:text-[#5865F2] transition-all duration-200 hover:scale-105 group flex items-center gap-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="i-ph:discord-logo-fill text-2xl transition-transform duration-200 group-hover:scale-110" />
            </a>
          </WithTooltip>
        </TooltipProvider>
      </div>

      <div className="flex-1 flex justify-end mr-4">
        <div className="flex items-center">
          {chatStarted && <ClientOnly>{() => <HeaderActionButtons />}</ClientOnly>}
        </div>
      </div>

      <ClientOnly>
        {() => (
          <Suspense
            fallback={
              <div className="w-10 h-10 rounded-xl bg-bolt-elements-background-depth-2 animate-pulse border border-bolt-elements-borderColor" />
            }
          >
            <ClientAuth />
          </Suspense>
        )}
      </ClientOnly>
    </header>
  );
}
