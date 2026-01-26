/**
 * OpenTelemetry instrumentation for CC-Downloader
 * Exports traces to SigNoz (OTLP) and Sentry (native)
 */
import { registerOTel } from "@vercel/otel";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

// Configure OpenTelemetry for Vercel deployment
export function register() {
  return registerOTel({
    serviceName: "cc-downloader",
    serviceVersion: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    resource: {
      attributes: {
        [SemanticResourceAttributes.SERVICE_NAME]: "cc-downloader",
        [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          process.env.NODE_ENV || "development",
      },
    },
  });
}

// Create a span for download operations
export async function createDownloadSpan(
  downloadId: string,
  operation: string,
  fn: () => Promise<void>
) {
  const { trace } = await import("@opentelemetry/api");
  const tracer = trace.getTracer("cc-downloader");

  return tracer.startActiveSpan(`download.${operation}`, async (span) => {
    try {
      await fn();
      span.set_status({ code: 1 });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }, {
    attributes: {
      "download.id": downloadId,
      "download.operation": operation,
    },
  });
}

// Create a span for API operations
export async function createApiSpan(
  method: string,
  path: string,
  fn: () => Promise<void>
) {
  const { trace } = await import("@opentelemetry/api");
  const tracer = trace.getTracer("api");

  return tracer.startActiveSpan(
    `${method} ${path}`,
    async (span) => {
      try {
        await fn();
        span.set_status({ code: 1 });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    },
    {
      kind: "span",
      attributes: {
        "http.method": method,
        "http.route": path,
      },
    }
  );
}

// Metrics for performance monitoring
export async function recordDownloadMetric(
  downloadId: string,
  fileSize: number,
  duration: number,
  success: boolean
) {
  const { metrics } = await import("@opentelemetry/api");
  const meter = metrics.getMeter("cc-downloader");

  const downloadCounter = meter.createCounter("downloads", {
    description: "Number of downloads",
  });

  const downloadSizeHistogram = meter.createHistogram("download_size_bytes", {
    description: "Download file sizes in bytes",
  });

  const downloadDurationHistogram = meter.createHistogram("download_duration_ms", {
    description: "Download duration in milliseconds",
  });

  downloadCounter.add(1, { "download.status": success ? "success" : "failed" });
  downloadSizeHistogram.record(fileSize);
  downloadDurationHistogram.record(duration);
}
