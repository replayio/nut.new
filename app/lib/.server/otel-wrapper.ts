import type { Tracer } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api';

// Define a fallback context manager that does nothing
class NoopContextManager {
  active() {
    return {};
  }
  with<T>(context: any, fn: () => T): T {
    return fn();
  }
  bind<T>(context: any, target: T): T {
    return target;
  }
  enable() {
    return this;
  }
  disable() {
    return this;
  }
}

// Export our simplified version that won't cause import errors
export class AsyncLocalStorageContextManager extends NoopContextManager {
  constructor() {
    super();
    console.log('Using fallback OpenTelemetry context manager');
  }
}

// Re-export trace API
export { trace };

// No-op tracer implementation
export function createNoopTracer(): Tracer {
  const noopSpan = {
    end: () => {},
    setAttribute: () => {},
    setAttributes: () => {},
    addEvent: () => {},
    setStatus: () => {},
    updateName: () => {},
    recordException: () => {},
    isRecording: () => false,
  };

  return {
    startSpan: () => noopSpan,
    startActiveSpan: (_name: string, options: any, fn: any) => {
      if (typeof options === 'function') {
        return options(noopSpan);
      }
      return fn(noopSpan);
    },
  } as unknown as Tracer;
} 