import { rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import sharp from "sharp";
import { MimeType } from "@prisma/client";
import { uploadFile } from "./minio";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const THUMBNAIL_WIDTH = 400;
const SPRITE_FRAMES = 10;
const FRAME_WIDTH = 320;

const VIDEO_MIME_TYPES = new Set<MimeType>([MimeType.VIDEO_MP4, MimeType.VIDEO_WEBM, MimeType.VIDEO_MOV]);
const IMAGE_MIME_TYPES = new Set<MimeType>([
  MimeType.IMAGE_JPEG,
  MimeType.IMAGE_PNG,
  MimeType.IMAGE_GIF,
  MimeType.IMAGE_WEBP,
]);

export function thumbnailStorageKey(userId: string, downloadId: string): string {
  return `${userId}/${downloadId}/thumbnail.jpg`;
}

async function generateVideoThumbnailBuffer(filePath: string): Promise<Buffer> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { mkdtemp, readFile } = await import("fs/promises");
  const execFileAsync = promisify(execFile);
  const tempDir = await mkdtemp(join(tmpdir(), "cc-thumb-"));
  const outputPath = join(tempDir, "thumb.jpg");
  try {
    await execFileAsync(FFMPEG_PATH, [
      "-i", filePath,
      "-ss", "00:00:01",
      "-vframes", "1",
      "-vf", `scale=${THUMBNAIL_WIDTH}:-1`,
      "-f", "image2",
      outputPath,
    ], { timeout: 30000 });
    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function generateImageThumbnailBuffer(input: string | Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(THUMBNAIL_WIDTH)
    .jpeg({ quality: 80 })
    .toBuffer();
}

export async function generateAndUploadThumbnail(
  sourceFilePath: string,
  mimeType: MimeType,
  userId: string,
  downloadId: string,
): Promise<string | null> {
  const storageKey = thumbnailStorageKey(userId, downloadId);
  try {
    let thumbnailBuffer: Buffer;
    if (VIDEO_MIME_TYPES.has(mimeType)) {
      thumbnailBuffer = await generateVideoThumbnailBuffer(sourceFilePath);
    } else if (IMAGE_MIME_TYPES.has(mimeType)) {
      thumbnailBuffer = await generateImageThumbnailBuffer(sourceFilePath);
    } else {
      return null;
    }
    await uploadFile(storageKey, thumbnailBuffer, { "Content-Type": "image/jpeg" });
    return storageKey;
  } catch (error) {
    console.error(`[thumbnail] Failed to generate thumbnail for ${downloadId}:`, error);
    return null;
  }
}

export async function generateAndUploadThumbnailFromBuffer(
  buffer: Buffer,
  mimeType: MimeType,
  userId: string,
  downloadId: string,
): Promise<string | null> {
  if (VIDEO_MIME_TYPES.has(mimeType)) {
    let tempDir: string | undefined;
    try {
      const { mkdtemp, writeFile } = await import("fs/promises");
      tempDir = await mkdtemp(join(tmpdir(), "cc-thumb-dl-"));
      const tempFilePath = join(tempDir, "source.bin");
      await writeFile(tempFilePath, buffer);
      return await generateAndUploadThumbnail(tempFilePath, mimeType, userId, downloadId);
    } catch (error) {
      console.error(`[thumbnail] Failed to generate thumbnail for ${downloadId}:`, error);
      return null;
    } finally {
      if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  } else if (IMAGE_MIME_TYPES.has(mimeType)) {
    const storageKey = thumbnailStorageKey(userId, downloadId);
    try {
      const thumbnailBuffer = await generateImageThumbnailBuffer(buffer);
      await uploadFile(storageKey, thumbnailBuffer, { "Content-Type": "image/jpeg" });
      return storageKey;
    } catch (error) {
      console.error(`[thumbnail] Failed to generate thumbnail for ${downloadId}:`, error);
      return null;
    }
  }
  return null;
}

export function spriteStorageKey(userId: string, downloadId: string): string {
  return `${userId}/${downloadId}/sprite.jpg`;
}

export async function generateAndUploadSpriteSheet(
  sourceFilePath: string,
  mimeType: MimeType,
  userId: string,
  downloadId: string,
): Promise<string | null> {
  if (!VIDEO_MIME_TYPES.has(mimeType)) {
    return null;
  }

  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const { mkdtemp, readFile } = await import("fs/promises");
    const execFileAsync = promisify(execFile);

    // Get video duration via ffprobe
    const probeResult = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      sourceFilePath,
    ], { timeout: 15000 });
    const duration = parseFloat(JSON.parse(probeResult.stdout).format.duration);

    if (!duration || duration < 2) {
      console.log(`[thumbnail] Skipping sprite for ${downloadId}: duration ${duration}s too short`);
      return null;
    }

    const interval = duration / SPRITE_FRAMES;
    const storageKey = spriteStorageKey(userId, downloadId);

    const tempDir = await mkdtemp(join(tmpdir(), "cc-sprite-"));
    const outputPath = join(tempDir, "sprite.jpg");
    try {
      await execFileAsync(FFMPEG_PATH, [
        "-i", sourceFilePath,
        "-vf", `fps=1/${interval},scale=${FRAME_WIDTH}:-1,tile=${SPRITE_FRAMES}x1`,
        "-frames:v", "1",
        "-q:v", "3",
        outputPath,
      ], { timeout: 60000 });

      const spriteBuffer = await readFile(outputPath);
      await uploadFile(storageKey, spriteBuffer, { "Content-Type": "image/jpeg" });
      return storageKey;
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    console.error(`[thumbnail] Failed to generate sprite sheet for ${downloadId}:`, error);
    return null;
  }
}

export async function generateAndUploadSpriteSheetFromBuffer(
  buffer: Buffer,
  mimeType: MimeType,
  userId: string,
  downloadId: string,
): Promise<string | null> {
  if (!VIDEO_MIME_TYPES.has(mimeType)) {
    return null;
  }

  let tempDir: string | undefined;
  try {
    const { mkdtemp, writeFile } = await import("fs/promises");
    tempDir = await mkdtemp(join(tmpdir(), "cc-sprite-dl-"));
    const tempFilePath = join(tempDir, "source.bin");
    await writeFile(tempFilePath, buffer);
    return await generateAndUploadSpriteSheet(tempFilePath, mimeType, userId, downloadId);
  } catch (error) {
    console.error(`[thumbnail] Failed to generate sprite sheet for ${downloadId}:`, error);
    return null;
  } finally {
    if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
