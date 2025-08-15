import { json, type MetaFunction } from '~/lib/remix-types';
import { Suspense } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat/BaseChat';
import { Chat } from '~/components/chat/ChatComponent/Chat.client';
import { PageContainer } from '~/layout/PageContainer';
import { useSubscriptionSync } from '~/hooks/useSubscriptionSync';
import { useStripeCallback } from '~/hooks/useStripeCallback';
import { useUser } from '~/hooks/useUser';

export const meta: MetaFunction = () => {
  return [{ title: 'Nut' }];
};

export const loader = () => json({});

const Nothing = () => null;

export default function Index() {
  // Sync subscription status periodically
  useSubscriptionSync();

  // Handle Stripe success/cancel callbacks
  useStripeCallback();

  // Listen for changes to user and identify in analytics/LogRocket
  useUser();

  return (
    <PageContainer>
      <Suspense fallback={<Nothing />}>
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </Suspense>
    </PageContainer>
  );
}
