import { describe, it, expect, vi, beforeEach } from "vitest";
import { MimeType } from "@prisma/client";

vi.mock("child_process", () => ({ execFile: vi.fn() }));
vi.mock("util", () => ({
  promisify: vi.fn((fn: unknown) => fn),
}));
vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-jpeg-data")),
  }),
}));
vi.mock("fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("fs/promises")>();
  return {
    ...real,
    mkdtemp: vi.fn().mockResolvedValue("/tmp/fake-thumb-abc"),
    rm: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from("fake-ffmpeg-output")),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock("../minio", () => ({
  uploadFile: vi.fn().mockResolvedValue(undefined),
}));

const { thumbnailStorageKey, generateAndUploadThumbnail, generateAndUploadThumbnailFromBuffer } =
  await import("../thumbnail");
const { uploadFile } = await import("../minio");
const sharp = (await import("sharp")).default;

describe("thumbnailStorageKey", () => {
  it("returns deterministic path", () => {
    expect(thumbnailStorageKey("user1", "dl1")).toBe("user1/dl1/thumbnail.jpg");
  });
});

describe("generateAndUploadThumbnail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for AUDIO mimeType", async () => {
    const result = await generateAndUploadThumbnail("/path/file.mp3", MimeType.AUDIO_MP3, "u1", "d1");
    expect(result).toBeNull();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("returns null for UNKNOWN mimeType", async () => {
    const result = await generateAndUploadThumbnail("/path/file.bin", MimeType.UNKNOWN, "u1", "d1");
    expect(result).toBeNull();
  });

  it("uses sharp for IMAGE_JPEG and returns storage key", async () => {
    const result = await generateAndUploadThumbnail("/path/img.jpg", MimeType.IMAGE_JPEG, "u1", "d1");
    expect(sharp).toHaveBeenCalledWith("/path/img.jpg");
    expect(uploadFile).toHaveBeenCalledWith(
      "u1/d1/thumbnail.jpg",
      expect.any(Buffer),
      { "Content-Type": "image/jpeg" }
    );
    expect(result).toBe("u1/d1/thumbnail.jpg");
  });

  it("returns null without throwing if generation fails", async () => {
    vi.mocked(sharp).mockReturnValueOnce({
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockRejectedValue(new Error("sharp crash")),
    } as any);
    const result = await generateAndUploadThumbnail("/path/img.png", MimeType.IMAGE_PNG, "u1", "d1");
    expect(result).toBeNull();
  });

  it("calls ffmpeg for VIDEO_MP4 and returns storage key", async () => {
    const { execFile } = await import("child_process");
    vi.mocked(execFile).mockResolvedValue(undefined as any);
    const result = await generateAndUploadThumbnail("/path/video.mp4", MimeType.VIDEO_MP4, "u1", "d1");
    expect(vi.mocked(execFile)).toHaveBeenCalled();
    expect(uploadFile).toHaveBeenCalledWith("u1/d1/thumbnail.jpg", expect.any(Buffer), { "Content-Type": "image/jpeg" });
    expect(result).toBe("u1/d1/thumbnail.jpg");
  });
});

describe("generateAndUploadThumbnailFromBuffer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for non-image non-video types", async () => {
    const result = await generateAndUploadThumbnailFromBuffer(
      Buffer.from("data"), MimeType.AUDIO_MP3, "u1", "d1"
    );
    expect(result).toBeNull();
  });

  it("calls sharp with buffer for IMAGE_WEBP", async () => {
    const buf = Buffer.from("png-bytes");
    const result = await generateAndUploadThumbnailFromBuffer(buf, MimeType.IMAGE_WEBP, "u1", "d1");
    expect(sharp).toHaveBeenCalledWith(buf);
    expect(result).toBe("u1/d1/thumbnail.jpg");
  });

  it("writes temp file and delegates for VIDEO_MP4", async () => {
    const { execFile } = await import("child_process");
    vi.mocked(execFile).mockResolvedValue(undefined as any);
    const buf = Buffer.from("video-bytes");
    const result = await generateAndUploadThumbnailFromBuffer(buf, MimeType.VIDEO_MP4, "u1", "d1");
    expect(result).toBe("u1/d1/thumbnail.jpg");
  });
});
