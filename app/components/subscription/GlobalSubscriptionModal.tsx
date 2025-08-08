import { useStore } from '@nanostores/react';
import { subscriptionModalStore, closeSubscriptionModal } from '~/lib/stores/subscriptionModal';
import { SubscriptionModal } from './SubscriptionModal';

export function GlobalSubscriptionModal() {
  const { isOpen, currentTier } = useStore(subscriptionModalStore);

  return <SubscriptionModal isOpen={isOpen} onClose={closeSubscriptionModal} currentTier={currentTier} />;
}
