import { NextRequest, NextResponse } from "next/server";
import { DownloadStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getObjectStream } from "@/lib/minio";
import { addThumbnailJob } from "@/lib/thumbnail-queue";
import { inferDownloadMimeType } from "@/lib/mime-types";

const SPRITE_SUPPORTED_MIMES = new Set([
  "VIDEO_MP4", "VIDEO_WEBM", "VIDEO_MOV",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const download = await prisma.download.findUnique({ where: { id } });

  if (!download || download.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const effectiveMimeType = inferDownloadMimeType(
    download.mimeType,
    download.fileName,
    download.storagePath,
  );

  console.info("[sprite] Request received", {
    ts: new Date().toISOString(),
    downloadId: download.id,
    userId: download.userId,
    status: download.status,
    hasThumbnail: Boolean(download.thumbnailPath),
    hasSprite: Boolean(download.spritePath),
    mimeType: effectiveMimeType,
  });

  if (!download.spritePath) {
    const { storagePath } = download;
    if (
      download.status !== DownloadStatus.COMPLETED ||
      !storagePath ||
      !SPRITE_SUPPORTED_MIMES.has(effectiveMimeType)
    ) {
      return NextResponse.json({ error: "No sprite available" }, { status: 404 });
    }

    const jobId = download.thumbnailPath ? `${download.id}-sprite` : download.id;

    await addThumbnailJob({
      downloadId: download.id,
      userId: download.userId,
      storagePath,
      mimeType: effectiveMimeType,
    }, { jobId });

    console.info("[sprite] Enqueued generation job", {
      ts: new Date().toISOString(),
      downloadId: download.id,
      jobId,
    });

    return NextResponse.json({ status: "generating" }, { status: 202 });
  }

  try {
    const stream = await getObjectStream(download.spritePath);

    const readableStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[sprite] Failed to stream sprite sheet:", error);
    return NextResponse.json({ error: "Failed to stream sprite sheet" }, { status: 500 });
  }
}
