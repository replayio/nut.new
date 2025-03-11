import { createClient } from '@supabase/supabase-js';

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
          status: 'Pending' | 'Solved' | 'Unsolved';
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

/**
 * Determines whether Supabase should be used based on URL parameters and environment variables.
 * URL parameters take precedence over environment variables.
 */
export function shouldUseSupabase(): boolean {
  // Check URL parameters (client-side only)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const useSupabaseFromUrl = urlParams ? urlParams.get('supabase') === 'true' : false;

  // Check environment variables
  const useSupabaseFromEnv =
    typeof window !== 'undefined' ? window.ENV?.USE_SUPABASE === 'true' : process.env.USE_SUPABASE === 'true';

  // URL param takes precedence over environment variable
  const shouldUse = useSupabaseFromUrl || useSupabaseFromEnv;

  // Log for debugging
  if (typeof window !== 'undefined') {
    console.log('Supabase usage check:', {
      fromUrl: useSupabaseFromUrl,
      fromEnv: useSupabaseFromEnv,
      enabled: shouldUse,
    });
  }

  return shouldUse;
}

export function getSupabase() {
  // Determine execution environment and get appropriate variables
  if (process.browser) {
    supabaseUrl = window.ENV.SUPABASE_URL || '';
    supabaseAnonKey = window.ENV.SUPABASE_ANON_KEY || '';
  } else {
    // Node.js environment (development)
    supabaseUrl = process.env.SUPABASE_URL || '';
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  }

  // If neither URL param nor environment variable is set to true, log a warning
  if (!shouldUseSupabase()) {
    console.log('Supabase is not enabled. Set USE_SUPABASE=true or use ?supabase=true query parameter.');
  }

  // Log warning if environment variables are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Some features may not work properly.');
  }

  // Create and return the Supabase client
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Helper function to check if Supabase is properly initialized
export const isSupabaseInitialized = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
