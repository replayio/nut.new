/* 
 * STUBBED VERSION - OpenTelemetry implementation removed during migration
 * Original implementation used these imports:
 * import type { Tracer } from '@opentelemetry/api';
 * import { SpanStatusCode, type Attributes, context, trace } from '@opentelemetry/api';
 * import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
 * ... etc
 */

import type { AppLoadContext } from '@remix-run/cloudflare';

// Stub for the tracer type
export type Tracer = {
  startSpan: (name: string, options?: any) => any;
  // Add other methods as needed
};

// Stub for span attributes
export type Attributes = Record<string, string | number | boolean | Array<string | number | boolean>>;

// Stub for the SpanStatusCode
export enum SpanStatusCode {
  OK = 0,
  ERROR = 1,
  UNSET = 2,
}

// Stubbed exporter - doesn't actually export anything
export class OTLPExporter {
  constructor(_config: any) {}

  export(_spans: any[], resultCallback: (result: any) => void): void {
    // Just call the callback with a success code
    resultCallback({ code: 0 }); // 0 = SUCCESS
  }

  async shutdown(): Promise<void> {
    // Do nothing
    return Promise.resolve();
  }

  async forceFlush(): Promise<void> {
    // Do nothing
    return Promise.resolve();
  }
}

// Stubbed tracer implementation
const stubTracer: Tracer = {
  startSpan: (_name: string, _options?: any) => {
    // Return a stub span object
    return {
      setAttribute: (_key: string, _value: any) => {},
      setAttributes: (_attributes: any) => {},
      end: () => {},
      recordException: (_exception: any) => {},
      setStatus: (_status: any) => {},
    };
  },
};

export function createTracer(_appContext: AppLoadContext) {
  console.info('Using stubbed OpenTelemetry implementation');
  return stubTracer;
}

let tracer: Tracer | undefined;

export function ensureOpenTelemetryInitialized(_context: AppLoadContext) {
  if (tracer) {
    return;
  }

  tracer = stubTracer;
}

export function ensureTracer() {
  if (!tracer) {
    tracer = stubTracer;
  }

  return tracer;
}

// Stub implementation for wrapWithSpan
type SpanOptions = {
  name: string;
  attrs?: Attributes;
};

export function wrapWithSpan<Args extends any[], T>(
  _opts: SpanOptions,
  fn: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<T> {
  // This stub just passes through the function without any tracing
  return fn;
}

export function getCurrentSpan() {
  // Return a stub span
  return {
    setAttribute: (_key: string, _value: any) => {},
    setAttributes: (_attributes: any) => {},
    end: () => {},
    recordException: (_exception: any) => {},
    setStatus: (_status: any) => {},
  };
}
