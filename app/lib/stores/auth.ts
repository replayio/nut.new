import { atom } from 'nanostores';
import { getSupabase } from '~/lib/supabase/client';
import { type User, type Session, AuthError } from '@supabase/supabase-js';
import { logStore } from './logs';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '~/lib/supabase/client';
import { pingTelemetry } from '~/lib/hooks/pingTelemetry';

export const userStore = atom<User | null>(null);
export const sessionStore = atom<Session | null>(null);
export const isLoadingStore = atom<boolean>(true);

export const authStatusStore = {
  isLoggedIn: atom<boolean | null>(null),

  // Initialize auth status store
  async init() {
    // subscribe to the userStore
    userStore.listen((user) => {
      this.isLoggedIn.set(!!user);
    });

    // Check initial auth state
    const authenticated = await isAuthenticated();
    this.isLoggedIn.set(authenticated);
  },
};

export async function initializeAuth() {
  try {
    authStatusStore.init();

    isLoadingStore.set(true);

    // We've seen Supabase Auth hang when there are multiple tabs open.
    // Handle this by using a timeout to ensure we don't wait indefinitely.
    const timeoutPromise = new Promise<{ data: { session: Session | null }; error?: AuthError }>((resolve) => {
      setTimeout(() => {
        resolve({
          data: { session: null },
          error: new AuthError('Timed out initializing auth'),
        });
      }, 5000);
    });

    const authRes = await Promise.race([getSupabase().auth.getSession(), timeoutPromise]);

    // Get initial session
    const {
      data: { session },
      error,
    } = authRes;

    if (error) {
      pingTelemetry('Auth.Error', { message: error.message });
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

export function useAuthStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(authStatusStore.isLoggedIn.get());

  useEffect(() => {
    const unsubscribeIsLoggedIn = authStatusStore.isLoggedIn.listen(setIsLoggedIn);

    return () => {
      unsubscribeIsLoggedIn();
    };
  }, []);

  return { isLoggedIn };
}
