/**
 * Conditional OpenTelemetry implementation
 * In development: Uses mock implementations that do nothing
 * In production: Uses the real OpenTelemetry implementation
 */

import type { AppLoadContext } from '@remix-run/cloudflare';

// Function to check if we're in development environment
const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';

// Types to match the original implementation
type Attributes = Record<string, any>;

type SpanOptions = {
  name: string;
  attrs?: Attributes;
};

// Mock implementations for development
const mockImplementations = {
  ensureOpenTelemetryInitialized: (_context: AppLoadContext) => {
    console.log('[DEV MODE - OpenTelemetry not loaded]: Skipping initialization');
  },

  wrapWithSpan: <Args extends any[], T>(
    opts: SpanOptions,
    fn: (...args: Args) => Promise<T>,
  ): ((...args: Args) => Promise<T>) => {
    // In development, just pass through the function without tracing
    return fn;
  },

  getCurrentSpan: () => {
    return null;
  },
};

// Using a let variable so we can cache the imports in production
let otelModule: any = null;

// Helper to load the module once
const getOtelModule = async () => {
  if (!otelModule && !isDevelopment()) {
    try {
      otelModule = await import('./otel');
    } catch (e) {
      console.error('Error loading OpenTelemetry:', e);

      // Return null to indicate failure
      return null;
    }
  }

  return otelModule;
};

/**
 * Ensure OpenTelemetry is initialized
 * In development: Does nothing
 * In production: Initializes OpenTelemetry
 */
export function ensureOpenTelemetryInitialized(context: AppLoadContext): void {
  if (isDevelopment()) {
    // Use mock in development
    mockImplementations.ensureOpenTelemetryInitialized(context);
    return;
  }

  // In production, initialize (this will happen asynchronously)
  if (otelModule) {
    // If module is already loaded, use it directly
    otelModule.ensureOpenTelemetryInitialized(context);
  } else {
    // Otherwise trigger the async load and initialize when ready
    getOtelModule()
      .then((module) => {
        if (module) {
          module.ensureOpenTelemetryInitialized(context);
        }
      })
      .catch((e) => {
        console.error('Failed to initialize OpenTelemetry:', e);
      });
  }
}

/**
 * Wrap a function with a span for tracing
 * In development: Just returns the original function
 * In production: Wraps the function with a span
 */
export function wrapWithSpan<Args extends any[], T>(
  opts: SpanOptions,
  fn: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<T> {
  if (isDevelopment()) {
    // In development, just pass through without tracing
    return fn;
  }

  // In production, create a wrapper function
  return (...args: Args) => {
    // If module is already loaded, use it directly
    if (otelModule) {
      return otelModule.wrapWithSpan(opts, fn)(...args);
    }

    // Otherwise trigger the async load for future calls
    getOtelModule()
      .then(() => {
        // Module will be available for future calls
      })
      .catch((e) => {
        console.error('Failed to load OpenTelemetry module:', e);
      });

    // For the current call, just use the function directly
    return fn(...args);
  };
}

/**
 * Get the current span
 * In development: Returns null
 * In production: Returns the current span from OpenTelemetry
 */
export function getCurrentSpan(): any {
  if (isDevelopment()) {
    // In development, return null
    return null;
  }

  // If module is already loaded, use it directly
  if (otelModule) {
    return otelModule.getCurrentSpan();
  }

  // Otherwise trigger the async load for future calls
  getOtelModule()
    .then(() => {
      // Module will be available for future calls
    })
    .catch((e) => {
      console.error('Failed to load OpenTelemetry module:', e);
    });

  // For the current call, return null
  return null;
}
