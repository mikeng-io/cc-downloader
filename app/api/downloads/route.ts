import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSubmissionUrl, submissionUrlSchema } from "@/lib/url-validator";
import { detectDownloadType } from "@/lib/source-detector";
import { addDownloadJob } from "@/lib/queue";
import { DownloadStatus, MimeType } from "@prisma/client";
import { createApiSpan } from "@/lib/otel";

export async function POST(request: NextRequest) {
  return createApiSpan("POST", "/api/downloads", async () => {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();

      // Validate request body
      const validationResult = submissionUrlSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: validationResult.error.errors[0].message },
          { status: 400 }
        );
      }

      const { url, priority } = validationResult.data;

      // Additional validation
      const urlValidation = validateSubmissionUrl(url);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: urlValidation.error },
          { status: 400 }
        );
      }

      // Detect download type
      const downloadType = detectDownloadType(url);

      // Create download record
      const download = await prisma.download.create({
        data: {
          userId: session.user.id,
          sourceUrl: url,
          downloadType,
          status: DownloadStatus.PENDING,
          priority: priority ?? 0,
          mimeType: MimeType.UNKNOWN,
        },
      });

      // Add job to BullMQ queue
      try {
        await addDownloadJob({
          downloadId: download.id,
          userId: session.user.id,
          url: download.sourceUrl,
          downloadType: download.downloadType as "DIRECT" | "YTDLP" | "GALLERY_DL",
        });
      } catch (queueError) {
        console.error("Failed to add job to queue:", queueError);
        // Clean up download record if queue add fails
        await prisma.download.delete({ where: { id: download.id } });
        return NextResponse.json(
          { error: "Failed to queue download" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: download.id,
        sourceUrl: download.sourceUrl,
        downloadType: download.downloadType,
        status: download.status,
        createdAt: download.createdAt,
      }, { status: 201 });

    } catch (error) {
      console.error("Error creating download:", error);
      return NextResponse.json(
        { error: "Failed to create download" },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return createApiSpan("GET", "/api/downloads", async () => {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const { searchParams } = new URL(request.url);

      // Validate and parse pagination parameters with bounds checking
      const page = Math.max(1, Math.min(1000, parseInt(searchParams.get("page") ?? "1", 10)));
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10)));

      const status = searchParams.get("status");
      const type = searchParams.get("type");

      // Validate status enum
      if (status && !["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status parameter" },
          { status: 400 }
        );
      }

      // Validate downloadType enum
      if (type && !["DIRECT", "YTDLP", "GALLERY_DL"].includes(type)) {
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 }
        );
      }

      const where: { userId: string; status?: string; downloadType?: string } = {
        userId: session.user.id,
      };

      if (status) {
        where.status = status;
      }

      if (type) {
        where.downloadType = type;
      }

      const [downloads, total] = await Promise.all([
        prisma.download.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            progress: true,
          },
        }),
        prisma.download.count({ where }),
      ]);

      return NextResponse.json({
        downloads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });

    } catch (error) {
      console.error("Error fetching downloads:", error);
      return NextResponse.json(
        { error: "Failed to fetch downloads" },
        { status: 500 }
      );
    }
  });
}
