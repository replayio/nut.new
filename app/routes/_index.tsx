import { json, type MetaFunction } from '~/lib/remix-types';
import { Suspense } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Nut' }];
};

export const loader = () => json({});

const Nothing = () => null;

export default function Index() {
  return (
    <div className="flex flex-col h-full min-h-screen w-full bg-bolt-elements-background-depth-1 dark:bg-black">
      <BackgroundRays />
      <Header />
      <Suspense fallback={<Nothing />}>
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </Suspense>
    </div>
  );
}
