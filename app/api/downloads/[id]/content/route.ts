import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFileStats, getObjectStream } from "@/lib/minio";
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

      // Get stream from MinIO
      const stream = await getObjectStream(download.storagePath);

      // Create a readable stream wrapper with range support
      let bytesRead = 0;
      const readableStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk: Buffer) => {
            const chunkEnd = bytesRead + chunk.length;

            // Skip bytes before range start
            if (chunkEnd <= start) {
              bytesRead = chunkEnd;
              return;
            }

            // Stop after range end
            if (bytesRead > end) {
              stream.destroy();
              controller.close();
              return;
            }

            // Handle partial chunk at start of range
            let startOffset = 0;
            if (bytesRead < start) {
              startOffset = start - bytesRead;
            }

            // Handle partial chunk at end of range
            let endOffset = chunk.length;
            if (chunkEnd > end + 1) {
              endOffset = chunk.length - (chunkEnd - end - 1);
            }

            const slicedChunk = chunk.slice(startOffset, endOffset);
            bytesRead = chunkEnd;

            controller.enqueue(new Uint8Array(slicedChunk));
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
