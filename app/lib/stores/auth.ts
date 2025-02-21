import { atom } from 'nanostores';
import { supabase } from '~/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { logStore } from './logs';

export const userStore = atom<User | null>(null);
export const sessionStore = atom<Session | null>(null);

export async function initializeAuth() {
  try {
    // Get initial session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    
    if (error) { throw error; }

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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) { throw error; }

    return data;
  } catch (error) {
    logStore.logError('Failed to sign in', error);
    throw error;
  }
}

export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) { throw error; }

    return data;
  } catch (error) {
    logStore.logError('Failed to sign up', error);
    throw error;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) { throw error; }
  } catch (error) {
    logStore.logError('Failed to sign out', error);
    throw error;
  }
} 