import { atom } from 'nanostores';
import { getSupabase } from '~/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { logStore } from './logs';
import { useEffect, useState } from 'react';
import { shouldUseSupabase, isAuthenticated } from '~/lib/supabase/client';
import { getUsername, saveUsername } from '~/lib/replay/Problems';

export const userStore = atom<User | null>(null);
export const sessionStore = atom<Session | null>(null);
export const isLoadingStore = atom<boolean>(true);

// Auth status store for both Supabase and non-Supabase modes
export const authStatusStore = {
  isLoggedIn: atom<boolean | null>(null),
  username: atom<string>(''),

  // Initialize auth status store
  async init() {
    if (shouldUseSupabase()) {
      // For Supabase, subscribe to the userStore
      userStore.listen((user) => {
        this.isLoggedIn.set(!!user);
      });

      // Check initial auth state
      const authenticated = await isAuthenticated();
      this.isLoggedIn.set(authenticated);
    } else {
      // For non-Supabase, always logged in
      this.isLoggedIn.set(true);

      // Get username from storage
      const storedUsername = getUsername();

      if (storedUsername) {
        this.username.set(storedUsername);
      }
    }
  },

  // Update username (only meaningful in non-Supabase mode)
  updateUsername(newUsername: string) {
    this.username.set(newUsername);

    if (!shouldUseSupabase()) {
      saveUsername(newUsername);
    }
  },
};

// Initialize auth status store
if (typeof window !== 'undefined') {
  authStatusStore.init();
}

export async function initializeAuth() {
  try {
    isLoadingStore.set(true);

    // Get initial session
    const {
      data: { session },
      error,
    } = await getSupabase().auth.getSession();

    if (error) {
      throw error;
    }

    if (session) {
      userStore.set(session.user);
      sessionStore.set(session);
      logStore.logSystem('Auth initialized with existing session', {
        userId: session.user.id,
        email: session.user.email,
      });
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange(async (event, session) => {
      logStore.logSystem('Auth state changed', { event });

      if (session) {
        userStore.set(session.user);
        sessionStore.set(session);
        logStore.logSystem('User authenticated', {
          userId: session.user.id,
          email: session.user.email,
        });
      } else {
        userStore.set(null);
        sessionStore.set(null);
        logStore.logSystem('User signed out');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  } catch (error) {
    logStore.logError('Failed to initialize auth', error);
    throw error;
  } finally {
    isLoadingStore.set(false);
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    isLoadingStore.set(true);

    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logStore.logError('Failed to sign in', error);
    throw error;
  } finally {
    isLoadingStore.set(false);
  }
}

export async function signUp(email: string, password: string) {
  try {
    isLoadingStore.set(true);

    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logStore.logError('Failed to sign up', error);
    throw error;
  } finally {
    isLoadingStore.set(false);
  }
}

export async function updatePassword(newPassword: string) {
  try {
    isLoadingStore.set(true);

    const { error } = await getSupabase().auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logStore.logError('Failed to update password', error);
    throw error;
  } finally {
    isLoadingStore.set(false);
  }
}

export async function signOut() {
  try {
    isLoadingStore.set(true);

    const { error } = await getSupabase().auth.signOut();

    if (error) {
      throw error;
    }
  } catch (error) {
    logStore.logError('Failed to sign out', error);
    throw error;
  } finally {
    isLoadingStore.set(false);
  }
}

// Keep the hook for backwards compatibility, but implement it using the store
export function useAuthStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(authStatusStore.isLoggedIn.get());
  const [username, setUsername] = useState<string>(authStatusStore.username.get());

  useEffect(() => {
    const unsubscribeIsLoggedIn = authStatusStore.isLoggedIn.listen(setIsLoggedIn);
    const unsubscribeUsername = authStatusStore.username.listen(setUsername);

    return () => {
      unsubscribeIsLoggedIn();
      unsubscribeUsername();
    };
  }, []);

  const updateUsername = (newUsername: string) => {
    authStatusStore.updateUsername(newUsername);
  };

  return { isLoggedIn, username, updateUsername };
}
