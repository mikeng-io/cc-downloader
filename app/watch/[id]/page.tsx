import { notFound, redirect } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { minioClient } from "@/lib/minio";

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch download record with access control
  const download = await prisma.download.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      url: true,
      status: true,
      filePath: true,
      fileFormat: true,
      fileSize: true,
      thumbnailPath: true,
      createdAt: true,
    },
  });

  // Access control: user can only view their own downloads
  if (!download || download.userId !== session.user.id) {
    notFound();
  }

  // Only completed downloads can be viewed
  if (download.status !== "COMPLETED") {
    redirect("/downloads");
  }

  // Get presigned URL from MinIO for streaming
  let videoUrl = "";
  let thumbnailUrl = "";

  try {
    // Presigned URL valid for 24 hours (86400 seconds)
    videoUrl = await minioClient.presignedGetObject(
      "downloads",
      download.filePath,
      86400
    );

    if (download.thumbnailPath) {
      thumbnailUrl = await minioClient.presignedGetObject(
        "downloads",
        download.thumbnailPath,
        86400
      );
    }
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    redirect("/downloads");
  }

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <a
          href="/downloads"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← Back to Downloads
        </a>

        {/* Video Player */}
        <div className="mb-6 aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
          <VideoPlayer
            src={videoUrl}
            poster={thumbnailUrl || undefined}
            title={download.title}
            className="w-full h-full"
          />
        </div>

        {/* Video Metadata */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            {download.title}
          </h1>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Source URL
              </p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                <a
                  href={download.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-blue-600 hover:underline dark:text-blue-400"
                >
                  {download.url}
                </a>
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                File Size
              </p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatFileSize(download.fileSize)}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Format
              </p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {download.fileFormat?.toUpperCase() || "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Downloaded
              </p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {new Date(download.createdAt).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </p>
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                Ready to watch
              </p>
            </div>
          </div>

          {/* Download Button */}
          <div className="mt-6">
            <a
              href={videoUrl}
              download
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Download Video
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
