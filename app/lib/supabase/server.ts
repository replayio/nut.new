import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-side only Supabase client
export const getSupabaseClient = (serverEnv: any) => {
  const supabaseUrl = serverEnv.SUPABASE_URL;
  const supabaseAnonKey = serverEnv.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
