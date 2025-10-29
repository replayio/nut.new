import { atom } from 'nanostores';
import { getNutIsAdmin } from '~/lib/supabase/client';
import { userStore } from './auth';
import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

// Store for admin status
export const isAdminStore = atom<boolean>(false);

export function useAdminStatus() {
  const isAdmin = useStore(isAdminStore);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      refreshAdminStatus();
    }
  }, []);

  return {
    isAdmin,
  };
}

// Initialize the user stores
export async function initializeUserStores() {
  return;
  /*
  try {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return undefined;
    }

    // Initialize with current values
    const isAdmin = await getNutIsAdmin();
    isAdminStore.set(isAdmin);

    // Subscribe to user changes to update admin status
    return userStore.subscribe(async (user) => {
      if (user) {
        // When user changes, reverify admin status
        const isAdmin = await getNutIsAdmin();
        isAdminStore.set(isAdmin);
      } else {
        // Reset when logged out
        isAdminStore.set(false);
      }
    });
  } catch (error) {
    console.error('Failed to initialize user stores', error);
    return undefined;
  }
  */
}

/*
 * Function to trigger a re-verification of admin status
 * This can be called manually if needed
 */
async function refreshAdminStatus(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const isAdmin = await getNutIsAdmin();
    isAdminStore.set(isAdmin);

    return isAdmin;
  } catch (error) {
    console.error('Failed to refresh admin status', error);
    return isAdminStore.get();
  }
}
