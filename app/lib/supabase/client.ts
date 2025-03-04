import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    ENV?: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      problems: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string;
          status: 'pending' | 'solved' | 'unsolved';
          keywords: string[];
          repository_contents: Json;
          user_id: string | null;
          problem_comments: Database['public']['Tables']['problem_comments']['Row'][];
        };
        Insert: Omit<Database['public']['Tables']['problems']['Row'], 'created_at' | 'updated_at' | 'problem_comments'>;
        Update: Partial<Database['public']['Tables']['problems']['Insert']>;
      };
      problem_comments: {
        Row: {
          id: string;
          created_at: string;
          problem_id: string;
          content: string;
          username: string;
        };
        Insert: Omit<Database['public']['Tables']['problem_comments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['problem_comments']['Insert']>;
      };
    };
  };
}

// Create a function to get the Supabase client
const createSupabaseClient = () => {
  // Get Supabase URL and key from environment variables
  let supabaseUrl = '';
  let supabaseAnonKey = '';

  if (typeof window !== 'undefined' && window.ENV) {
    // Client-side environment - use variables from window.ENV
    supabaseUrl = window.ENV.SUPABASE_URL;
    supabaseAnonKey = window.ENV.SUPABASE_ANON_KEY;
  } else if (typeof process !== 'undefined' && process.env) {
    // Server-side environment
    supabaseUrl = process.env.SUPABASE_URL || '';
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  }

  // Only create the client if we have the required values
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Some features may not work properly.');
    // Return a dummy client that does nothing
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
        signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
        signOut: () => Promise.resolve({ error: null }),
      },
    } as any;
  }

  // Create the Supabase client
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

// Export the Supabase client
export const supabase = createSupabaseClient();

// Helper function to check if Supabase is properly initialized
export const isSupabaseInitialized = (): boolean => {
  // Check if window.ENV contains the required variables
  if (typeof window !== 'undefined' && window.ENV) {
    return Boolean(window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY);
  }
  // In server context, assume it's initialized if we have process.env
  if (typeof process !== 'undefined' && process.env) {
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  }
  return false;
};
