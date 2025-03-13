import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { Feedback } from './Feedback';
import { Suspense } from 'react';
import { ClientAuth } from '~/components/auth/ClientAuth';
import { shouldUseSupabase } from '~/lib/supabase/client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center justify-between p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex flex-1 items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          <img src="/logo-styled.svg" alt="logo" className="w-[40px] inline-block rotate-90" />
        </a>
        <Feedback />
      </div>

      <div className="flex-1 flex items-center ">
        {chat.started && (
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
        )}

        <div className="flex items-center  gap-4">
          {chat.started && (
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

      {shouldUseSupabase() && (
        <ClientOnly>
          {() => (
            <Suspense fallback={<div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />}>
              <ClientAuth />
            </Suspense>
          )}
        </ClientOnly>
      )}
    </header>
  );
}
