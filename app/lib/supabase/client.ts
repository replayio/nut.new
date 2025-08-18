import { createClient } from '@supabase/supabase-js';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
          repository_id: string;
          user_id: string | null;
          problem_comments: Database['public']['Tables']['problem_comments']['Row'][];
          solution: Json;
          repository_contents_path: string | null;
          prompt_path: string | null;
          solution_path: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['problems']['Row'],
          'created_at' | 'updated_at' | 'problem_comments' | 'solution'
        >;
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

// Add a singleton client instance
let supabaseClientInstance: ReturnType<typeof createClient<Database>> | null = null;

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  try {
    const {
      data: { user },
    } = await getSupabase().auth.getUser();

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

export async function getNutIsAdmin(): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const { data: profileData, error: profileError } = await getSupabase()
    .from('profiles')
    .select('is_admin')
    .eq('id', user?.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return false;
  }

  return profileData?.is_admin || false;
}

/**
 * Checks if there is a currently authenticated user.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

export async function getCurrentAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await getSupabase().auth.getSession();

    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting access token:', error);
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

  // Create and cache the Supabase client
  supabaseClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);

  return supabaseClientInstance;
}
