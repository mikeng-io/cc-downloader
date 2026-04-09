import { Queue } from "bullmq";
import { getRedis } from "./redis";

export interface ThumbnailJobData {
  downloadId: string;
  userId: string;
  storagePath: string; // MinIO key of the source file
  mimeType: string; // MimeType enum value e.g. "VIDEO_MP4"
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
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
  }
  return thumbnailQueue;
}

/** For testing only — resets the singleton so Queue constructor is called again. */
export function _resetThumbnailQueue(): void {
  thumbnailQueue = null;
}

export async function addThumbnailJob(data: ThumbnailJobData): Promise<void> {
  const queue = getThumbnailQueue();
  // jobId = downloadId ensures deduplication — enqueueing the same download twice is a no-op
  await queue.add("thumbnail", data, { jobId: data.downloadId });
}
