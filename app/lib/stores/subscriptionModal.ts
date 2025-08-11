import { atom } from 'nanostores';
import type { SubscriptionTier } from '~/lib/stripe/client';

interface SubscriptionModalState {
  isOpen: boolean;
  currentTier?: SubscriptionTier;
}

export const subscriptionModalStore = atom<SubscriptionModalState>({
  isOpen: false,
  currentTier: undefined,
});

export const openSubscriptionModal = (currentTier?: SubscriptionTier) => {
  subscriptionModalStore.set({ isOpen: true, currentTier });
};

export const closeSubscriptionModal = () => {
  subscriptionModalStore.set({ isOpen: false, currentTier: undefined });
};
