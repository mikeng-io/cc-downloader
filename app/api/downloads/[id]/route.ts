import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelDownloadJob } from "@/lib/queue";
import { deleteFile } from "@/lib/minio";

export async function GET(
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
      include: { progress: true },
    });

    if (!download) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (download.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(download);
  } catch (error) {
    console.error("Error fetching download:", error);
    return NextResponse.json(
      { error: "Failed to fetch download" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Cancel job if still pending/processing
    if (download.status === "PENDING" || download.status === "PROCESSING") {
      await cancelDownloadJob(id);
    }

    // Delete file from MinIO
    if (download.storagePath) {
      try {
        await deleteFile(download.storagePath);
      } catch (error) {
        console.error("Failed to delete file from MinIO:", error);
      }
    }

    // Delete database record
    await prisma.download.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting download:", error);
    return NextResponse.json(
      { error: "Failed to delete download" },
      { status: 500 }
    );
  }
}
