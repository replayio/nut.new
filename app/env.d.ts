/// <reference types="@remix-run/cloudflare" />
/// <reference types="vite/client" />

interface WindowEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

declare global {
  interface Window {
    ENV: WindowEnv;
  }
}

interface NodeEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

declare namespace NodeJS {
  interface ProcessEnv extends NodeEnv {}
}

// Ensure this is treated as a module
export {};
