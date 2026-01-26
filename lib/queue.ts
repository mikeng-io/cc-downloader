import { Queue, Worker, Job } from "bullmq";
import { redis } from "./redis";
import { prisma } from "./prisma";
import { DownloadStatus, MimeType } from "@prisma/client";
import { handleYtdlpDownload, handleGalleryDlDownload } from "./workers/ytdlp-worker";
import { ensureBucket, generateStorageKey, uploadFile } from "./minio";

// Job types
export interface DownloadJobData {
  downloadId: string;
  userId: string;
  url: string;
  downloadType: "DIRECT" | "YTDLP" | "GALLERY_DL";
  retryCount?: number; // Track retry attempts
}

// Retryable error types
const RETRYABLE_ERROR_PATTERNS = [
  /timeout/i,
  /timed out/i,
  /etimedout/i,
  /econnrefused/i,
  /econnreset/i,
  /enotfound/i,
  /temporary/i,
  /temporarily unavailable/i,
  /503/i,
  /502/i,
  /504/i,
  /connection/i,
  /network/i,
];

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error | string): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return RETRYABLE_ERROR_PATTERNS.some(pattern => pattern.test(errorMessage));
}

/**
 * Classify error for retry logic
 */
export function classifyError(error: Error | string): {
  retryable: boolean;
  type: string;
  message: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (isRetryableError(errorMessage)) {
    return {
      retryable: true,
      type: "TEMPORARY",
      message: errorMessage,
    };
  }

  return {
    retryable: false,
    type: "PERMANENT",
    message: errorMessage,
  };
}

