import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelDownloadJob } from "@/lib/queue";
import { deleteFile } from "@/lib/minio";
import { createApiSpan } from "@/lib/otel";
import { DownloadStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return createApiSpan("GET", `/api/downloads/${id}`, async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return createApiSpan("DELETE", `/api/downloads/${id}`, async () => {
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

      // Cancel job if still pending/processing
      if (download.status === DownloadStatus.PENDING || download.status === DownloadStatus.PROCESSING) {
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

      // Update user storage quota (decrement if file had a size)
      if (download.fileSize) {
        try {
          await prisma.userQuota.update({
            where: { userId: session.user.id },
            data: {
              totalStorage: { decrement: download.fileSize },
              fileCount: { decrement: 1 },
            },
          });
        } catch (error) {
          // If quota record doesn't exist, create it with zero values
          // This handles the case where downloads were created before quota tracking
          if (error instanceof Error && error.message.includes("Record not found")) {
            await prisma.userQuota.create({
              data: {
                userId: session.user.id,
                totalStorage: BigInt(0),
                fileCount: 0,
                storageLimit: BigInt(10737418240), // 10GB
              },
            });
          } else {
            console.error("Failed to update user quota after delete:", error);
          }
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting download:", error);
      return NextResponse.json(
        { error: "Failed to delete download" },
        { status: 500 }
      );
    }
  });
}
