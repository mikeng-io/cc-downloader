import { NextRequest, NextResponse } from "next/server";
import { DownloadStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getObjectStream } from "@/lib/minio";
import { addThumbnailJob } from "@/lib/thumbnail-queue";

const THUMBNAIL_SUPPORTED_MIMES = new Set([
  "VIDEO_MP4", "VIDEO_WEBM", "VIDEO_MOV",
  "IMAGE_JPEG", "IMAGE_PNG", "IMAGE_GIF", "IMAGE_WEBP",
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

  if (!download.thumbnailPath) {
    const { storagePath } = download;
    if (
      download.status !== DownloadStatus.COMPLETED ||
      !storagePath ||
      !THUMBNAIL_SUPPORTED_MIMES.has(download.mimeType)
    ) {
      return NextResponse.json({ error: "No thumbnail available" }, { status: 404 });
    }

    // Enqueue thumbnail generation (jobId = downloadId ensures deduplication)
    await addThumbnailJob({
      downloadId: download.id,
      userId: download.userId,
      storagePath,
      mimeType: download.mimeType,
    });

    return NextResponse.json({ status: "generating" }, { status: 202 });
  }

  try {
    const stream = await getObjectStream(download.thumbnailPath);

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
    console.error("[thumbnail] Failed to stream thumbnail:", error);
    return NextResponse.json({ error: "Failed to stream thumbnail" }, { status: 500 });
  }
}
