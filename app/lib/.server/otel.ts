import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { SpanStatusCode, type Attributes, context, trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';
import type { AppLoadContext } from '@remix-run/cloudflare';

export function createTracer(context: AppLoadContext) {
  const honeycombApiKey = (context.cloudflare.env as any).HONEYCOMB_API_KEY;
  const honeycombDataset = (context.cloudflare.env as any).HONEYCOMB_DATASET;

  if (!honeycombApiKey || !honeycombDataset) {
    console.warn('OpenTelemetry initialization skipped: HONEYCOMB_API_KEY and/or HONEYCOMB_DATASET not set');
    return undefined;
  }

  console.warn('Initializing OpenTelemetry');

  try {
    const exporter = new OTLPTraceExporter({
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

    const provider = new WebTracerProvider({
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
