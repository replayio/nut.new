import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-side only Supabase client
export const getSupabaseClient = (context: any) => {
  const env = Object.hasOwn(context.cloudflare.env, 'SUPABASE_URL') ? context.cloudflare.env : process.env;

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY;

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
