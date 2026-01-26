import { DownloadType } from "@prisma/client";

/**
 * yt-dlp supported platforms (extracted from yt-dlp extractors list)
 * This is a curated list of popular platforms
 */
const YTDLP_PLATFORMS = [
  // Social media
  "instagram.com", "www.instagram.com",
  "tiktok.com", "www.tiktok.com", "vm.tiktok.com",
  "twitter.com", "x.com", "mobile.twitter.com",
  "facebook.com", "www.facebook.com", "fb.watch",
  "youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com",
  "vimeo.com", "www.vimeo.com",
  "twitch.tv", "www.twitch.tv",
  "reddit.com", "www.reddit.com", "v.redd.it",
  "snapchat.com",
  "pinterest.com", "www.pinterest.com",
  "tiktokcdn.com",

  // Video platforms
  "dailymotion.com", "www.dailymotion.com",
  "vid.me",
  "vine.co",
  "metacafe.com",

  // Audio platforms
  "soundcloud.com", "www.soundcloud.com",
  "spotify.com", "open.spotify.com",
  "music.youtube.com",

  // Chinese platforms
  "bilibili.com", "www.bilibili.com",
  "weibo.com",
  "douyin.com",

  // Image/gallery platforms
  "imgur.com", "www.imgur.com",
  "flickr.com", "www.flickr.com",
  "deviantart.com", "www.deviantart.com",
];

/**
 * Direct file extensions that should bypass yt-dlp
 */
const DIRECT_FILE_EXTENSIONS = [
  ".mp4", ".webm", ".mkv", ".avi", ".mov", ".wmv", ".flv",
  ".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp",
  ".zip", ".rar", ".7z", ".tar", ".gz",
  ".pdf", ".doc", ".docx", ".txt",
];

/**
 * Detect if a URL should use yt-dlp or direct download
 */
export function detectDownloadType(url: string): DownloadType {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();

    // Check for direct file download by extension
    if (DIRECT_FILE_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      return DownloadType.DIRECT;
    }

    // Check if URL matches yt-dlp supported platforms
    if (YTDLP_PLATFORMS.some(platform => hostname === platform || hostname.endsWith(`.${platform}`))) {
      return DownloadType.YTDLP;
    }

    // Default to DIRECT for unknown URLs
    // yt-dlp worker can retry with GALLERY_DL if DIRECT fails
    return DownloadType.DIRECT;
  } catch {
    // If URL parsing fails, default to DIRECT
    return DownloadType.DIRECT;
  }
}

/**
 * Check if a URL is likely to be supported by yt-dlp
 */
export function isYtdlpSupported(url: string): boolean {
  return detectDownloadType(url) === DownloadType.YTDLP;
}

/**
 * Check if a URL appears to be a direct file link
 */
export function isDirectDownload(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();

    // Has direct file extension
    if (DIRECT_FILE_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      return true;
    }

    // Not a yt-dlp platform
    return !isYtdlpSupported(url);
  } catch {
    return false;
  }
}