export const downloadQueue = new Queue<DownloadJobData>("downloads", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

// Worker configuration with retry tracking
export function createWorker() {
  const worker = new Worker<DownloadJobData>(
    "downloads",
    async (job: Job<DownloadJobData>) => {
      const { downloadId, url, downloadType, retryCount = 0 } = job.data;

      // Update status to PROCESSING
      await prisma.download.update({
        where: { id: downloadId },
        data: {
          status: DownloadStatus.PROCESSING,
          startedAt: new Date(),
          retryCount: retryCount > 0 ? retryCount : null,
        },
      });

      try {
        // Route to appropriate handler based on download type
        switch (downloadType) {
          case "DIRECT":
            await handleDirectDownload(job);
            break;
          case "YTDLP":
            await handleYtdlpDownload(job);
            break;
          case "GALLERY_DL":
            await handleGalleryDlDownload(job);
            break;
          default:
            throw new Error(`Unknown download type: ${downloadType}`);
        }
      } catch (error) {
        // Classify error
        const classification = classifyError(error instanceof Error ? error : new Error(String(error)));

        // If this is the last attempt or error is not retryable, mark as permanently failed
        const currentAttempt = job.attemptsMade;
        const maxAttempts = job.opts.attempts || 3;

        if (!classification.retryable || currentAttempt >= maxAttempts) {
          // Mark as permanently failed
          await prisma.download.update({
            where: { id: downloadId },
            data: {
              status: DownloadStatus.FAILED,
              errorMessage: classification.message,
              errorType: classification.type,
              completedAt: new Date(),
              retryCount: currentAttempt,
            },
          });
        } else {
          // Will be retried - mark with retryable error
          await prisma.download.update({
            where: { id: downloadId },
            data: {
              errorMessage: `Retry ${currentAttempt + 1}/${maxAttempts}: ${classification.message}`,
              retryCount: currentAttempt,
            },
          });
        }

        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    const currentAttempt = job?.attemptsMade || 0;
    const maxAttempts = job?.opts.attempts || 3;
    console.error(`Job ${job?.id} failed (attempt ${currentAttempt}/${maxAttempts}):`, err);

    // Check if we should retry
    if (job && currentAttempt < maxAttempts) {
      const errorClassification = classifyError(err);
      if (errorClassification.retryable) {
        console.log(`Job ${job.id} will be retried with exponential backoff`);
        // Update job data with retry count
        job.updateData({
          ...job.data,
          retryCount: currentAttempt + 1,
        });
      } else {
        console.log(`Job ${job.id} has non-retryable error: ${errorClassification.type}`);
      }
    }
  });

  return worker;
}

// Direct download handler using HTTP streaming
async function handleDirectDownload(job: Job<DownloadJobData>) {
  const { downloadId, userId, url } = job.data;
  const updateProgress = (progress: number) => job.updateProgress(progress);

  const response = await fetch(url, {
    headers: { "User-Agent": "CC-Downloader/1.0" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  const contentType = response.headers.get("content-type");
  const totalBytes = contentLength ? BigInt(contentLength) : null;

  // Check file size limit (5GB)
  const MAX_FILE_SIZE = 5368709120n; // 5GB
  if (totalBytes && totalBytes > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed (5GB)`);
  }

  // Get filename from Content-Disposition or URL
  const filename = getFilenameFromResponse(response, url);

  // Stream the download and update progress
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  let downloadedBytes = 0n;
  const chunks: Buffer[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = Buffer.from(value);
    chunks.push(chunk);
    downloadedBytes += BigInt(chunk.length);

    // Update progress every 1MB
    if (downloadedBytes % 1048576n === 0n) {
      if (totalBytes) {
        updateProgress(Number((downloadedBytes * 100n) / totalBytes) * 0.8); // Use 80% for download
      }
    }
  }

  const buffer = Buffer.concat(chunks);

  // Upload to MinIO
  updateProgress(85);
  await ensureBucket();

  const storageKey = generateStorageKey(userId, downloadId, filename);
  await uploadFile(storageKey, buffer, {
    "Content-Type": contentType || "application/octet-stream",
    "downloaded-from": url,
  });

  // Update database
  updateProgress(95);
  await prisma.download.update({
    where: { id: downloadId },
    data: {
      status: DownloadStatus.COMPLETED,
      fileName: filename,
      fileSize: BigInt(buffer.length),
      mimeType: getMimeTypeFromContentType(contentType),
      storagePath: storageKey,
      completedAt: new Date(),
      metadata: {
        extractor: "direct",
      },
    },
  });

  updateProgress(100);
}

function getFilenameFromResponse(response: Response, url: string): string {
  const contentDisposition = response.headers.get("content-disposition");
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      return match[1].replace(/['"]/g, "");
    }
  }

  // Fallback to URL path
  try {
    const urlPath = new URL(url).pathname;
    const segments = urlPath.split("/").filter(Boolean);
    return segments[segments.length - 1] || "download";
  } catch {
    return "download";
  }
}

async function updateProgress(
  downloadId: string,
  bytesDownloaded: bigint,
  totalBytes: bigint | null
) {
  const percentage = totalBytes
    ? Math.min(Number((bytesDownloaded * 100n) / totalBytes), 100)
    : 0;

  await prisma.progress.upsert({
    where: { downloadId },
    create: {
      downloadId,
      bytesDownloaded,
      totalBytes,
      percentage,
    },
    update: {
      bytesDownloaded,
      totalBytes,
      percentage,
    },
  });
}

function getMimeTypeFromContentType(contentType: string | null): MimeType {
  if (!contentType) return MimeType.UNKNOWN;

  const type = contentType.toLowerCase();

  if (type.includes("video/mp4")) return MimeType.VIDEO_MP4;
  if (type.includes("video/webm")) return MimeType.VIDEO_WEBM;
  if (type.includes("image/jpeg")) return MimeType.IMAGE_JPEG;
  if (type.includes("image/png")) return MimeType.IMAGE_PNG;
  if (type.includes("image/gif")) return MimeType.IMAGE_GIF;
  if (type.includes("image/webp")) return MimeType.IMAGE_WEBP;
  if (type.includes("audio/mpeg")) return MimeType.AUDIO_MP3;
  if (type.includes("audio/wav")) return MimeType.AUDIO_WAV;
  if (type.includes("audio/mp4") || type.includes("audio/m4a")) return MimeType.AUDIO_M4A;

  return MimeType.UNKNOWN;
}

// Add download job to queue
export async function addDownloadJob(data: DownloadJobData) {
  return await downloadQueue.add("download", data, {
    jobId: data.downloadId,
    priority: 0,
  });
}

// Cancel download job
export async function cancelDownloadJob(downloadId: string) {
  const job = await downloadQueue.getJob(downloadId);
  if (job) {
    await job.remove();
    await prisma.download.update({
      where: { id: downloadId },
      data: { status: DownloadStatus.CANCELLED },
    });
  }
}
