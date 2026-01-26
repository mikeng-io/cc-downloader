import { promisify } from "util";
import { execFile } from "child_process";
import { prisma } from "@/lib/prisma";
import { ensureBucket, generateStorageKey, uploadFileStream, getPresignedUrl } from "@/lib/minio";
import { DownloadStatus, MimeType, DownloadType } from "@prisma/client";
import type { Job } from "bullmq";
import type { DownloadJobData } from "@/lib/queue";
import { mkdir, rm, stat, readdir } from "fs/promises";
import { join } from "path";

const execFileAsync = promisify(execFile);

// Configuration from environment
const YTDLP_PATH = process.env.YTDLP_PATH || "yt-dlp";
const YTDLP_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT || "3600000", 10); // 1 hour
const YTDLP_MAX_FILE_SIZE = BigInt(process.env.YTDLP_MAX_FILE_SIZE || "5368709120"); // 5GB

interface YtdlpInfo {
  id: string;
  title: string;
  description?: string;
  uploader?: string;
  uploader_id?: string;
  duration?: number;
  webpage_url: string;
  original_url: string;
  extractor: string;
  extractor_key: string;
  thumbnail?: string;
  filesize?: number;
  format?: string;
  ext?: string;
  fulltitle?: string;
  tags?: string[];
  categories?: string[];
  upload_date?: string;
  view_count?: number;
  like_count?: number;
}

export async function handleYtdlpDownload(job: Job<DownloadJobData>) {
  const { downloadId, userId, url } = job.data;
  const updateProgress = job.updateProgress;

  // Create temp directory for this download
  const tempDir = `/tmp/cc-downloader/${downloadId}`;
  await mkdir(tempDir, { recursive: true });

  try {
    // Step 1: Get video info first
    updateProgress?.(10);
    const info = await getYtdlpInfo(url);

    // Check file size limit
    if (info.filesize && BigInt(info.filesize) > YTDLP_MAX_FILE_SIZE) {
      throw new Error(
        `File size (${(BigInt(info.filesize) / 1024n / 1024n).toString()}MB) exceeds maximum (${(YTDLP_MAX_FILE_SIZE / 1024n / 1024n / 1024n).toString()}GB)`
      );
    }

    // Step 2: Download to temporary file using streaming
    updateProgress?.(20);
    const { filename, filePath } = await downloadWithYtdlp(url, tempDir, (progress) => {
      updateProgress?.(20 + Math.floor(progress * 60)); // 20-80% for download
    });

    // Step 3: Upload to MinIO using streaming (memory efficient)
    updateProgress?.(85);
    await ensureBucket();

    const storageKey = generateStorageKey(userId, downloadId, filename);
    const mimeType = getMimeTypeFromExt(info.ext || "mp4");

    // Get file size for database
    const fileStats = await stat(filePath);

    // Stream upload to MinIO (no buffering in memory)
    await uploadFileStream(
      storageKey,
      filePath,
      {
        "Content-Type": mimeType,
        "downloaded-from": url,
      },
      (bytesUploaded, totalBytes) => {
        // Track upload progress: 85-95%
        const uploadProgress = (bytesUploaded / totalBytes) * 10; // 0-10%
        updateProgress?.(85 + Math.floor(uploadProgress));
      }
    );

    // Step 4: Update database
    updateProgress?.(95);

    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: DownloadStatus.COMPLETED,
        fileName: filename,
        fileSize: BigInt(fileStats.size),
        mimeType,
        storagePath: storageKey,
        title: info.title,
        description: info.description,
        completedAt: new Date(),
        metadata: {
          platform: info.extractor,
          extractor: "yt-dlp",
          ytDlpInfo: {
            extractorKey: info.extractor_key,
            webpageUrl: info.webpage_url,
            originalUrl: info.original_url,
            fulltitle: info.fulltitle,
            description: info.description,
            tags: info.tags,
            likeCount: info.like_count,
            viewCount: info.view_count,
            uploader: info.uploader,
            duration: info.duration,
          },
        },
      },
    });

    updateProgress?.(100);

    // Step 5: Cleanup temp file
    await rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Cleanup temp file on error
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Mark as failed
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: DownloadStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

