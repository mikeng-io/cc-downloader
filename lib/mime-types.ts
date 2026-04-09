import { MimeType } from "@prisma/client";

/**
 * MIME type to file extension mapping
 * Used for extracting file extensions from Content-Type headers
 */

/**
 * Map of MIME types to file extensions
 * Includes common media types and document formats
 */
export const MIME_TO_EXT: Record<string, string> = {
  // Images
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/x-icon': '.ico',

  // Videos
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  'video/x-matroska': '.mkv',
  'video/mpeg': '.mpeg',
  'video/3gpp': '.3gp',
  'video/x-flv': '.flv',

  // Audio
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'audio/aac': '.aac',
  'audio/x-wav': '.wav',
  'audio/webm': '.weba',

  // Documents
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/html': '.html',
  'text/css': '.css',
  'text/javascript': '.js',
  'application/json': '.json',
  'application/xml': '.xml',
  'text/xml': '.xml',

  // Archives
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/x-tar': '.tar',
  'application/x-gzip': '.gz',
  'application/x-7z-compressed': '.7z',

  // Other
  'application/octet-stream': '.bin',
};

/**
 * Get file extension from MIME type
 * @param mimeType - The MIME type string (e.g., "image/jpeg")
 * @returns The file extension including the dot (e.g., ".jpg") or null if not found
 */
export function getExtensionFromMimeType(mimeType: string): string | null {
  if (!mimeType) return null;

  // Handle charset suffix (e.g., "text/plain; charset=utf-8")
  const baseMimeType = mimeType.split(';')[0].trim().toLowerCase();

  return MIME_TO_EXT[baseMimeType] || null;
}

/**
 * Check if a MIME type is supported for extension mapping
 * @param mimeType - The MIME type to check
 * @returns true if the MIME type has a known extension mapping
 */
export function isSupportedMimeType(mimeType: string): boolean {
  if (!mimeType) return false;

  const baseMimeType = mimeType.split(';')[0].trim().toLowerCase();
  return baseMimeType in MIME_TO_EXT;
}

/**
 * Get MIME type category (video, audio, image, document, etc.)
 * @param mimeType - The MIME type string
 * @returns The category string or "unknown"
 */
export function getMimeTypeCategory(mimeType: string): string {
  if (!mimeType) return 'unknown';

  const baseMimeType = mimeType.split(';')[0].trim().toLowerCase();

  if (baseMimeType.startsWith('video/')) return 'video';
  if (baseMimeType.startsWith('audio/')) return 'audio';
  if (baseMimeType.startsWith('image/')) return 'image';
  if (baseMimeType === 'application/pdf') return 'pdf';
  if (baseMimeType.startsWith('text/')) return 'text';

  return 'unknown';
}

const DOWNLOAD_MIME_TO_HTTP: Record<string, string> = {
  VIDEO_MP4: "video/mp4",
  VIDEO_WEBM: "video/webm",
  VIDEO_MOV: "video/quicktime",
  AUDIO_MP3: "audio/mpeg",
  AUDIO_M4A: "audio/mp4",
  AUDIO_WAV: "audio/wav",
  IMAGE_JPEG: "image/jpeg",
  IMAGE_PNG: "image/png",
  IMAGE_GIF: "image/gif",
  IMAGE_WEBP: "image/webp",
  UNKNOWN: "application/octet-stream",
};

export function toHttpContentType(mimeType: MimeType | string | null | undefined): string {
  if (!mimeType) return "application/octet-stream";
  return DOWNLOAD_MIME_TO_HTTP[mimeType] || "application/octet-stream";
}

export function inferDownloadMimeType(
  mimeType: MimeType | string | null | undefined,
  fileName?: string | null,
  storagePath?: string | null,
): MimeType {
  if (mimeType && mimeType !== MimeType.UNKNOWN) {
    return mimeType as MimeType;
  }

  const lowerName = (fileName || "").toLowerCase();
  const lowerPath = (storagePath || "").toLowerCase();
  const value = `${lowerName} ${lowerPath}`;

  if (value.includes(".mp4")) return MimeType.VIDEO_MP4;
  if (value.includes(".webm")) return MimeType.VIDEO_WEBM;
  if (value.includes(".mov")) return MimeType.VIDEO_MOV;
  if (value.includes(".jpg") || value.includes(".jpeg")) return MimeType.IMAGE_JPEG;
  if (value.includes(".png")) return MimeType.IMAGE_PNG;
  if (value.includes(".gif")) return MimeType.IMAGE_GIF;
  if (value.includes(".webp")) return MimeType.IMAGE_WEBP;
  if (value.includes(".mp3")) return MimeType.AUDIO_MP3;
  if (value.includes(".wav")) return MimeType.AUDIO_WAV;
  if (value.includes(".m4a")) return MimeType.AUDIO_M4A;

  return MimeType.UNKNOWN;
}
