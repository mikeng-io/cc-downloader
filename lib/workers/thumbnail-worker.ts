import { Worker, Job } from "bullmq";
import { MimeType } from "@prisma/client";
import { getRedis } from "../redis";
import { prisma } from "../prisma";
import { getObjectStream } from "../minio";
import { generateAndUploadThumbnailFromBuffer } from "../thumbnail";
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

      try {
        // Check if the download still needs a thumbnail
        const download = await prisma.download.findUnique({
          where: { id: downloadId },
          select: { thumbnailPath: true },
        });

        if (download?.thumbnailPath) {
          console.log(`[thumbnail-worker] Skipping ${downloadId} — thumbnail already set`);
          return;
        }

        // Stream source file from MinIO and buffer it
        const stream = await getObjectStream(storagePath);
        const buffer = await streamToBuffer(stream);

        // Generate and upload thumbnail
        const key = await generateAndUploadThumbnailFromBuffer(
          buffer,
          mimeType as MimeType,
          userId,
          downloadId
        );

        if (key !== null) {
          await prisma.download.update({
            where: { id: downloadId },
            data: { thumbnailPath: key },
          });
          console.log(`[thumbnail-worker] Thumbnail generated for ${downloadId}: ${key}`);
        } else {
          console.log(`[thumbnail-worker] No thumbnail generated for ${downloadId} (unsupported type or error)`);
        }
      } catch (error) {
        console.error(`[thumbnail-worker] Error processing ${downloadId}:`, error);
        // Never throw — swallow errors so the job does not retry unexpectedly
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[thumbnail-worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[thumbnail-worker] Job ${job?.id} failed:`, err);
  });

  return worker;
}
