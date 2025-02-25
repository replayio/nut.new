/**
 * OpenTelemetry wrapper for Node.js
 *
 * This module provides a clean API for OpenTelemetry functionality
 * with minimum dependencies to avoid module loading issues.
 */

import type { AppLoadContext } from '@remix-run/node';

// Use createRequire to load modules dynamically and avoid ES module import issues
import { createRequire } from 'module';

// Types needed for our API
export type Tracer = {
  startSpan: (name: string, options?: any) => Span;
};

export type Span = {
  setAttribute: (key: string, value: any) => void;
  setAttributes: (attributes: any) => void;
  end: () => void;
  recordException: (exception: any) => void;
  setStatus: (status: any) => void;
};

export type Attributes = Record<string, string | number | boolean | Array<string | number | boolean>>;

// Re-export SpanStatusCode enum for consumers of this module
export enum SpanStatusCode {
  OK = 0,
  ERROR = 1,
  UNSET = 2,
}

// Stub implementations for when OpenTelemetry is not available
const stubSpan: Span = {
  setAttribute: (_key: string, _value: any) => {},
  setAttributes: (_attributes: any) => {},
  end: () => {},
  recordException: (_exception: any) => {},
  setStatus: (_status: any) => {},
};

const stubTracer: Tracer = {
  startSpan: (_name: string, _options?: any) => {
    console.debug('[OpenTelemetry Stub] Would start span:', _name);
    return stubSpan;
  },
};

// Get a require function that works in ESM context
const nodeRequire = createRequire(import.meta.url);

// Dynamically loaded modules
let otelApi: any = null;
let otelCore: any = null;
let otelSdk: any = null;
let otelResources: any = null;
let otelSemanticConventions: any = null;
let otelContextAsyncHooks: any = null;
let actualTracer: any = null;

// Semaphore implementation for concurrency limiting in the exporter
class Semaphore {
  private _permits: number;
  private _tasks: (() => void)[] = [];

  constructor(permits: number) {
    this._permits = permits;
  }

  async acquire(): Promise<void> {
    if (this._permits > 0) {
      this._permits -= 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this._tasks.push(resolve);
    });
  }

  release(): void {
    this._permits += 1;

    const nextTask = this._tasks.shift();

    if (nextTask) {
      this._permits -= 1;
      nextTask();
    }
  }
}

// Default options for the OTLP exporter
const defaultOptions = {
  url: 'https://api.honeycomb.io/v1/traces',
  concurrencyLimit: 5,
  timeoutMillis: 5000,
  headers: {},
  retryCount: 3,
  retryIntervalMillis: 100,
} as const;

// OTLP exporter implementation with fallbacks for when modules aren't available
export class OTLPExporter {
  private readonly _config: any;
  private _shutdownOnce = false;
  private _activeExports: Promise<void>[] = [];
  private _semaphore: Semaphore;

  constructor(config: any) {
    this._config = {
      ...config,
      headers: { ...config.headers },
    };
    this._semaphore = new Semaphore(this._config.concurrencyLimit || defaultOptions.concurrencyLimit);
  }

  export(spans: any[], resultCallback: (result: any) => void): void {
    if (!otelApi || !otelCore) {
      resultCallback({ code: 0 });

      return;
    }

    if (this._shutdownOnce) {
      console.warn('Exporter has been shutdown, skipping export.');
      resultCallback({ code: otelCore.ExportResultCode.FAILED });

      return;
    }

    const exportPromise = this._export(spans);
    this._activeExports.push(exportPromise);

    // Clean up completed exports
    exportPromise
      .then(() => {
        resultCallback({ code: otelCore.ExportResultCode.SUCCESS });
      })
      .catch((error) => {
        console.warn('OTLPSpanExporter export failed:', error);
        resultCallback({ code: otelCore.ExportResultCode.FAILED, error });
      })
      .finally(() => {
        const index = this._activeExports.indexOf(exportPromise);

        if (index !== -1) {
          this._activeExports.splice(index, 1);
        }
      });
  }

