import { useEffect } from 'react';
import { refreshPeanutsStore } from '~/lib/stores/peanuts';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';

/**
 * Hook to periodically refresh peanuts store
 * Webhooks handle all Stripe syncing automatically, we just refresh local state
 */
export function useSubscriptionSync() {
  const user = useStore(userStore);

  useEffect(() => {
    if (!user?.email || !user?.id) {
      return;
    }

    // Refresh peanuts on mount
    const refreshNow = async () => {
      try {
        await refreshPeanutsStore();
      } catch (error) {
        console.error('Failed to refresh peanuts on startup:', error);
      }
    };

    refreshNow();

    // Set up periodic refresh every 2 minutes (webhooks handle the heavy lifting)
    const interval = setInterval(refreshNow, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.email, user?.id]);
}
