import { useEffect } from 'react';
import { syncSubscription } from '~/lib/stripe/client';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';

/**
 * Hook to periodically sync subscription status with Stripe
 * This ensures peanuts are always up to date, even if webhooks fail
 */
export function useSubscriptionSync() {
  const user = useStore(userStore);

  useEffect(() => {
    if (!user?.email || !user?.id) {
      return;
    }

    // Sync immediately on mount
    const syncNow = async () => {
      try {
        await syncSubscription(user.email!, user.id);
      } catch (error) {
        console.error('Failed to sync subscription on startup:', error);
      }
    };

    syncNow();

    // Set up periodic sync every 5 minutes
    const interval = setInterval(syncNow, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.email, user?.id]);
}
