/**
 * Quota Recalculation Utility
 *
 * This script recalculates a user's storage quota by summing up actual file sizes
 * from all downloads in the database. Use this to fix quota discrepancies.
 *
 * Usage:
 *   npx ts-node scripts/recalc-quota.ts <user-id>
 *
 * Example:
 *   npx ts-node scripts/recalc-quota.ts user_123abc
 */

import { prisma } from "../lib/prisma";

const DEFAULT_STORAGE_LIMIT = BigInt(10737418240); // 10GB

async function recalcQuota(userId: string) {
  console.log(`Recalculating quota for user: ${userId}`);

  // Get all downloads for the user
  const downloads = await prisma.download.findMany({
    where: {
      userId,
      status: "COMPLETED", // Only count completed downloads
    },
    select: {
      id: true,
      fileSize: true,
    },
  });

  console.log(`Found ${downloads.length} completed downloads`);

  // Calculate total storage
  let totalStorage = BigInt(0);
  let fileCount = 0;

  for (const download of downloads) {
    if (download.fileSize) {
      totalStorage += download.fileSize;
      fileCount++;
    }
  }

  const storageLimit = process.env.DEFAULT_STORAGE_LIMIT
    ? BigInt(process.env.DEFAULT_STORAGE_LIMIT)
    : DEFAULT_STORAGE_LIMIT;

  // Upsert the quota record
  const quota = await prisma.userQuota.upsert({
    where: { userId },
    update: {
      totalStorage,
      fileCount,
      lastRecalculated: new Date(),
    },
    create: {
      userId,
      totalStorage,
      fileCount,
      storageLimit,
      lastRecalculated: new Date(),
    },
  });

  // Format bytes for display
  const formatBytes = (bytes: bigint): string => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = Number(bytes);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    const decimals = unitIndex > 1 ? 2 : 0;
    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
  };

  console.log("\n=== Recalculation Complete ===");
  console.log(`Total Storage: ${formatBytes(totalStorage)} (${totalStorage} bytes)`);
  console.log(`File Count: ${fileCount}`);
  console.log(`Storage Limit: ${formatBytes(storageLimit)}`);
  console.log(`Percentage Used: ${Number((totalStorage * BigInt(100)) / storageLimit).toFixed(2)}%`);
  console.log(`Remaining: ${formatBytes(storageLimit - totalStorage)}`);
  console.log(`Last Recalculated: ${quota.lastRecalculated.toISOString()}`);
}

// Main execution
async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error("Error: User ID is required");
    console.error("\nUsage: npx ts-node scripts/recalc-quota.ts <user-id>");
    console.error("\nExample: npx ts-node scripts/recalc-quota.ts user_123abc");
    process.exit(1);
  }

  try {
    await recalcQuota(userId);
  } catch (error) {
    console.error("Error recalculating quota:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { recalcQuota };
