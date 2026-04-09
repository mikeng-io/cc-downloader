import { describe, it, expect, vi } from "vitest";
import { MimeType } from "@prisma/client";

// ── Mocks (must come before any imports of queue.ts) ─────────────────────────

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: vi.fn() })),
  Worker: vi.fn().mockImplementation(() => ({ on: vi.fn() })),
  Job: vi.fn(),
}));

vi.mock("../redis", () => ({
  getRedis: vi.fn().mockReturnValue({}),
}));

vi.mock("../prisma", () => ({
  prisma: {
    download: { update: vi.fn().mockResolvedValue({}) },
    userQuota: { upsert: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("../minio", () => ({
  ensureBucket: vi.fn().mockResolvedValue(undefined),
  generateStorageKey: vi.fn().mockReturnValue("user/dl/file"),
  uploadFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../workers/ytdlp-worker", () => ({
  handleYtdlpDownload: vi.fn(),
  handleGalleryDlDownload: vi.fn(),
}));

vi.mock("../mime-types", () => ({
  getExtensionFromMimeType: vi.fn().mockReturnValue(".bin"),
}));

vi.mock("../thumbnail", () => ({
  generateAndUploadThumbnailFromBuffer: vi.fn().mockResolvedValue(null),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { getMimeTypeFromContentType } = await import("../queue");

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getMimeTypeFromContentType", () => {
  it("returns VIDEO_MP4 for video/mp4", () => {
    expect(getMimeTypeFromContentType("video/mp4")).toBe(MimeType.VIDEO_MP4);
  });

  it("returns VIDEO_WEBM for video/webm", () => {
    expect(getMimeTypeFromContentType("video/webm")).toBe(MimeType.VIDEO_WEBM);
  });

  it("returns VIDEO_MOV for video/quicktime", () => {
    expect(getMimeTypeFromContentType("video/quicktime")).toBe(MimeType.VIDEO_MOV);
  });

  it("returns VIDEO_MOV for video/mov", () => {
    expect(getMimeTypeFromContentType("video/mov")).toBe(MimeType.VIDEO_MOV);
  });

  it("returns VIDEO_MOV for content-type with charset suffix", () => {
    expect(getMimeTypeFromContentType("video/quicktime; charset=utf-8")).toBe(MimeType.VIDEO_MOV);
  });

  it("returns IMAGE_JPEG for image/jpeg", () => {
    expect(getMimeTypeFromContentType("image/jpeg")).toBe(MimeType.IMAGE_JPEG);
  });

  it("returns UNKNOWN for null", () => {
    expect(getMimeTypeFromContentType(null)).toBe(MimeType.UNKNOWN);
  });

  it("returns UNKNOWN for unrecognized type", () => {
    expect(getMimeTypeFromContentType("application/octet-stream")).toBe(MimeType.UNKNOWN);
  });
});
