import { createClient } from '@supabase/supabase-js';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { MessageUserInfo } from '~/lib/persistence/message';
import { userStore } from '~/lib/stores/auth';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      feedback: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string | null;
          description: string;
          status: 'pending' | 'reviewed' | 'resolved';
          metadata: Json;
        };
        Insert: Omit<Database['public']['Tables']['feedback']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>;
      };
    };
  };
}

// Get Supabase URL and key from environment variables
let supabaseUrl = '';
let supabaseAnonKey = '';

// Add a singleton client instance
let supabaseClientInstance: ReturnType<typeof createClient<Database>> | null = null;

// Mock user override flag - should match the one in auth.ts
const USE_MOCK_USER = true;

const MOCK_USER: SupabaseUser = {
  id: 'edb004fa-ed84-4a32-a408-ee89232329fa',
  email: 'tester@test.com',
  email_confirmed_at: '2025-11-05T18:41:39.448059Z',
  created_at: '2025-11-05T18:41:39.442019Z',
  last_sign_in_at: '2025-11-18T15:37:49.825218626Z',
  updated_at: '2025-11-18T15:37:49.830586Z',
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  user_metadata: {
    email_verified: true,
  },
  aud: 'authenticated',
  role: 'authenticated',
  phone: '',
  is_anonymous: false,
  identities: [
    {
      id: 'edb004fa-ed84-4a32-a408-ee89232329fa',
      user_id: 'edb004fa-ed84-4a32-a408-ee89232329fa',
      identity_id: '4e95c4ba-a45a-4885-8145-c6b5b3ed8597',
      provider: 'email',
      created_at: '2025-11-05T18:41:39.445807Z',
      updated_at: '2025-11-05T18:41:39.445807Z',
      last_sign_in_at: '2025-11-05T18:41:39.445754Z',
      identity_data: {
        email: 'tester@test.com',
        email_verified: false,
        phone_verified: false,
        sub: 'edb004fa-ed84-4a32-a408-ee89232329fa',
      },
    } as any,
  ],
};

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  // Mock user override
  if (USE_MOCK_USER) {
    return MOCK_USER;
  }

  try {
    const {
      data: { user },
    } = await getSupabase().auth.getUser();

    return user;
  } catch (error) {
    // Session missing errors are normal when user is not logged in
    const isSessionMissingError =
      error instanceof Error &&
      (error.message?.includes('Auth session missing') || error.message?.includes('session_missing'));

    if (!isSessionMissingError) {
      console.error('Error getting current user:', error);
    }
    return null;
  }
}

export function getCurrentUserId(): string | null {
  // Mock user override
  if (USE_MOCK_USER) {
    return MOCK_USER.id;
  }

  const user = userStore.get();
  return user?.id || null;
}

export function getCurrentUserInfo(): MessageUserInfo | undefined {
  // Mock user override
  if (USE_MOCK_USER) {
    return {
      id: MOCK_USER.id,
      email: MOCK_USER.email || undefined,
      name: MOCK_USER.user_metadata?.name,
      avatar_url: MOCK_USER.user_metadata?.avatar_url,
    };
  }

  const user = userStore.get();
  if (!user) {
    return undefined;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata.name,
    avatar_url: user.user_metadata.avatar_url,
  };
}

/**
 * Check if user is admin from the cached userStore and database
 * Uses cached user to avoid unnecessary API calls
 */
export async function getNutIsAdmin(): Promise<boolean> {
  const user = userStore.get();

  if (!user) {
    return false;
  }

  const { data: profileData, error: profileError } = await getSupabase()
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return false;
  }

  return profileData?.is_admin || false;
}

/**
 * Checks if there is a currently authenticated user (from cached userStore)
 * This is synchronous and very fast as it reads from memory
 */
export function isAuthenticated(): boolean {
  // Mock user override
  if (USE_MOCK_USER) {
    return true;
  }

  const user = userStore.get();
  return user !== null;
}

export async function getCurrentAccessToken(): Promise<string | null> {
  // Mock user override - return a mock token
  if (USE_MOCK_USER) {
    return 'mock-access-token-for-testing';
  }

  try {
    const {
      data: { session },
    } = await getSupabase().auth.getSession();

    return session?.access_token || null;
  } catch (error) {
    // Session missing errors are normal when user is not logged in
    const isSessionMissingError =
      error instanceof Error &&
      (error.message?.includes('Auth session missing') || error.message?.includes('session_missing'));

    if (!isSessionMissingError) {
      console.error('Error getting access token:', error);
    }
    return null;
  }
}

export function getSupabase() {
  // If we already have an instance, return it
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  // Determine execution environment and get appropriate variables
  if (typeof window == 'object') {
    supabaseUrl = window.ENV.SUPABASE_URL || '';
    supabaseAnonKey = window.ENV.SUPABASE_ANON_KEY || '';
  } else {
    // Node.js environment (development)
    supabaseUrl = process.env.SUPABASE_URL || '';
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  }

  // Log warning if environment variables are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Some features may not work properly.');
  }

  // Create and cache the Supabase client with custom auth config
  supabaseClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Don't automatically refresh token - we'll handle this manually
      autoRefreshToken: true,
      // Persist session in localStorage
      persistSession: true,
      // Detect session in URL (for OAuth callbacks)
      detectSessionInUrl: true,
      // Don't throw errors for missing sessions
      storageKey: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
    },
    global: {
      headers: {
        'x-client-info': 'nut-app',
      },
    },
  });

  return supabaseClientInstance;
}
