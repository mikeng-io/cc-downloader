import { Queue } from "bullmq";
import { getRedis } from "./redis";

export interface ThumbnailJobData {
  downloadId: string;
  userId: string;
  storagePath: string; // MinIO key of the source file
  mimeType: string; // MimeType enum value e.g. "VIDEO_MP4"
}

interface AddThumbnailJobOptions {
  jobId?: string;
}

let thumbnailQueue: Queue<ThumbnailJobData> | null = null;

export function getThumbnailQueue(): Queue<ThumbnailJobData> {
  if (!thumbnailQueue) {
    thumbnailQueue = new Queue<ThumbnailJobData>("thumbnails", {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: { age: 24 * 3600, count: 500 },
        removeOnFail: { age: 7 * 24 * 3600, count: 1000 },
      },
    });
  }
  return thumbnailQueue;
}

/** For testing only — resets the singleton so Queue constructor is called again. */
export function _resetThumbnailQueue(): void {
  thumbnailQueue = null;
}

export async function addThumbnailJob(
  data: ThumbnailJobData,
  options?: AddThumbnailJobOptions,
): Promise<void> {
  const queue = getThumbnailQueue();
  const jobId = options?.jobId ?? data.downloadId;
  await queue.add("thumbnail", data, { jobId });
}
