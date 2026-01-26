import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDownloadJob } from "@/lib/queue";
import { DownloadStatus, DownloadType } from "@prisma/client";
import { createApiSpan } from "@/lib/otel";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

      if (download.status !== DownloadStatus.FAILED) {
        return NextResponse.json(
          { error: "Can only retry failed downloads" },
          { status: 400 }
        );
      }

      // Check retry limit before allowing retry
      if (download.retryCount >= download.maxRetries) {
        return NextResponse.json(
          { error: "Maximum retry limit reached" },
          { status: 400 }
        );
      }

      // Use transaction to prevent race conditions
      await prisma.$transaction(async (tx) => {
        // Re-fetch to ensure status hasn't changed
        const latestDownload = await tx.download.findUnique({
          where: { id },
        });

        if (!latestDownload || latestDownload.status !== DownloadStatus.FAILED) {
          throw new Error("Download status changed or no longer exists");
        }

        // Reset download status
        await tx.download.update({
          where: { id },
          data: {
            status: DownloadStatus.PENDING,
            errorMessage: null,
            retryCount: { increment: 1 },
            startedAt: null,
            completedAt: null,
          },
        });

        // Re-queue the job
        await addDownloadJob({
          downloadId: download.id,
          userId: download.userId,
          url: download.sourceUrl,
          downloadType: download.downloadType as DownloadType,
        });
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error retrying download:", error);
      return NextResponse.json(
        { error: "Failed to retry download" },
        { status: 500 }
      );
    }
  });
}
