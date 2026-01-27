import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDownloadJob } from "@/lib/queue";
import { DownloadStatus } from "@prisma/client";
import { createApiSpan } from "@/lib/otel";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return createApiSpan("POST", `/api/downloads/${id}/retry`, async () => {
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

      // Only allow retry for FAILED downloads
      if (download.status !== DownloadStatus.FAILED) {
        return NextResponse.json(
          { error: "Can only retry failed downloads" },
          { status: 400 }
        );
      }

      // Reset download state for retry
      await prisma.download.update({
        where: { id },
        data: {
          status: DownloadStatus.PENDING,
          errorMessage: null,
          errorType: null,
          retryCount: 0,
          startedAt: null,
          completedAt: null,
        },
      });

      // Re-queue the download job
      await addDownloadJob({
        downloadId: download.id,
        userId: download.userId,
        url: download.sourceUrl,
        downloadType: download.downloadType as "DIRECT" | "YTDLP" | "GALLERY_DL",
      });

      return NextResponse.json({
        success: true,
        message: "Download queued for retry",
      });
    } catch (error) {
      console.error("Error retrying download:", error);
      return NextResponse.json(
        { error: "Failed to retry download" },
        { status: 500 }
      );
    }
  });
}
