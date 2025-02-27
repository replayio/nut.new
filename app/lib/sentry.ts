/**
 * Conditional Sentry implementation
 * In development: Uses a mock implementation that logs to console
 * In production: Uses the real Sentry implementation
 */

// Function to check if we're in development environment
const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';

/**
 * Error handler function - wraps Sentry's error handling
 * In development, it just logs the error and returns it
 * In production, it sends the error to Sentry
 */
export function sentryHandleError(error: Error): Error {
  if (isDevelopment()) {
    // In development, just log the error
    console.error('[DEV MODE - Sentry not loaded]:', error);
    return error;
  }

  try {
    /**
     * In production, dynamically import and use Sentry
     * This code only executes in production, so the import will never run in dev
     */
    import('@sentry/remix')
      .then((sentry) => {
        sentry.captureException(error);
      })
      .catch((e) => {
        console.error('Failed to load Sentry:', e);
      });
  } catch (e) {
    console.error('Error while capturing exception:', e);
  }

  return error;
}
