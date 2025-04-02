import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { Feedback } from './Feedback';
import { Suspense } from 'react';
import { ClientAuth } from '~/components/auth/ClientAuth';
import { DeployChatButton } from './DeployChatButton';

export function Header() {
  const chatStarted = useStore(chatStore.started);

  return (
    <header
      className={classNames('flex items-center justify-between p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chatStarted,
        'border-bolt-elements-borderColor': chatStarted,
      })}
    >
      <div className="flex flex-1 items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div data-testid="sidebar-icon" className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          <img src="/logo-styled.svg" alt="logo" className="w-[40px] inline-block rotate-90" />
        </a>
        <Feedback />
      </div>

      <div className="flex-1 flex items-center ">
        {chatStarted && (
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
        )}

        {chatStarted && (
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <DeployChatButton />}</ClientOnly>
          </span>
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
