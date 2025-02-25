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
  captureException: () => { 
    console.error('[Sentry Mock] Would capture exception:', arguments[0]);
    return undefined;
  },
  captureMessage: () => {
    console.log('[Sentry Mock] Would capture message:', arguments[0]);
    return undefined;
  },
};

let sentryImpl: SentryAPI = noopSentry;
let sentryHandleErrorImpl = (error: unknown) => error;

// Load Sentry in a way that won't break during server-side rendering
let isSentryInitialized = false;

export async function initSentry(options: Record<string, any> = {}) {
  if (isSentryInitialized) return;
  
  try {
    // Only initialize in browser environment or with specific server flag
    const isServer = typeof window === 'undefined';
    const shouldInitServer = options.initServer === true;
    
    if (!isServer || shouldInitServer) {
      // Dynamically import Sentry to avoid SSR module issues
      try {
        // Use dynamic import which is more forgiving with module systems
        const SentryModule = isServer 
          ? await import('@sentry/node')
          : await import('@sentry/remix');
        
        sentryImpl = SentryModule;
        
        if (SentryModule.sentryHandleError) {
          sentryHandleErrorImpl = SentryModule.sentryHandleError;
        }
        
        // Initialize with provided options
        sentryImpl.init({
          dsn: process.env.SENTRY_DSN,
          tracesSampleRate: 1.0,
          ...options,
        });
        
        isSentryInitialized = true;
        console.log(`[Sentry] Initialized in ${isServer ? 'server' : 'browser'} mode`);
      } catch (importError) {
        console.error('[Sentry] Failed to import:', importError);
      }
    }
  } catch (error) {
    console.error('[Sentry] Initialization error:', error);
  }
}

// Export a stable API regardless of whether Sentry is actually loaded
export const Sentry = {
  init: (options: any) => sentryImpl.init(options),
  captureException: (error: unknown) => sentryImpl.captureException(error),
  captureMessage: (message: string) => sentryImpl.captureMessage(message),
};

export const sentryHandleError = sentryHandleErrorImpl; 