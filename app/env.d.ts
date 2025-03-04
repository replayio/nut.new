/**
 * Remix and Vite types
 * @reference types="@remix-run/cloudflare"
 * @reference types="vite/client"
 */

interface NodeEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

declare namespace NodeJS {
  interface ProcessEnv extends NodeEnv {}
}

// Ensure this is treated as a module
export {};

interface Window {
  ENV: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
  };
}
