/**
 * OpenTelemetry integration
 *
 * This file handles OpenTelemetry functionality by using the wrapper
 * which intelligently loads modules or falls back to stubs.
 */

// Re-export everything from the wrapper
export * from './otel-wrapper';

/**
 * Initialize OpenTelemetry when this module is imported
 * This approach ensures we attempt to load modules early
 */
import { initOpenTelemetry } from './otel-wrapper';

// Try to initialize in a non-blocking way
initOpenTelemetry().catch((error) => {
  console.error('[OpenTelemetry] Failed to initialize:', error);
}); 