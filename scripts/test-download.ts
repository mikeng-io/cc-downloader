import { PrismaClient } from "@prisma/client";
import { addDownloadJob } from "../lib/queue";

const prisma = new PrismaClient();

async function main() {
  // Get the test user
  const user = await prisma.user.findUnique({
    where: { email: "test@example.com" }
  });

  if (!user) {
    throw new Error("Test user not found");
  }

  // Create a test download - use a simple direct download (small file)
  const download = await prisma.download.create({
    data: {
      userId: user.id,
      sourceUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
      downloadType: "DIRECT",
      status: "PENDING",
      mimeType: "UNKNOWN",
    },
  });

  console.log("Created download:", download.id);

  // Add to queue
  await addDownloadJob({
    downloadId: download.id,
    userId: user.id,
    url: download.sourceUrl,
    downloadType: "DIRECT",
  });

  console.log("Added to queue!");
  console.log("Download ID:", download.id);
  console.log("URL:", download.sourceUrl);
}

main().catch(console.error).finally(() => prisma.$disconnect());
