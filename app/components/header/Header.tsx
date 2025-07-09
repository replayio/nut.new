import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { Suspense } from 'react';
import { ClientAuth } from '~/components/auth/ClientAuth/ClientAuth';
import { DeployChatButton } from './DeployChat/DeployChatButton';
import { DownloadButton } from './DownloadButton';
import WithTooltip from '~/components/ui/Tooltip';
import { TooltipProvider } from '@radix-ui/react-tooltip';

export function Header() {
  const chatStarted = useStore(chatStore.started);

  return (
    <header
      className={classNames('flex items-center justify-between p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chatStarted,
        'border-bolt-elements-borderColor': chatStarted,
      })}
    >
      <div className="flex flex-1 items-center gap-4 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div data-testid="sidebar-icon" className="i-ph:sidebar-simple-duotone text-2xl" />
        <TooltipProvider>
          <WithTooltip tooltip="Join Discord">
            <a
              href="https://www.replay.io/discord"
              className="text-bolt-elements-accent underline hover:no-underline flex items-center gap-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="i-ph:discord-logo-fill text-2xl" />
            </a>
          </WithTooltip>
        </TooltipProvider>
      </div>

      <div className="flex-1 flex items-center ">
        {chatStarted && (
          <span className="px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
        )}

        {chatStarted && (
          <>
            <span className="flex-1 min-w-fit px-4 truncate text-center text-bolt-elements-textPrimary">
              <ClientOnly>{() => <DeployChatButton />}</ClientOnly>
            </span>
            <span className="flex-1 min-w-fit px-4 truncate text-center text-bolt-elements-textPrimary">
              <ClientOnly>{() => <DownloadButton />}</ClientOnly>
            </span>
          </>
        )}

        <div className="flex items-center  gap-4">
          {chatStarted && (
            <ClientOnly>
              {() => (
                <div className="mr-1">
                  <HeaderActionButtons />
                </div>
              )}
            </ClientOnly>
          )}
        </div>
      </div>

      <ClientOnly>
        {() => (
          <Suspense fallback={<div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />}>
            <ClientAuth />
          </Suspense>
        )}
      </ClientOnly>
    </header>
  );
}
