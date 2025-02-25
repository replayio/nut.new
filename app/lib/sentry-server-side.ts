/**
 * Server-side only Sentry implementation
 * This file is only loaded in Node.js environment and never included in browser bundles
 */

/* 
 * Safe import of Node.js-specific Sentry modules
 * This file is never imported in the browser
 */
let nodeSentry: any = null;

// Define interface for node-specific Sentry API
interface ServerSentryAPI {
  init: (options: any) => void;
  captureException: (error: unknown) => string | undefined;
  captureMessage: (message: string) => string | undefined;
}

// No-op implementation as fallback
const noopServerSentry: ServerSentryAPI = {
  init: () => {},
  captureException: (error) => {
    console.error('[Server Sentry Mock] Would capture exception:', error);
    return undefined;
  },
  captureMessage: (message) => {
    console.log('[Server Sentry Mock] Would capture message:', message);
    return undefined;
  },
};

export let serverSentry: ServerSentryAPI = noopServerSentry;
export let serverSentryHandleError = (error: unknown) => error;

export async function initServerSentry(options: Record<string, any> = {}): Promise<void> {
  try {
    /* 
     * Dynamic import of Node.js Sentry - this never gets bundled for browser
     * Using importModule pattern to avoid Vite static analysis
     */
    const importModule = new Function('modulePath', 'return import(modulePath)');
    nodeSentry = await importModule('@sentry/node');

    // Extract just the methods we need to avoid bundling the entire module
    serverSentry = {
      init: nodeSentry.init,
      captureException: nodeSentry.captureException,
      captureMessage: nodeSentry.captureMessage,
    };

    if ('sentryHandleError' in nodeSentry) {
      serverSentryHandleError = nodeSentry.sentryHandleError;
    }

    // Initialize with provided options
    serverSentry.init({
      dsn: options.dsn || process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      ...options,
    });

    console.log('[Server Sentry] Successfully initialized');
  } catch (error) {
    console.error('[Server Sentry] Failed to initialize:', error);
    serverSentry = noopServerSentry;
  }
} 