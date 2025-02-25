/**
 * Sentry wrapper to handle module system compatibility issues
 * 
 * This module provides a clean API for Sentry functionality
 * while isolating the direct imports to avoid OpenTelemetry issues.
 */

// Define interfaces for the Sentry functionality we need
interface SentryAPI {
  init: (options: any) => void;
  captureException: (error: unknown) => string | undefined;
  captureMessage: (message: string) => string | undefined;
}

// Default no-op implementation
const noopSentry: SentryAPI = {
  init: () => {},
  captureException: (err) => { 
    console.error('[Sentry Mock] Would capture exception:', err);
    return undefined;
  },
  captureMessage: (message) => {
    console.log('[Sentry Mock] Would capture message:', message);
    return undefined;
  },
};

let sentryImpl: SentryAPI = noopSentry;
let sentryHandleErrorImpl = (error: unknown) => error;

// Detect environment
const isServer = typeof window === 'undefined';
const isBrowser = !isServer;

// Load Sentry in a way that won't break during SSR
let isSentryInitialized = false;

export async function initSentry(options: Record<string, any> = {}) {
  if (isSentryInitialized) {
    return;
  }
  
  try {
    if (isBrowser) {
      // BROWSER ONLY - dynamic import to avoid Node.js code
      const sentryRemix = await import('@sentry/remix');
      
      sentryImpl = {
        init: sentryRemix.init,
        captureException: sentryRemix.captureException,
        captureMessage: sentryRemix.captureMessage,
      };
      
      if ('sentryHandleError' in sentryRemix) {
        /* 
         * We're ignoring the type error here because we know the browser 
         * implementation works differently than the type definition suggests
         */
        // @ts-ignore - sentryHandleError exists at runtime but not in types
        sentryHandleErrorImpl = sentryRemix.sentryHandleError;
      }
      
      sentryImpl.init({
        dsn: options.dsn || process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
        ...options,
      });
      
      console.log('[Sentry] Initialized in browser mode');
    } 
    else if (options.initServer === true) {
      /* 
       * SERVER ONLY - separate implementation to avoid Node.js imports in browser
       * Dynamic import using String concatenation to prevent static analysis
       * by bundlers, ensuring this code path is never included in browser builds
       */
      try {
        // This import is dynamically constructed to prevent bundling for browser
        const modulePath = ['./sentry', '-server-side'].join('');
        const serverSide = await import(/* @vite-ignore */ modulePath);
        await serverSide.initServerSentry(options);
        sentryImpl = serverSide.serverSentry;
        sentryHandleErrorImpl = serverSide.serverSentryHandleError;
        console.log('[Sentry] Initialized in server mode');
      } catch (serverError) {
        console.error('[Sentry] Server initialization error:', serverError);
      }
    }
    
    isSentryInitialized = true;
  } catch (error) {
    console.error('[Sentry] Initialization error:', error);
  }
}

// Export a stable API regardless of whether Sentry is actually loaded
export const sentry = {
  init: (options: any) => sentryImpl.init(options),
  captureException: (error: unknown) => sentryImpl.captureException(error),
  captureMessage: (message: string) => sentryImpl.captureMessage(message),
};

// For compatibility with existing code
export const sentryLegacy = sentry;

export const sentryHandleError = sentryHandleErrorImpl; 