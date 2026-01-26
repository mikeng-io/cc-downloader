import { Client } from "@minio/sdk";

const minioEndpoint = process.env.MINIO_ENDPOINT;
const minioAccessKey = process.env.MINIO_ACCESS_KEY;
const minioSecretKey = process.env.MINIO_SECRET_KEY;
const minioBucket = process.env.MINIO_BUCKET ?? "downloads";

if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
  throw new Error("Missing MinIO configuration");
}

export const minioClient = new Client({
  endPoint: new URL(minioEndpoint).hostname,
  port: parseInt(new URL(minioEndpoint).port) || 9000,
  useSSL: minioEndpoint.startsWith("https://"),
  accessKey: minioAccessKey,
  secretKey: minioSecretKey,
});

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

// Upload file to MinIO
export async function uploadFile(
  storageKey: string,
  buffer: Buffer,
  metadata?: Record<string, string>
) {
  await minioClient.putObject(minioBucket, storageKey, buffer, buffer.length, metadata);
}

// Generate presigned URL for download
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
