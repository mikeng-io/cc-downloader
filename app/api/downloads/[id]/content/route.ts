import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFileStats, getObjectStream, getPartialObjectStream } from "@/lib/minio";
import { DownloadStatus } from "@prisma/client";
import { createApiSpan } from "@/lib/otel";


/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * HEAD request for video players to get file metadata without downloading
 * This is called before actual streaming to determine file size
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    const download = await prisma.download.findUnique({
      where: { id },
    });

    if (!download || download.userId !== session.user.id) {
      return new NextResponse(null, { status: 404 });
    }

    if (download.status !== DownloadStatus.COMPLETED || !download.storagePath) {
      return new NextResponse(null, { status: 400 });
    }

    const stats = await getFileStats(download.storagePath);

    const contentTypeMap: Record<string, string> = {
      VIDEO_MP4: "video/mp4",
      VIDEO_WEBM: "video/webm",
      AUDIO_MP3: "audio/mpeg",
      AUDIO_M4A: "audio/mp4",
      AUDIO_WAV: "audio/wav",
      IMAGE_JPEG: "image/jpeg",
      IMAGE_PNG: "image/png",
      IMAGE_GIF: "image/gif",
      IMAGE_WEBP: "image/webp",
      UNKNOWN: "application/octet-stream",
    };

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentTypeMap[download.mimeType] || "application/octet-stream",
        "Content-Length": stats.size.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("HEAD error:", error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * Stream video/audio files from MinIO with Range request support
 * Supports seeking for video players (required for iOS Safari)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return createApiSpan("GET", `/api/downloads/${id}/content`, async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const download = await prisma.download.findUnique({
        where: { id },
      });

      if (!download) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (download.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (download.status !== DownloadStatus.COMPLETED || !download.storagePath) {
        return NextResponse.json({ error: "Download not completed" }, { status: 400 });
      }

      // Get file stats from MinIO
      const stats = await getFileStats(download.storagePath);
      const fileSize = stats.size;

      // Parse Range header for video seeking
      const rangeHeader = request.headers.get("range");
      let start = 0;
      let end = fileSize - 1;

      if (rangeHeader) {
        const range = rangeHeader.replace(/bytes=/, "").split("-");
        start = parseInt(range[0], 10) || 0;
        end = range[1] ? parseInt(range[1], 10) : fileSize - 1;

        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          return new NextResponse("Requested Range Not Satisfiable", {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
          });
        }
      }

      const contentLength = end - start + 1;
      const isPartial = rangeHeader !== null;

      // Use native MinIO range requests for efficiency
      // This only fetches the requested bytes, not the entire file
      const stream = isPartial
        ? await getPartialObjectStream(download.storagePath, start, contentLength)
        : await getObjectStream(download.storagePath);

      // Create a readable stream wrapper
      const readableStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          stream.on("end", () => {
            controller.close();
          });
          stream.on("error", (err) => {
            console.error("Stream error:", err);
            controller.error(err);
          });
        },
        cancel() {
          stream.destroy();
        },
      });

      // Determine content type based on mime type
      const contentTypeMap: Record<string, string> = {
        VIDEO_MP4: "video/mp4",
        VIDEO_WEBM: "video/webm",
        AUDIO_MP3: "audio/mpeg",
        AUDIO_M4A: "audio/mp4",
        AUDIO_WAV: "audio/wav",
        IMAGE_JPEG: "image/jpeg",
        IMAGE_PNG: "image/png",
        IMAGE_GIF: "image/gif",
        IMAGE_WEBP: "image/webp",
        UNKNOWN: "application/octet-stream",
      };

      const contentType = contentTypeMap[download.mimeType] || "application/octet-stream";

      const headers = new Headers({
        "Content-Type": contentType,
        "Content-Length": contentLength.toString(),
        "Accept-Ranges": "bytes",
        // Cache in browser only (not CDN) for 1 hour - faster repeat views, but secure
        "Cache-Control": "private, max-age=3600",
        "CDN-Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${download.fileName || "download"}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
      });

      if (isPartial) {
        headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      }

      return new NextResponse(readableStream, {
        status: isPartial ? 206 : 200,
        headers,
      });
    } catch (error) {
      console.error("Error streaming file:", error);
      return NextResponse.json(
        { error: "Failed to stream file" },
        { status: 500 }
      );
    }
  });
}
