import { json, type MetaFunction } from '~/lib/remix-types';
import { Suspense } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat/BaseChat';
import { Chat } from '~/components/chat/ChatComponent/Chat.client';
import { PageContainer } from '~/layout/PageContainer';
import { useUser } from '~/hooks/useUser';
// import { checkSubscriptionStatus, type Subscription } from '~/lib/stripe/client';
import { useEffect } from 'react';
import { subscriptionStore } from '~/lib/stores/subscriptionStatus';
import { database } from '~/lib/persistence/apps';
import { buildAccessStore } from '~/lib/stores/buildAccess';
import { type StripeStatus } from '~/lib/stripe/client';

const MOCK_STRIPE_STATUS: StripeStatus = {
  hasSubscription: true,
  subscription: {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: '2025-12-05T18:43:06.000Z',
    currentPeriodStart: '2025-11-05T18:43:06.000Z',
    id: 'sub_1SQBfkEfKucJn4vk7Xjdl5Ti',
    status: 'active',
    tier: 'builder',
  },
};

export const meta: MetaFunction = () => {
  return [{ title: 'Nut' }];
};

export const loader = () => json({});

const Nothing = () => null;

export default function Index() {
  const user = useUser();

  useEffect(() => {
    const fetchAccess = async () => {
      if (user) {
        const stripeStatus = MOCK_STRIPE_STATUS;

        const list = await database.getAllAppEntries();

        buildAccessStore.setAccess(stripeStatus.subscription!, list.length ?? 0);
        subscriptionStore.setSubscription(stripeStatus);
      } else {
        // Clear subscription when user signs out
        subscriptionStore.setSubscription({ hasSubscription: false, subscription: null });
        buildAccessStore.clearAccess();
      }
    };

    fetchAccess();
  }, [user]);

  return (
    <PageContainer>
      <Suspense fallback={<Nothing />}>
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </Suspense>
    </PageContainer>
  );
}
