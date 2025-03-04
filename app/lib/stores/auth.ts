import { atom } from 'nanostores';
import type { User, Session } from '@supabase/supabase-js';
import { logStore } from './logs';

export const userStore = atom<User | null>(null);
export const sessionStore = atom<Session | null>(null);

// Define types for API responses
interface AuthResponse {
  session?: Session;
  user?: User;
  error?: string;
  message?: string;
  success?: boolean;
}

// Initialize auth by fetching current session
export async function initializeAuth() {
  try {
    const response = await fetch('/auth/session');
    const data = (await response.json()) as AuthResponse;

    if (data.error) {
      throw new Error(data.error);
    }

    if (data.session) {
      sessionStore.set(data.session);
      userStore.set(data.user || null);
      logStore.logSystem('Auth initialized with existing session', {
        userId: data.user?.id,
        email: data.user?.email,
      });
    }

    // No need to set up listeners as we'll update the store on sign in/out
    return () => {};
  } catch (error) {
    logStore.logError('Failed to initialize auth', error);
    throw error;
  }
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  try {
    const response = await fetch('/auth/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as AuthResponse;

    if (data.error) {
      throw new Error(data.error);
    }

    // Update stores with new session
    sessionStore.set(data.session || null);
    userStore.set(data.user || null);

    logStore.logSystem('User signed in', {
      userId: data.user?.id,
      email: data.user?.email,
    });

    return data;
  } catch (error) {
    logStore.logError('Sign in failed', error);
    throw error;
  }
}

// Sign up with email and password
export async function signUp(email: string, password: string) {
  try {
    const response = await fetch('/auth/sign-up', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as AuthResponse;

    if (data.error) {
      throw new Error(data.error);
    }

    // If sign up immediately returns a session, update stores
    if (data.session) {
      sessionStore.set(data.session);
      userStore.set(data.user || null);

      logStore.logSystem('User signed up and authenticated', {
        userId: data.user?.id,
        email: data.user?.email,
      });
    } else {
      logStore.logSystem('User signed up, confirmation required', {
        email,
      });
    }

    return data;
  } catch (error) {
    logStore.logError('Sign up failed', error);
    throw error;
  }
}

// Sign out
export async function signOut() {
  try {
    const response = await fetch('/auth/sign-out', {
      method: 'POST',
    });

    const data = (await response.json()) as AuthResponse;

    if (data.error) {
      throw new Error(data.error);
    }

    // Clear stores
    sessionStore.set(null);
    userStore.set(null);

    logStore.logSystem('User signed out');

    return data;
  } catch (error) {
    logStore.logError('Sign out failed', error);
    throw error;
  }
}
