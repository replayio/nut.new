import { createClient } from '@supabase/supabase-js';

// Vibe Auth Supabase configuration
// This is a separate Supabase instance used for OAuth on behalf of the iframe
const VIBE_AUTH_SUPABASE_URL = 'https://yhvkzdjcgakqqmkcfhgr.supabase.co';
const VIBE_AUTH_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlodmt6ZGpjZ2FrcXFta2NmaGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzQ1MTAsImV4cCI6MjA3MDI1MDUxMH0.BogJ3wm7oEEu3jACqngfi5fXT13vv37QcV-WJLBb5hs';

// Create and export the vibe auth Supabase client
export const vibeAuthSupabase = createClient(VIBE_AUTH_SUPABASE_URL, VIBE_AUTH_SUPABASE_ANON_KEY);
