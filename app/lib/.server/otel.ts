import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { SpanStatusCode, type Attributes, context, trace } from '@opentelemetry/api';

function initializeOpenTelemetry() {
  const honeycombApiKey = process.env.HONEYCOMB_API_KEY;
  const honeycombDataset = process.env.HONEYCOMB_DATASET;

  if (!honeycombApiKey || !honeycombDataset) {
    console.warn('OpenTelemetry initialization skipped: HONEYCOMB_API_KEY and/or HONEYCOMB_DATASET not set');
    return trace.getTracerProvider().getTracer('nut-server');
  }

  console.warn('Initializing OpenTelemetry');

  const exporter = new OTLPTraceExporter({
    url: 'https://api.honeycomb.io/v1/traces',
    headers: {
      'x-honeycomb-team': honeycombApiKey,
      'x-honeycomb-dataset': honeycombDataset,
    },
  });

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'nut.server',
  });

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [new SimpleSpanProcessor(exporter), new SimpleSpanProcessor(new ConsoleSpanExporter())],
  });

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  return provider.getTracer('nut-server');
}

const tracer = initializeOpenTelemetry();

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
    return tracer.startActiveSpan(opts.name, async (span) => {
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
