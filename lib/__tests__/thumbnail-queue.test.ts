import { describe, it, expect, vi, beforeEach } from "vitest";
import { MimeType } from "@prisma/client";

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock BullMQ Queue
const mockQueueAdd = vi.fn().mockResolvedValue(undefined);
const mockQueueInstance = { add: mockQueueAdd };
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => mockQueueInstance),
  Worker: vi.fn().mockImplementation((_name: string, processor: unknown, _opts: unknown) => ({
    on: vi.fn(),
    process: processor,
  })),
}));

// Mock Redis
vi.mock("../redis", () => ({
  getRedis: vi.fn().mockReturnValue({}),
}));

// Mock Prisma
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue({});
vi.mock("../prisma", () => ({
  prisma: {
    download: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

// Mock MinIO getObjectStream — returns a simple readable stream
const mockGetObjectStream = vi.fn();
vi.mock("../minio", () => ({
  getObjectStream: mockGetObjectStream,
}));

// Mock generateAndUploadThumbnailFromBuffer and generateAndUploadSpriteSheetFromBuffer
const mockGenerateThumbnail = vi.fn();
const mockGenerateSprite = vi.fn();
vi.mock("../thumbnail", () => ({
  generateAndUploadThumbnailFromBuffer: mockGenerateThumbnail,
  generateAndUploadSpriteSheetFromBuffer: mockGenerateSprite,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { Readable } from "stream";

function makeReadable(data: Buffer): Readable {
  const stream = new Readable({ read() {} });
  stream.push(data);
  stream.push(null);
  return stream;
}

// ── Import modules under test (after mocks are set up) ───────────────────────

const { addThumbnailJob, getThumbnailQueue, _resetThumbnailQueue } = await import("../thumbnail-queue");

// We need the raw worker processor — pull it from the Worker mock calls.
// Import createThumbnailWorker so we can call it and extract the processor.
import { Worker, Queue } from "bullmq";
const { createThumbnailWorker } = await import("../workers/thumbnail-worker");

// ── Tests ────────────────────────────────────────────────────────────────────

describe("addThumbnailJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls queue.add with jobId set to downloadId for deduplication", async () => {
    const data = {
      downloadId: "dl-123",
      userId: "user-1",
      storagePath: "user-1/dl-123/video.mp4",
      mimeType: "VIDEO_MP4",
    };

    await addThumbnailJob(data);

    expect(mockQueueAdd).toHaveBeenCalledWith("thumbnail", data, {
      jobId: "dl-123",
    });
  });

  it("allows callers to override jobId for sprite backfills", async () => {
    const data = {
      downloadId: "dl-123",
      userId: "user-1",
      storagePath: "user-1/dl-123/video.mp4",
      mimeType: "VIDEO_MP4",
    };

    await addThumbnailJob(data, { jobId: "dl-123-sprite" });

    expect(mockQueueAdd).toHaveBeenCalledWith("thumbnail", data, {
      jobId: "dl-123-sprite",
    });
  });

  it("uses the same queue instance on repeated calls (singleton)", async () => {
    _resetThumbnailQueue();
    vi.clearAllMocks();
    const q1 = getThumbnailQueue();
    const q2 = getThumbnailQueue();
    expect(q1).toBe(q2);
    expect(Queue).toHaveBeenCalledTimes(1);
  });
});

describe("thumbnail worker processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper: create the worker and grab the processor fn from the mock
  function getProcessor() {
    vi.mocked(Worker).mockClear();
    createThumbnailWorker();
    const [, processor] = vi.mocked(Worker).mock.calls[0] as [string, Function, unknown];
    return processor;
  }

  function makeJob(overrides: Partial<{ downloadId: string; userId: string; storagePath: string; mimeType: string }> = {}) {
    return {
      data: {
        downloadId: "dl-abc",
        userId: "user-1",
        storagePath: "user-1/dl-abc/file.mp4",
        mimeType: "VIDEO_MP4",
        ...overrides,
      },
    };
  }

  it("skips when download record not found", async () => {
    const processor = getProcessor();
    mockFindUnique.mockResolvedValue(null);

    await processor(makeJob());

    expect(mockGetObjectStream).not.toHaveBeenCalled();
    expect(mockGenerateThumbnail).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("skips processing when thumbnailPath is already set", async () => {
    const processor = getProcessor();
    mockFindUnique.mockResolvedValue({ thumbnailPath: "user-1/dl-abc/thumbnail.jpg" });

    await processor(makeJob());

    expect(mockGetObjectStream).not.toHaveBeenCalled();
    expect(mockGenerateThumbnail).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("calls generateAndUploadThumbnailFromBuffer and updates DB on success", async () => {
    const processor = getProcessor();
    mockFindUnique.mockResolvedValue({ thumbnailPath: null });

    const fakeBuffer = Buffer.from("video-bytes");
    mockGetObjectStream.mockResolvedValue(makeReadable(fakeBuffer));
    mockGenerateThumbnail.mockResolvedValue("user-1/dl-abc/thumbnail.jpg");
    mockGenerateSprite.mockResolvedValue("user-1/dl-abc/sprite.jpg");

    await processor(makeJob());

    expect(mockGetObjectStream).toHaveBeenCalledWith("user-1/dl-abc/file.mp4");
    expect(mockGenerateThumbnail).toHaveBeenCalledWith(
      fakeBuffer,
      MimeType.VIDEO_MP4,
      "user-1",
      "dl-abc"
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "dl-abc" },
      data: { thumbnailPath: "user-1/dl-abc/thumbnail.jpg", spritePath: "user-1/dl-abc/sprite.jpg" },
    });
  });

  it("does not update DB when both thumbnail and sprite return null", async () => {
    const processor = getProcessor();
    mockFindUnique.mockResolvedValue({ thumbnailPath: null });

    mockGetObjectStream.mockResolvedValue(makeReadable(Buffer.from("audio-bytes")));
    mockGenerateThumbnail.mockResolvedValue(null);
    mockGenerateSprite.mockResolvedValue(null);

    await processor(makeJob({ mimeType: "AUDIO_MP3" }));

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rethrows when generateAndUploadThumbnailFromBuffer throws (enables BullMQ retry)", async () => {
    const processor = getProcessor();
    mockFindUnique.mockResolvedValue({ thumbnailPath: null });

    mockGetObjectStream.mockResolvedValue(makeReadable(Buffer.from("data")));
    mockGenerateThumbnail.mockRejectedValue(new Error("ffmpeg crash"));

    await expect(processor(makeJob())).rejects.toThrow("ffmpeg crash");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rethrows when getObjectStream throws (enables BullMQ retry)", async () => {
    const processor = getProcessor();
    mockFindUnique.mockResolvedValue({ thumbnailPath: null });

    mockGetObjectStream.mockRejectedValue(new Error("MinIO unavailable"));

    await expect(processor(makeJob())).rejects.toThrow("MinIO unavailable");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