async function getYtdlpInfo(url: string): Promise<YtdlpInfo> {
  try {
    const { stdout } = await execFileAsync(YTDLP_PATH, [
      "--dump-json",
      "--no-playlist",
      url,
    ], {
      timeout: 30000, // 30 second timeout for info
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function downloadWithYtdlp(
  url: string,
  tempDir: string,
  onProgress?: (progress: number) => void
): Promise<{ filename: string; filePath: string }> {
  const outputFile = join(tempDir, "download.%(ext)s");

  // Use execFile with proper argument array (NEVER exec)
  const args = [
    "-f", "best", // Best quality
    "-o", outputFile,
    "--no-playlist",
    "--newline", // Output progress on new lines for easier parsing
    "--no-warnings", // Reduce noise in output
    url,
  ];

  return new Promise((resolve, reject) => {
    const process = execFile(YTDLP_PATH, args, {
      timeout: YTDLP_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for status output only
    });

    let filename = "download.mp4";
    let lastProgress = 0;

    const parseProgress = (data: string) => {
      // Parse filename from yt-dlp output
      const filenameMatch = data.match(/\[download\] Destination: (.+)/);
      if (filenameMatch?.[1]) {
        filename = filenameMatch[1].split("/").pop() || filename;
      }

      // Parse download progress (more robust regex)
      const progressMatch = data.match(/\[download\]\s+(\d+\.?\d*)%/);
      if (progressMatch?.[1]) {
        const progress = parseFloat(progressMatch[1]) / 100;
        // Only update if progress has increased significantly (reduces database writes)
        if (progress - lastProgress > 0.01) {
          lastProgress = progress;
          onProgress?.(progress);
        }
      }
    };

    process.stdout?.on("data", (data: Buffer) => {
      parseProgress(data.toString());
    });

    process.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      // Only parse progress from stderr, ignore warnings
      if (!output.includes("WARNING")) {
        parseProgress(output);
      }
    });

    process.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
        return;
      }

      try {
        // Find the downloaded file in temp directory
        const files = await readdir(tempDir);
        const downloadedFile = files.find(f => f.startsWith("download."));

        if (!downloadedFile) {
          throw new Error("Downloaded file not found");
        }

        const filePath = join(tempDir, downloadedFile);

        // Verify file exists and has content
        const fileStats = await stat(filePath);
        if (fileStats.size === 0) {
          throw new Error("Downloaded file is empty");
        }

        resolve({ filename: downloadedFile, filePath });
      } catch (error) {
        reject(error);
      }
    });

    process.on("error", (error) => {
      reject(error);
    });
  });
}

function getMimeTypeFromExt(ext: string): MimeType {
  const mimeTypes: Record<string, MimeType> = {
    mp4: MimeType.VIDEO_MP4,
    webm: MimeType.VIDEO_WEBM,
    jpg: MimeType.IMAGE_JPEG,
    jpeg: MimeType.IMAGE_JPEG,
    png: MimeType.IMAGE_PNG,
    gif: MimeType.IMAGE_GIF,
    webp: MimeType.IMAGE_WEBP,
    mp3: MimeType.AUDIO_MP3,
    m4a: MimeType.AUDIO_M4A,
    wav: MimeType.AUDIO_WAV,
  };

  return mimeTypes[ext.toLowerCase()] ?? MimeType.UNKNOWN;
}

// gallery-dl fallback handler
export async function handleGalleryDlDownload(job: Job<DownloadJobData>) {
  const { downloadId, userId, url } = job.data;
  const updateProgress = job.updateProgress;

  // TODO: Implement gallery-dl download logic
  // Similar to yt-dlp but using gallery-dl commands
  throw new Error("gallery-dl fallback not yet implemented");
}
