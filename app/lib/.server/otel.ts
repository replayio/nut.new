import type { Tracer } from '@opentelemetry/api';
import { SpanStatusCode, type Attributes, context, trace } from '@opentelemetry/api';
import type { ExportResult } from '@opentelemetry/core';
import { ExportResultCode } from '@opentelemetry/core';
import type { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
import { OTLPExporterError } from '@opentelemetry/otlp-exporter-base';
import { createExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';
import { Resource } from '@opentelemetry/resources';
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ConsoleSpanExporter, SimpleSpanProcessor, BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import type { AppLoadContext } from '@remix-run/cloudflare';

// used to implement concurrencyLimit in the otlp exporter
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

interface OTLPExporterConfig extends OTLPExporterConfigBase {
  retryCount?: number;
  retryIntervalMillis?: number;
}

const defaultOptions = {
  url: 'https://api.honeycomb.io/v1/traces',
  concurrencyLimit: 5,
  timeoutMillis: 5000,
  headers: {},
  retryCount: 3,
  retryIntervalMillis: 100,
} as const;

export class OTLPExporter implements SpanExporter {
  private readonly _config: OTLPExporterConfig;
  private _shutdownOnce: boolean;
  private _activeExports: Promise<void>[];
  private _semaphore: Semaphore;

  constructor(config: OTLPExporterConfig) {
    this._config = {
      ...config,
      headers: { ...config.headers },
    };
    this._shutdownOnce = false;
    this._activeExports = [];
    this._semaphore = new Semaphore(this._config.concurrencyLimit || defaultOptions.concurrencyLimit);
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this._shutdownOnce) {
      console.warn('Exporter has been shutdown, skipping export.');
      resultCallback({ code: ExportResultCode.FAILED });

      return;
    }

    const exportPromise = this._export(spans);
    this._activeExports.push(exportPromise);

    // Clean up completed exports
    exportPromise
      .then(() => {
        resultCallback({ code: ExportResultCode.SUCCESS });
      })
      .catch((error) => {
        console.warn('CustomOTLPSpanExporter export failed:', error);
        resultCallback({ code: ExportResultCode.FAILED, error });
      })
      .finally(() => {
        const index = this._activeExports.indexOf(exportPromise);

        if (index !== -1) {
          this._activeExports.splice(index, 1);
        }
      });
  }

  private async _export(spans: ReadableSpan[]): Promise<void> {
    if (spans.length === 0) {
      return;
    }

    const exportMessage = createExportTraceServiceRequest(spans, {
      useHex: true,
      useLongBits: false,
    });

    const exportPayload = JSON.stringify(exportMessage);

    let currentRetry = 0;

    // types involving config objects with optional fields are such a pain, hence the defaults here.
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
          throw new OTLPExporterError(
            `Failed to export spans after ${retryCount} retries.  most recent error is ${error instanceof Error ? error.toString() : error}`,
          );
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMillis * currentRetry));
      }
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
    if (this._shutdownOnce) {
      console.warn('Exporter has already been shutdown.');
      return;
    }

    this._shutdownOnce = true;
    await this.forceFlush();
  }

  async forceFlush(): Promise<void> {
    await Promise.all(this._activeExports);
  }
}

// Helper to safely load the async hooks module
async function loadAsyncHooksContextManager() {
  try {
    const module = await import('@opentelemetry/context-async-hooks');
    return module.AsyncLocalStorageContextManager;
  } catch (error) {
    console.error('Failed to load AsyncLocalStorageContextManager:', error);
    throw error;
  }
}

export async function createTracer(appContext: AppLoadContext) {
  const honeycombApiKey = (appContext.cloudflare.env as any).HONEYCOMB_API_KEY;
  const honeycombDataset = (appContext.cloudflare.env as any).HONEYCOMB_DATASET;

  if (!honeycombApiKey || !honeycombDataset) {
    console.warn('OpenTelemetry initialization skipped: HONEYCOMB_API_KEY and/or HONEYCOMB_DATASET not set');
    return undefined;
  }

  console.info('Initializing OpenTelemetry');

  try {
    // Load development flag
    const isDev = process.env.NODE_ENV === 'development';

    // Skip initialization in development
    if (isDev) {
      console.warn('OpenTelemetry initialization skipped in development mode');
      return undefined;
    }

    // Dynamically import the problematic module
    const ASYNC_HOOKS_MANAGER = await loadAsyncHooksContextManager();

    const exporter = new OTLPExporter({
      url: 'https://api.honeycomb.io/v1/traces',
      headers: {
        'x-honeycomb-team': honeycombApiKey,
        'x-honeycomb-dataset': honeycombDataset,
      },
    });

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: 'nut.server',
      [ATTR_SERVICE_VERSION]: `${__APP_VERSION}; ${__COMMIT_HASH}`,
    });

    const provider = new BasicTracerProvider({
      resource,
      spanProcessors: [new SimpleSpanProcessor(exporter), new SimpleSpanProcessor(new ConsoleSpanExporter())],
    });

    const contextManager = new ASYNC_HOOKS_MANAGER();
    context.setGlobalContextManager(contextManager);

    provider.register({ contextManager });

    return provider.getTracer('nut-server');
  } catch (e) {
    console.error('Error initializing OpenTelemetry', e);
    return undefined;
  }
}

let tracer: Tracer | undefined;

export async function ensureOpenTelemetryInitialized(context: AppLoadContext) {
  if (tracer) {
    return;
  }

  try {
    // Skip initialization in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('OpenTelemetry initialization skipped in development mode');
      return;
    }

    tracer = await createTracer(context);
  } catch (e) {
    console.error('Failed to initialize OpenTelemetry:', e);

    // Don't throw, just log and continue - this allows the app to function without telemetry
  }
}

export function ensureTracer() {
  if (!tracer) {
    tracer = trace.getTracerProvider().getTracer('nut-server');
  }

  return tracer;
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

type SpanOptions = {
  name: string;
  attrs?: Attributes;
};

export function wrapWithSpan<Args extends any[], T>(
  opts: SpanOptions,
  fn: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<T> {
  return (...args: Args) => {
    const span = ensureTracer().startSpan(opts.name);

    if (opts.attrs) {
      span.setAttributes(opts.attrs);
    }

    return context.with(trace.setSpan(context.active(), span), async () => {
      if (opts.attrs) {
        span.setAttributes(opts.attrs);
      }

      try {
        const rv = await fn(...args);

        span.setStatus({
          code: SpanStatusCode.OK,
        });

        return rv;
      } catch (e) {
        const err = normalizeError(e);
        span.setStatus({
          code: SpanStatusCode.ERROR,
        });
        span.recordException(err);
        throw e;
      } finally {
        span.end();
      }
    });
  };
}

export function getCurrentSpan() {
  return trace.getActiveSpan();
}
