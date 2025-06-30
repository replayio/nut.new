/**
 * <reference types="@remix-run/node" />
 * <reference types="vite/client" />
 */

interface WindowEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  INTERCOM_APP_ID: string;
  INTERCOM_ACCESS_TOKEN: string;
}

declare global {
  interface Window {
    ENV: WindowEnv;
  }
}

// Ensure this is treated as a module
export {};
