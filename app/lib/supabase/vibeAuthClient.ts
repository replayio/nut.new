import { createClient } from '@supabase/supabase-js';

// Vibe Auth Supabase configuration
// This is a separate Supabase instance used for OAuth on behalf of the iframe
const VIBE_AUTH_SUPABASE_URL = import.meta.env.VITE_AUTH_SUPABASE_URL;
const VIBE_AUTH_SUPABASE_ANON_KEY = import.meta.env.VITE_AUTH_SUPABASE_ANON_KEY;

if (!VIBE_AUTH_SUPABASE_URL || !VIBE_AUTH_SUPABASE_ANON_KEY) {
  throw new Error('VIBE_AUTH_SUPABASE_URL or VIBE_AUTH_SUPABASE_ANON_KEY is not set');
}

// Create and export the vibe auth Supabase client
export const vibeAuthSupabase = createClient(VIBE_AUTH_SUPABASE_URL, VIBE_AUTH_SUPABASE_ANON_KEY);
