import { Worker, Job } from "bullmq";
import { MimeType } from "@prisma/client";
import { getRedis } from "../redis";
import { prisma } from "../prisma";
import { getObjectStream } from "../minio";
import { generateAndUploadThumbnailFromBuffer, generateAndUploadSpriteSheetFromBuffer } from "../thumbnail";
import type { ThumbnailJobData } from "../thumbnail-queue";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export function createThumbnailWorker() {
  const worker = new Worker<ThumbnailJobData>(
    "thumbnails",
    async (job: Job<ThumbnailJobData>) => {
      const { downloadId, userId, storagePath, mimeType } = job.data;

      // Check if the download still needs a thumbnail or sprite
      const download = await prisma.download.findUnique({
        where: { id: downloadId },
        select: { thumbnailPath: true, spritePath: true, fileSize: true },
      });

      if (!download) {
        console.warn(`[thumbnail-worker] Download ${downloadId} not found, skipping`);
        return;
      }

      if (download.thumbnailPath && download.spritePath) {
        console.log(`[thumbnail-worker] Skipping ${downloadId} — thumbnail and sprite already set`);
        return;
      }

      const MAX_THUMBNAIL_FILE_SIZE = 500 * 1024 * 1024; // 500MB
      if (download.fileSize && download.fileSize > BigInt(MAX_THUMBNAIL_FILE_SIZE)) {
        console.log(`[thumbnail-worker] File too large for thumbnail (${download.fileSize} bytes), skipping`);
        return;
      }

      const validMimeTypes = Object.values(MimeType);
      if (!validMimeTypes.includes(mimeType as MimeType)) {
        console.warn(`[thumbnail-worker] Unknown mimeType "${mimeType}" for ${downloadId}, skipping`);
        return;
      }

      // Stream source file from MinIO and buffer it (throws on network/MinIO failure)
      const stream = await getObjectStream(storagePath);
      const buffer = await streamToBuffer(stream);

      // Generate thumbnail if not already set
      const key = download.thumbnailPath
        ? download.thumbnailPath
        : await generateAndUploadThumbnailFromBuffer(buffer, mimeType as MimeType, userId, downloadId);

      // Generate sprite sheet if not already set
      const spriteKey = download.spritePath
        ? download.spritePath
        : await generateAndUploadSpriteSheetFromBuffer(buffer, mimeType as MimeType, userId, downloadId);

      const updates: Record<string, string> = {};
      if (key !== null && !download.thumbnailPath) updates.thumbnailPath = key;
      if (spriteKey !== null && !download.spritePath) updates.spritePath = spriteKey;

      if (Object.keys(updates).length > 0) {
        await prisma.download.update({ where: { id: downloadId }, data: updates });
        if (updates.thumbnailPath) console.log(`[thumbnail-worker] Thumbnail generated for ${downloadId}: ${key}`);
        if (updates.spritePath) console.log(`[thumbnail-worker] Sprite sheet generated for ${downloadId}: ${spriteKey}`);
      } else {
        console.log(`[thumbnail-worker] No new assets generated for ${downloadId}`);
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[thumbnail-worker] Job ${job.id} completed (download: ${job.data.downloadId})`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[thumbnail-worker] Job ${job?.id} failed (download: ${job?.data.downloadId}):`, err.message);
  });

  return worker;
}
