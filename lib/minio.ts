import { Client, ClientOptions } from "minio";
import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import * as http from "http";
import * as https from "https";

const minioEndpoint = process.env.MINIO_ENDPOINT;
const minioAccessKey = process.env.MINIO_ACCESS_KEY;
const minioSecretKey = process.env.MINIO_SECRET_KEY;
const minioBucket = process.env.MINIO_BUCKET ?? "downloads";

if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
  throw new Error("Missing MinIO configuration");
}

// Configure HTTP agent for connection pooling
const maxSockets = 50; // Maximum concurrent connections
const keepAlive = true; // Enable keep-alive

const httpAgent = new http.Agent({
  keepAlive,
  maxSockets,
  keepAliveMsecs: 1000, // Send keep-alive packets every 1 second
});

const httpsAgent = new https.Agent({
  keepAlive,
  maxSockets,
  keepAliveMsecs: 1000,
});

// MinIO client with connection pooling
const clientOptions: ClientOptions = {
  endPoint: new URL(minioEndpoint).hostname,
  port: parseInt(new URL(minioEndpoint).port) || 9000,
  useSSL: minioEndpoint.startsWith("https://"),
  accessKey: minioAccessKey,
  secretKey: minioSecretKey,
};

export const minioClient = new Client(clientOptions);

// Apply connection pooling to the underlying HTTP agent
// @ts-ignore - accessing internal transport for connection pooling
if (minioClient.transport && minioClient.transport.agent) {
  // @ts-ignore
  minioClient.transport.agent = minioEndpoint.startsWith("https://") ? httpsAgent : httpAgent;
}

// Ensure bucket exists
export async function ensureBucket() {
  const exists = await minioClient.bucketExists(minioBucket);
  if (!exists) {
    await minioClient.makeBucket(minioBucket);
    console.log(`Bucket '${minioBucket}' created`);
  }
}

// Generate storage key: userId/downloadId/filename
export function generateStorageKey(userId: string, downloadId: string, filename: string): string {
  return `${userId}/${downloadId}/${filename}`;
}

/**
 * Upload file buffer to MinIO (for smaller files)
 * @deprecated Use uploadFileStream for large files
 */
export async function uploadFile(
  storageKey: string,
  buffer: Buffer,
  metadata?: Record<string, string>
) {
  await minioClient.putObject(minioBucket, storageKey, buffer, buffer.length, metadata || {});
}

/**
 * Upload file stream to MinIO (for large files - memory efficient)
 */
export async function uploadFileStream(
  storageKey: string,
  filePath: string,
  metadata?: Record<string, string>,
  onProgress?: (bytesUploaded: number, totalBytes: number) => void
): Promise<{ etag: string; versionId?: string }> {
  const stats = statSync(filePath);
  const fileSize = stats.size;

  const fileStream = createReadStream(filePath);

  return new Promise((resolve, reject) => {
    // Track upload progress
    let bytesUploaded = 0;

    fileStream.on("data", (chunk: Buffer | string) => {
      bytesUploaded += Buffer.byteLength(String(chunk));
      onProgress?.(bytesUploaded, fileSize);
    });

    fileStream.on("error", reject);

    minioClient.putObject(
      minioBucket,
      storageKey,
      fileStream,
      fileSize,
      metadata || {},
      (err: Error | null, result?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({ etag: result?.etag || "", versionId: result?.versionId });
        }
      }
    );
  });
}

/**
 * Upload readable stream to MinIO
 */
export async function uploadReadableStream(
  storageKey: string,
  stream: Readable,
  size: number,
  metadata?: Record<string, string>
): Promise<{ etag: string; versionId?: string }> {
  return new Promise((resolve, reject) => {
    minioClient.putObject(
      minioBucket,
      storageKey,
      stream,
      size,
      metadata || {},
      (err: Error | null, result?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({ etag: result?.etag || "", versionId: result?.versionId });
        }
      }
    );
  });
}

// Generate presigned URL for download (reduced expiration for security)
export async function getPresignedUrl(storageKey: string, expiresIn = 3600): Promise<string> {
  return await minioClient.presignedGetObject(minioBucket, storageKey, expiresIn);
}

// Delete file from MinIO
export async function deleteFile(storageKey: string) {
  await minioClient.removeObject(minioBucket, storageKey);
}

// Get file stats
export async function getFileStats(storageKey: string) {
  return await minioClient.statObject(minioBucket, storageKey);
}

// Close connection pool (for graceful shutdown)
export async function closeMinIOConnection() {
  httpAgent.destroy();
  httpsAgent.destroy();
}
