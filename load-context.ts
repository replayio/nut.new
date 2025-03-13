// Vercel load context
declare module '@remix-run/node' {
  interface AppLoadContext {
    env: typeof process.env;
  }
}
