import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server-Sent Events endpoint for real-time download progress
 * Replaces polling with push-based updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify ownership
  const download = await prisma.download.findUnique({
    where: { id },
    include: { progress: true },
  });

  if (!download || download.userId !== session.user.id) {
    return new Response("Not found", { status: 404 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown, event?: string) => {
        const message = event ? `event: ${event}\n` : "";
        controller.enqueue(
          encoder.encode(`${message}data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Send initial state
      sendEvent({
        downloadId: download.id,
        status: download.status,
        progress: download.progress
          ? {
              bytesDownloaded: Number(download.progress.bytesDownloaded),
              totalBytes: download.progress.totalBytes
                ? Number(download.progress.totalBytes)
                : null,
              percentage: download.progress.percentage,
              speed: download.progress.speed ? Number(download.progress.speed) : null,
              eta: download.progress.eta ?? null,
            }
          : null,
        result: download.status === "COMPLETED"
          ? {
              fileName: download.fileName,
              fileSize: download.fileSize ? Number(download.fileSize) : null,
              mimeType: download.mimeType,
            }
          : null,
        error: download.status === "FAILED"
          ? {
              type: "download_failed",
              message: download.errorMessage ?? "Unknown error",
              retryable: download.retryCount < download.maxRetries,
            }
          : null,
      });

      // If already completed or failed, close the connection
      if (download.status === "COMPLETED" || download.status === "FAILED") {
        sendEvent({ done: true }, "done");
        controller.close();
        return;
      }

      // Set up polling interval for progress updates
      // TODO: Replace with Redis Pub/Sub for true real-time updates
      const interval = setInterval(async () => {
        try {
          const updatedDownload = await prisma.download.findUnique({
            where: { id },
            include: { progress: true },
          });

          if (!updatedDownload) {
            clearInterval(interval);
            controller.close();
            return;
          }

          // Send updated progress
          sendEvent({
            downloadId: updatedDownload.id,
            status: updatedDownload.status,
            progress: updatedDownload.progress
              ? {
                  bytesDownloaded: Number(updatedDownload.progress.bytesDownloaded),
                  totalBytes: updatedDownload.progress.totalBytes
                    ? Number(updatedDownload.progress.totalBytes)
                    : null,
                  percentage: updatedDownload.progress.percentage,
                  speed: updatedDownload.progress.speed
                    ? Number(updatedDownload.progress.speed)
                    : null,
                  eta: updatedDownload.progress.eta ?? null,
                }
              : null,
            result: updatedDownload.status === "COMPLETED"
              ? {
                  fileName: updatedDownload.fileName,
                  fileSize: updatedDownload.fileSize
                    ? Number(updatedDownload.fileSize)
                    : null,
                  mimeType: updatedDownload.mimeType,
                }
              : null,
            error: updatedDownload.status === "FAILED"
              ? {
                  type: "download_failed",
                  message: updatedDownload.errorMessage ?? "Unknown error",
                  retryable: updatedDownload.retryCount < updatedDownload.maxRetries,
                }
              : null,
          });

          // Close connection if download is complete or failed
          if (
            updatedDownload.status === "COMPLETED" ||
            updatedDownload.status === "FAILED"
          ) {
            clearInterval(interval);
            sendEvent({ done: true }, "done");
            controller.close();
          }
        } catch (error) {
          console.error("Error polling progress:", error);
          clearInterval(interval);
          controller.error(error);
        }
      }, 2000); // Poll every 2 seconds (much less frequent than 5 seconds)

      // Clean up on connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
