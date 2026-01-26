import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDownloadJob } from "@/lib/queue";
import { DownloadStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

    // Reset download status
    await prisma.download.update({
      where: { id },
      data: {
        status: DownloadStatus.PENDING,
        errorMessage: null,
        retryCount: 0,
        startedAt: null,
        completedAt: null,
      },
    });

    // Re-queue the job
    await addDownloadJob({
      downloadId: download.id,
      userId: download.userId,
      url: download.sourceUrl,
      downloadType: download.downloadType as "DIRECT" | "YTDLP" | "GALLERY_DL",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error retrying download:", error);
    return NextResponse.json(
      { error: "Failed to retry download" },
      { status: 500 }
    );
  }
}