  private async _export(spans: any[]): Promise<void> {
    if (spans.length === 0) {
      return;
    }

    try {
      // Dynamically load required functionality
      const otlpTransformer = await import('@opentelemetry/otlp-transformer');
      const exportMessage = otlpTransformer.createExportTraceServiceRequest(spans, {
        useHex: true,
        useLongBits: false,
      });

      const exportPayload = JSON.stringify(exportMessage);

      let currentRetry = 0;

      const { retryCount = defaultOptions.retryCount, retryIntervalMillis = defaultOptions.retryIntervalMillis } =
        this._config;

      while (currentRetry < retryCount!) {
        try {
          await this._semaphore.acquire();

          try {
            await this._send(exportPayload);
            return;
          } finally {
            this._semaphore.release();
          }
        } catch (error) {
          currentRetry++;

          if (currentRetry === retryCount) {
            const otlpBase = await import('@opentelemetry/otlp-exporter-base');
            throw new otlpBase.OTLPExporterError(
              `Failed to export spans after ${retryCount} retries. Most recent error is ${error instanceof Error ? error.toString() : error}`,
            );
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryIntervalMillis * currentRetry));
        }
      }
    } catch (error) {
      console.error('Error in _export:', error);
      throw error;
    }
  }

  private async _send(payload: string): Promise<void> {
    const {
      url = defaultOptions.url,
      timeoutMillis = defaultOptions.timeoutMillis,
      headers = defaultOptions.headers,
    } = this._config;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMillis);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: payload,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async shutdown(): Promise<void> {
    if (!otelApi) {
      return Promise.resolve();
    }

    if (this._shutdownOnce) {
      console.warn('Exporter has already been shutdown.');

      return Promise.resolve();
    }

    this._shutdownOnce = true;

    return this.forceFlush();
  }

  async forceFlush(): Promise<void> {
    if (!otelApi) {
      return Promise.resolve();
    }

    return Promise.all(this._activeExports).then(() => {});
  }
}

/**
 * Initialize OpenTelemetry with minimal dependencies
 */
export async function initOpenTelemetry(context?: AppLoadContext): Promise<void> {
  if (otelApi) {
    return;
  }

  try {
    // Only proceed in server environments
    if (typeof window !== 'undefined') {
      return;
    }

    try {
      // Load OpenTelemetry modules with require to avoid ESM/CJS issues
      otelApi = nodeRequire('@opentelemetry/api');
      console.log('[OpenTelemetry] Successfully loaded API');

      if (!context) {
        console.info('[OpenTelemetry] No context provided, using API only');
        return;
      }

      try {
        otelCore = nodeRequire('@opentelemetry/core');
        otelSdk = nodeRequire('@opentelemetry/sdk-trace-base');
        otelResources = nodeRequire('@opentelemetry/resources');
        otelSemanticConventions = nodeRequire('@opentelemetry/semantic-conventions');
        
        // This is the problematic module, but we'll load it with require
        otelContextAsyncHooks = nodeRequire('@opentelemetry/context-async-hooks');
        
        console.log('[OpenTelemetry] Successfully loaded SDK modules');
        
        // If we have loaded the core modules, initialize the tracer
        actualTracer = createActualTracer(context);
      } catch (error) {
        console.warn(
          '[OpenTelemetry] Failed to load one or more SDK modules, some functionality will be limited:',
          error,
        );
      }
    } catch (error) {
      console.warn('[OpenTelemetry] Failed to load API, using stub:', error);
    }
  } catch (error) {
    console.error('[OpenTelemetry] Error:', error);
  }
}

/**
 * Creates a real tracer with the appropriate configuration if all modules are available
 */
