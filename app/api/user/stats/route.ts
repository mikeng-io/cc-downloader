import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * User Statistics API Endpoint
 *
 * Returns aggregated download statistics for the authenticated user
 *
 * @returns {
 *   total: number - Total downloads count
 *   completed: number - Successfully completed downloads
 *   processing: number - Currently processing downloads
 *   pending: number - Pending downloads
 *   failed: number - Failed downloads
 * }
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Aggregate download statistics
    const [
      total,
      completed,
      processing,
      pending,
      failed,
    ] = await Promise.all([
      // Total downloads
      prisma.download.count({
        where: { userId: session.user.id },
      }),
      // Completed downloads
      prisma.download.count({
        where: {
          userId: session.user.id,
          status: "COMPLETED",
        },
      }),
      // Processing downloads
      prisma.download.count({
        where: {
          userId: session.user.id,
          status: "PROCESSING",
        },
      }),
      // Pending downloads
      prisma.download.count({
        where: {
          userId: session.user.id,
          status: "PENDING",
        },
      }),
      // Failed downloads
      prisma.download.count({
        where: {
          userId: session.user.id,
          status: "FAILED",
        },
      }),
    ]);

    // Return statistics with cache headers (30-second TTL)
    return NextResponse.json(
      {
        total,
        completed,
        processing,
        pending,
        failed,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
