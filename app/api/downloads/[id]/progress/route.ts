import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DownloadStatus } from "@prisma/client";
import { createApiSpan } from "@/lib/otel";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return createApiSpan("GET", `/api/downloads/${id}/progress`, async () => {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      // Get download with progress
      const download = await prisma.download.findUnique({
        where: { id },
        include: {
          progress: true,
        },
      });

      if (!download) {
        return NextResponse.json({ error: "Download not found" }, { status: 404 });
      }

      // Verify ownership
      if (download.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Build response based on status
      const response: any = {
        downloadId: download.id,
        status: download.status,
        updatedAt: download.updatedAt,
      };

      // Add progress if available
      if (download.progress) {
        response.progress = {
          bytesDownloaded: Number(download.progress.bytesDownloaded),
          totalBytes: download.progress.totalBytes
            ? Number(download.progress.totalBytes)
            : null,
          percentage: download.progress.percentage,
          speed: download.progress.speed ? Number(download.progress.speed) : null,
          eta: download.progress.eta ?? null,
        };
      }

      // Add result if completed
      if (download.status === DownloadStatus.COMPLETED) {
        response.result = {
          fileName: download.fileName,
          fileSize: download.fileSize ? Number(download.fileSize) : null,
          mimeType: download.mimeType,
          // downloadUrl will be added when MinIO is integrated
        };
      }

      // Add error if failed
      if (download.status === DownloadStatus.FAILED) {
        response.error = {
          type: "download_failed",
          message: download.errorMessage ?? "Unknown error",
          retryable: download.retryCount < download.maxRetries,
        };
      }

      return NextResponse.json(response);

    } catch (error) {
      console.error("Error fetching progress:", error);
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 }
      );
    }
  });
}
