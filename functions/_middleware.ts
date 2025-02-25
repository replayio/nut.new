/**
 * Middleware implementation using our Sentry wrapper
 */
import { initSentry, sentry } from '~/lib/sentry-wrapper';

export const onRequest = [
  async (context: any) => {
    // Initialize Sentry if possible
    if (context.env && context.env.SENTRY_DSN) {
      await initSentry({
        dsn: context.env.SENTRY_DSN,
        initServer: true,
        // Additional middleware-specific configuration can go here
      }).catch((err) => {
        console.error('[Middleware] Sentry initialization failed:', err);
      });
    }

    try {
      // Continue to the next handler
      return await context.next();
    } catch (error) {
      // Capture any errors that occur
      sentry.captureException(error);
      throw error;
    }
  },
]; 