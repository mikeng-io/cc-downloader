import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_STORAGE_LIMIT = BigInt(10737418240); // 10GB in bytes

/**
 * GET /api/user/quota
 * Returns the user's current storage quota usage
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get or create user quota record
    let quota = await prisma.userQuota.findUnique({
      where: { userId: session.user.id },
    });

    // If no quota record exists, create one with zero usage
    if (!quota) {
      const storageLimit = process.env.DEFAULT_STORAGE_LIMIT
        ? BigInt(process.env.DEFAULT_STORAGE_LIMIT)
        : DEFAULT_STORAGE_LIMIT;

      quota = await prisma.userQuota.create({
        data: {
          userId: session.user.id,
          totalStorage: BigInt(0),
          fileCount: 0,
          storageLimit,
        },
      });
    }

    const totalStorage = quota.totalStorage;
    const storageLimit = quota.storageLimit;
    const fileCount = quota.fileCount;

    // Calculate percentage using float division for precision
    const percentage = (Number(totalStorage) / Number(storageLimit)) * 100;
    const remaining = storageLimit - totalStorage;

    // Format bytes to human-readable format
    const formatBytes = (bytes: BigInt): string => {
      const units = ["B", "KB", "MB", "GB", "TB"];
      let value = Number(bytes);
      let unitIndex = 0;

      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
      }

      // Format with appropriate decimal places
      const decimals = unitIndex > 1 ? 2 : 0;
      return `${value.toFixed(decimals)} ${units[unitIndex]}`;
    };

    return NextResponse.json({
      totalStorage: totalStorage.toString(),
      storageLimit: storageLimit.toString(),
      fileCount,
      percentage: percentage < 1 ? Math.round(percentage * 100) / 100 : Math.round(percentage * 10) / 10,
      remaining: remaining.toString(),
      formatted: {
        used: formatBytes(totalStorage),
        limit: formatBytes(storageLimit),
        remaining: formatBytes(remaining),
      },
    });
  } catch (error) {
    console.error("Error fetching user quota:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota information" },
      { status: 500 }
    );
  }
}