function createActualTracer(appContext: AppLoadContext): any {
  try {
    if (!otelApi || !otelSdk || !otelResources || !otelSemanticConventions || !otelContextAsyncHooks) {
      return undefined;
    }

    // @ts-ignore - we're dynamically checking for Cloudflare environment
    const honeycombApiKey = appContext.cloudflare?.env?.HONEYCOMB_API_KEY;
    
    // @ts-ignore - we're dynamically checking for Cloudflare environment
    const honeycombDataset = appContext.cloudflare?.env?.HONEYCOMB_DATASET;

    if (!honeycombApiKey || !honeycombDataset) {
      console.warn('OpenTelemetry initialization skipped: HONEYCOMB_API_KEY and/or HONEYCOMB_DATASET not set');
      return undefined;
    }

    console.info('Initializing OpenTelemetry with Honeycomb');

    const exporter = new OTLPExporter({
      url: 'https://api.honeycomb.io/v1/traces',
      headers: {
        'x-honeycomb-team': honeycombApiKey,
        'x-honeycomb-dataset': honeycombDataset,
      },
    });

    // Get app version and commit hash if available
    const appVersion = typeof __APP_VERSION !== 'undefined' ? __APP_VERSION : 'unknown';
    const commitHash = typeof __COMMIT_HASH !== 'undefined' ? __COMMIT_HASH : 'unknown';

    const resource = new otelResources.Resource({
      [otelSemanticConventions.ATTR_SERVICE_NAME]: 'nut.server',
      [otelSemanticConventions.ATTR_SERVICE_VERSION]: `${appVersion}; ${commitHash}`,
    });

    const provider = new otelSdk.BasicTracerProvider({
      resource,
      spanProcessors: [
        new otelSdk.SimpleSpanProcessor(exporter),
        new otelSdk.SimpleSpanProcessor(new otelSdk.ConsoleSpanExporter()),
      ],
    });

    const contextManager = new otelContextAsyncHooks.AsyncLocalStorageContextManager();
    otelApi.context.setGlobalContextManager(contextManager);

    provider.register({ contextManager });

    return provider.getTracer('nut-server');
  } catch (e) {
    console.error('Error initializing OpenTelemetry tracer', e);
    return undefined;
  }
}

/**
 * Creates a tracer with Honeycomb integration if possible,
 * falling back to a stub implementation if not
 */
export function createTracer(context?: AppLoadContext): Tracer {
  if (context && !actualTracer) {
    initOpenTelemetry(context)
      .then(() => {
        console.log('[OpenTelemetry] Initialized tracer with context');
      })
      .catch((error) => {
        console.error('[OpenTelemetry] Failed to initialize with context:', error);
      });
  }

  if (actualTracer) {
    return actualTracer;
  }

  return stubTracer;
}

/**
 * Ensures that OpenTelemetry is initialized
 */
export function ensureOpenTelemetryInitialized(context?: AppLoadContext): void {
  if (!otelApi) {
    console.info('[OpenTelemetry] Using stubs');
    initOpenTelemetry(context);
  }
}

/**
 * Ensures a tracer is available, using the global tracer provider if possible
 * or falling back to a stub implementation
 */
export function ensureTracer(): Tracer {
  if (actualTracer) {
    return actualTracer;
  }

  if (otelApi) {
    try {
      return otelApi.trace.getTracerProvider().getTracer('nut-server');
    } catch (error) {
      console.warn('[OpenTelemetry] Failed to get tracer from provider, using stub:', error);
    }
  }

  return stubTracer;
}

class NormalizedError extends Error {
  value: unknown;

  constructor(value: unknown) {
    super();
    this.value = value;
  }
}

export function normalizeError(err: unknown): Error {
  return err instanceof Error ? err : new NormalizedError(err);
}

/**
 * Wraps a function with a span, tracking its execution
 */
export function wrapWithSpan<Args extends any[], T>(
  opts: { name: string; attrs?: Attributes },
  fn: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<T> {
  return (...args: Args): Promise<T> => {
    if (!otelApi) {
      return fn(...args);
    }

    const span = ensureTracer().startSpan(opts.name);

    if (opts.attrs) {
      span.setAttributes(opts.attrs);
    }

    try {
      return otelApi.context.with(otelApi.trace.setSpan(otelApi.context.active(), span), async () => {
        try {
          const rv = await fn(...args);
          span.setStatus({ code: SpanStatusCode.OK });

          return rv;
        } catch (e) {
          const err = normalizeError(e);
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.recordException(err);
          throw e;
        } finally {
          span.end();
        }
      });
    } catch (error) {
      console.warn('[OpenTelemetry] Error in wrapWithSpan, executing without span:', error);
      return fn(...args);
    }
  };
}

/**
 * Gets the current active span
 */
export function getCurrentSpan(): Span {
  if (!otelApi) {
    return stubSpan;
  }

  try {
    const span = otelApi.trace.getActiveSpan();
    return span || stubSpan;
  } catch (error) {
    console.warn('[OpenTelemetry] Failed to get active span, using stub:', error);
    return stubSpan;
  }
} 

