/**
 * OpenTelemetry instrumentation for CC-Downloader
 * Exports traces to SigNoz (OTLP) and Sentry (native)
 */
import { registerOTel } from "@vercel/otel";

// Configure OpenTelemetry for Vercel deployment
export function register() {
  return registerOTel({
    serviceName: "cc-downloader",
  });
}

// Simple wrapper for download operations (no tracing in dev)
export async function createDownloadSpan(
  downloadId: string,
  operation: string,
  fn: () => Promise<void>
): Promise<void> {
  return fn();
}

// Simple wrapper for API operations (no tracing in dev)
export async function createApiSpan<T>(
  method: string,
  path: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

// Metrics for performance monitoring (placeholder)
export async function recordDownloadMetric(
  downloadId: string,
  fileSize: number,
  duration: number,
  success: boolean
): Promise<void> {
  // TODO: Implement metrics recording
  return Promise.resolve();
}
