import type { Tracer } from '@opentelemetry/api';
import { SpanStatusCode, type Attributes, context, trace } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import type { ExportResult } from '@opentelemetry/core';
import { ExportResultCode } from '@opentelemetry/core';
import type { ExportServiceError, OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
import { OTLPExporterError } from '@opentelemetry/otlp-exporter-base';
import { createExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';
import { Resource } from '@opentelemetry/resources';
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ConsoleSpanExporter, SimpleSpanProcessor, BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import type { AppLoadContext } from '@remix-run/cloudflare';

interface OTLPExporterConfig extends OTLPExporterConfigBase {
  url: string; // required for us
  retryCount?: number;
  retryIntervalMillis?: number;
}

const defaultConfig = {
  url: "'https://api.honeycomb.io/v1/traces'",
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

  constructor(config: OTLPExporterConfig) {
    this._config = {
      ...defaultConfig,
      ...config,
    };
    this._shutdownOnce = false;
    this._activeExports = [];
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

    let currentRetry = 0;

    // types involving config objects with optional fields are such a pain, hence the defaults here.
    const { retryCount = defaultConfig.retryCount, retryIntervalMillis = defaultConfig.retryIntervalMillis } =
      this._config;

    while (currentRetry < retryCount!) {
      try {
        await this._sendSpans(spans);
        return;
      } catch (error) {
        currentRetry++;

        if (currentRetry === this._config.retryCount) {
          throw new OTLPExporterError(
            `Failed to export spans after ${retryCount} retries.  most recent error is ${error instanceof Error ? error.toString() : error}`,
          );
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMillis * currentRetry));
      }
    }
  }

  private async _sendSpans(spans: ReadableSpan[]): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._config.timeoutMillis);

    const exportMessage = createExportTraceServiceRequest(spans, {
      useHex: true,
      useLongBits: false,
    });

    try {
      const response = await fetch(this._config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this._config.headers,
        },
        body: JSON.stringify(exportMessage),
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

export function createTracer(context: AppLoadContext) {
  const honeycombApiKey = (context.cloudflare.env as any).HONEYCOMB_API_KEY;
  const honeycombDataset = (context.cloudflare.env as any).HONEYCOMB_DATASET;

  if (!honeycombApiKey || !honeycombDataset) {
    console.warn('OpenTelemetry initialization skipped: HONEYCOMB_API_KEY and/or HONEYCOMB_DATASET not set');
    return undefined;
  }

  console.info('Initializing OpenTelemetry');

  try {
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

    provider.register({
      contextManager: new ZoneContextManager(),
    });

    return provider.getTracer('nut-server');
  } catch (e) {
    console.error('Error initializing OpenTelemetry', e);
    return undefined;
  }
}

let tracer: Tracer | undefined;

export function ensureOpenTelemetryInitialized(context: AppLoadContext) {
  if (tracer) {
    return;
  }

  tracer = createTracer(context);
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
  return async (...args: Args) => {
    return ensureTracer().startActiveSpan(opts.name, async (span) => {
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
  return trace.getSpan(context.active());
}
