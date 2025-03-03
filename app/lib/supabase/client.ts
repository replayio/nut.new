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

// Get Supabase URL and key from environment variables
let supabaseUrl = '';
let supabaseAnonKey = '';

// Determine execution environment and get appropriate variables
if (typeof process === 'undefined') {
  // Client-side environment
  if (typeof window !== 'undefined' && window.ENV) {
    supabaseUrl = window.ENV.SUPABASE_URL || '';
    supabaseAnonKey = window.ENV.SUPABASE_ANON_KEY || '';
  }
} else {
  // Node.js or Cloudflare environment
  supabaseUrl = process.env.SUPABASE_URL || '';
  supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
}

// Log warning if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Some features may not work properly.');
}

// Create the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper function to check if Supabase is properly initialized
export const isSupabaseInitialized = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
