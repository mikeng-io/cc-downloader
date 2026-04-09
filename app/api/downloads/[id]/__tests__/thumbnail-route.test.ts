import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DownloadStatus, MimeType } from "@prisma/client";

// Mocks must be declared before dynamic imports
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { download: { findUnique: vi.fn() } } }));
vi.mock("@/lib/minio", () => ({ getObjectStream: vi.fn() }));
vi.mock("@/lib/thumbnail-queue", () => ({ addThumbnailJob: vi.fn() }));
// thumbnail-queue depends on bullmq/redis — stub them out
vi.mock("bullmq", () => ({ Queue: vi.fn() }));
vi.mock("@/lib/redis", () => ({ getRedis: vi.fn() }));

const { auth } = await import("@/lib/auth");
const { prisma } = await import("@/lib/prisma");
const { getObjectStream } = await import("@/lib/minio");
const { addThumbnailJob } = await import("@/lib/thumbnail-queue");
const { GET } = await import("@/app/api/downloads/[id]/thumbnail/route");

// Helper to build a NextRequest for the thumbnail endpoint
function makeRequest(id = "dl-123"): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/downloads/${id}/thumbnail`);
  const ctx = { params: Promise.resolve({ id }) };
  return [req, ctx];
}

// A complete download fixture with a thumbnail
const baseDownload = {
  id: "dl-123",
  userId: "user-abc",
  status: DownloadStatus.COMPLETED,
  storagePath: "user-abc/dl-123/file.mp4",
  mimeType: MimeType.VIDEO_MP4,
  thumbnailPath: null as string | null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/downloads/[id]/thumbnail", () => {
  describe("auth", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("download lookup", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-abc" } } as any);
    });

    it("returns 404 when download does not exist", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue(null);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
    });

    it("returns 404 when download belongs to a different user", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        userId: "other-user",
      } as any);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
    });
  });

  describe("when thumbnailPath is set", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-abc" } } as any);
    });

    it("streams the thumbnail from MinIO with 200", async () => {
      const fakeStream = {
        on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
          if (event === "end") cb();
          return fakeStream;
        }),
        destroy: vi.fn(),
      };
      vi.mocked(getObjectStream).mockResolvedValue(fakeStream as any);
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        thumbnailPath: "user-abc/dl-123/thumbnail.jpg",
      } as any);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/jpeg");
      expect(getObjectStream).toHaveBeenCalledWith("user-abc/dl-123/thumbnail.jpg");
      expect(addThumbnailJob).not.toHaveBeenCalled();
    });
  });

  describe("when thumbnailPath is null", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-abc" } } as any);
    });

    it("returns 202 and enqueues job when COMPLETED + storagePath + supported mimeType", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        thumbnailPath: null,
      } as any);
      vi.mocked(addThumbnailJob).mockResolvedValue(undefined);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.status).toBe("generating");
      expect(addThumbnailJob).toHaveBeenCalledWith({
        downloadId: "dl-123",
        userId: "user-abc",
        storagePath: "user-abc/dl-123/file.mp4",
        mimeType: MimeType.VIDEO_MP4,
      });
    });

    it("returns 202 for IMAGE_JPEG (supported mime)", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        mimeType: MimeType.IMAGE_JPEG,
        storagePath: "user-abc/dl-123/file.jpg",
        thumbnailPath: null,
      } as any);
      vi.mocked(addThumbnailJob).mockResolvedValue(undefined);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(202);
    });

    it("returns 404 when status is PROCESSING (not completed)", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        status: DownloadStatus.PROCESSING,
        thumbnailPath: null,
      } as any);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
      expect(addThumbnailJob).not.toHaveBeenCalled();
    });

    it("returns 404 when status is PENDING", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        status: DownloadStatus.PENDING,
        thumbnailPath: null,
      } as any);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
      expect(addThumbnailJob).not.toHaveBeenCalled();
    });

    it("returns 404 when mimeType is AUDIO_MP3 (unsupported)", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        mimeType: MimeType.AUDIO_MP3,
        thumbnailPath: null,
      } as any);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
      expect(addThumbnailJob).not.toHaveBeenCalled();
    });

    it("returns 404 when mimeType is UNKNOWN", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        mimeType: MimeType.UNKNOWN,
        thumbnailPath: null,
      } as any);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
      expect(addThumbnailJob).not.toHaveBeenCalled();
    });

    it("returns 404 when storagePath is null", async () => {
      vi.mocked(prisma.download.findUnique).mockResolvedValue({
        ...baseDownload,
        storagePath: null,
        thumbnailPath: null,
      } as any);

      const [req, ctx] = makeRequest();
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
      expect(addThumbnailJob).not.toHaveBeenCalled();
    });
  });
});
