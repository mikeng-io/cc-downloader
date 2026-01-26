import { describe, it, expect } from "vitest";
import { detectDownloadType, isYtdlpSupported, isDirectDownload } from "@/lib/source-detector";
import { DownloadType } from "@prisma/client";

describe("Source Detector", () => {
  describe("detectDownloadType", () => {
    it("should detect YouTube URLs", () => {
      const result = detectDownloadType("https://www.youtube.com/watch?v=123");
      expect(result).toBe(DownloadType.YTDLP);
    });

    it("should detect YouTube short URLs", () => {
      const result = detectDownloadType("https://youtu.be/123");
      expect(result).toBe(DownloadType.YTDLP);
    });

    it("should detect TikTok URLs", () => {
      const result = detectDownloadType("https://www.tiktok.com/@user/video/123");
      expect(result).toBe(DownloadType.YTDLP);
    });

    it("should detect TikTok short URLs", () => {
      const result = detectDownloadType("https://vm.tiktok.com/xyz");
      expect(result).toBe(DownloadType.YTDLP);
    });

    it("should detect Instagram URLs", () => {
      const result = detectDownloadType("https://www.instagram.com/p/xyz/");
      expect(result).toBe(DownloadType.YTDLP);
    });

    it("should detect Twitter/X URLs", () => {
      const result = detectDownloadType("https://x.com/user/status/123");
      expect(result).toBe(DownloadType.YTDLP);
    });

    it("should detect direct MP4 downloads", () => {
      const result = detectDownloadType("https://example.com/video.mp4");
      expect(result).toBe(DownloadType.DIRECT);
    });

    it("should detect direct image downloads", () => {
      const result = detectDownloadType("https://example.com/image.jpg");
      expect(result).toBe(DownloadType.DIRECT);
    });

    it("should default unknown URLs to DIRECT", () => {
      const result = detectDownloadType("https://unknown-site.com/file");
      expect(result).toBe(DownloadType.DIRECT);
    });
  });

  describe("isYtdlpSupported", () => {
    it("should return true for YouTube", () => {
      expect(isYtdlpSupported("https://youtube.com/watch?v=123")).toBe(true);
    });

    it("should return true for TikTok", () => {
      expect(isYtdlpSupported("https://tiktok.com/@user/video")).toBe(true);
    });

    it("should return true for Instagram", () => {
      expect(isYtdlpSupported("https://instagram.com/p/abc/")).toBe(true);
    });

    it("should return false for direct downloads", () => {
      expect(isYtdlpSupported("https://example.com/file.mp4")).toBe(false);
    });
  });

  describe("isDirectDownload", () => {
    it("should return true for files with extensions", () => {
      expect(isDirectDownload("https://example.com/video.mp4")).toBe(true);
    });

    it("should return true for images", () => {
      expect(isDirectDownload("https://example.com/photo.jpg")).toBe(true);
    });

    it("should return true for audio files", () => {
      expect(isDirectDownload("https://example.com/audio.mp3")).toBe(true);
    });

    it("should return false for yt-dlp platforms", () => {
      expect(isDirectDownload("https://youtube.com/watch?v=123")).toBe(false);
    });

    it("should return true for unknown platforms", () => {
      expect(isDirectDownload("https://unknown-site.com/path")).toBe(true);
    });
  });
});
