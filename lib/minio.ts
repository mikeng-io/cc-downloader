import { Client, ClientOptions } from "minio";
import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import * as http from "http";
import * as https from "https";

// Lazy initialization to avoid build-time errors
let minioClient: Client | null = null;
let httpAgent: http.Agent | null = null;
let httpsAgent: https.Agent | null = null;
let minioBucket: string = "downloads";

function getConfig() {
  const minioEndpoint = process.env.MINIO_ENDPOINT;
  const minioAccessKey = process.env.MINIO_ACCESS_KEY;
  const minioSecretKey = process.env.MINIO_SECRET_KEY;
  minioBucket = process.env.MINIO_BUCKET ?? "downloads";

  if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
    throw new Error("Missing MinIO configuration");
  }

  return { minioEndpoint, minioAccessKey, minioSecretKey };
}

function getMinioClient(): Client {
  if (!minioClient) {
    const { minioEndpoint, minioAccessKey, minioSecretKey } = getConfig();

    // Configure HTTP agent for connection pooling
    const maxSockets = 50;
    const keepAlive = true;

    httpAgent = new http.Agent({
      keepAlive,
      maxSockets,
      keepAliveMsecs: 1000,
    });

    httpsAgent = new https.Agent({
      keepAlive,
      maxSockets,
      keepAliveMsecs: 1000,
    });

    const clientOptions: ClientOptions = {
      endPoint: new URL(minioEndpoint).hostname,
      port: parseInt(new URL(minioEndpoint).port) || 9000,
      useSSL: minioEndpoint.startsWith("https://"),
      accessKey: minioAccessKey,
      secretKey: minioSecretKey,
    };

    minioClient = new Client(clientOptions);

    // Apply connection pooling to the underlying HTTP agent
    // @ts-ignore - accessing internal transport for connection pooling
    if (minioClient.transport && minioClient.transport.agent) {
      // @ts-ignore
      minioClient.transport.agent = minioEndpoint.startsWith("https://") ? httpsAgent : httpAgent;
    }
  }

  return minioClient;
}

// Ensure bucket exists
export async function ensureBucket() {
  const client = getMinioClient();
  const exists = await client.bucketExists(minioBucket);
  if (!exists) {
    await client.makeBucket(minioBucket);
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
  const client = getMinioClient();
  await client.putObject(minioBucket, storageKey, buffer, buffer.length, metadata || {});
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
  const client = getMinioClient();
  const stats = statSync(filePath);
  const fileSize = stats.size;

  const fileStream = createReadStream(filePath);

  // Track upload progress
  let bytesUploaded = 0;

  fileStream.on("data", (chunk: Buffer | string) => {
    bytesUploaded += Buffer.byteLength(String(chunk));
    onProgress?.(bytesUploaded, fileSize);
  });

  const result = await client.putObject(
    minioBucket,
    storageKey,
    fileStream,
    fileSize,
    metadata || {}
  );

  return { etag: result?.etag || "", versionId: result?.versionId ?? undefined };
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
  const client = getMinioClient();
  const result = await client.putObject(
    minioBucket,
    storageKey,
    stream,
    size,
    metadata || {}
  );

  return { etag: result?.etag || "", versionId: result?.versionId ?? undefined };
}

// Generate presigned URL for download (reduced expiration for security)
export async function getPresignedUrl(storageKey: string, expiresIn = 3600): Promise<string> {
  const client = getMinioClient();
  return await client.presignedGetObject(minioBucket, storageKey, expiresIn);
}

// Delete file from MinIO
export async function deleteFile(storageKey: string) {
  const client = getMinioClient();
  await client.removeObject(minioBucket, storageKey);
}

// Get file stats
export async function getFileStats(storageKey: string) {
  const client = getMinioClient();
  return await client.statObject(minioBucket, storageKey);
}

// Get object stream for streaming files (full file)
export async function getObjectStream(storageKey: string) {
  const client = getMinioClient();
  return await client.getObject(minioBucket, storageKey);
}

/**
 * Get partial object stream for efficient range requests (video seeking)
 * This is MUCH more efficient than downloading the full file and slicing
 *
 * @param storageKey - The object key in MinIO
 * @param offset - Start byte position
 * @param length - Number of bytes to fetch
 * @returns Readable stream of the requested byte range
 */
export async function getPartialObjectStream(
  storageKey: string,
  offset: number,
  length: number
) {
  const client = getMinioClient();
  return await client.getPartialObject(minioBucket, storageKey, offset, length);
}

// Close connection pool (for graceful shutdown)
export async function closeMinIOConnection() {
  httpAgent?.destroy();
  httpsAgent?.destroy();
}
