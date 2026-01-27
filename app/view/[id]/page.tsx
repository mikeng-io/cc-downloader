import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideoViewer } from "@/components/viewers/video-viewer";
import { AudioViewer } from "@/components/viewers/audio-viewer";
import { ImageGallery } from "@/components/viewers/image-gallery";
import { PDFViewer } from "@/components/viewers/pdf-viewer";
import { TextViewer } from "@/components/viewers/text-viewer";
import { UnsupportedViewer } from "@/components/viewers/unsupported-viewer";
import { ViewerWrapper } from "@/components/viewer-wrapper";

/**
 * MIME type viewer mapping
 * Maps MIME type patterns to appropriate viewer components
 */
const MIME_TYPE_VIEWER_MAP: Record<string, React.ComponentType<{ download: any }>> = {
  "video/*": VideoViewer,
  "audio/*": AudioViewer,
  "image/*": ImageGallery,
  "application/pdf": PDFViewer,
  "text/*": TextViewer,
};

/**
 * Normalize MIME type from various formats to standard MIME type
 * Handles: "VIDEO_MP4" -> "video/mp4", "AUDIO_MP3" -> "audio/mpeg", etc.
 */
function normalizeMimeType(mimeType: string): string {
  const lower = mimeType.toLowerCase();

  // Handle legacy format: TYPE_SUBTYPE (e.g., "VIDEO_MP4", "AUDIO_MP3")
  const legacyMatch = lower.match(/^([a-z]+)_([a-z0-9]+)$/);
  if (legacyMatch) {
    const [, type, subtype] = legacyMatch;
    return `${type}/${subtype}`;
  }

  return lower;
}

/**
 * Get viewer component for a given MIME type
 */
function getViewerForMimeType(mimeType: string | null): React.ComponentType<{ download: any }> | null {
  if (!mimeType) return null;

  const normalizedMimeType = normalizeMimeType(mimeType);

  // Check for exact matches first
  if (MIME_TYPE_VIEWER_MAP[normalizedMimeType]) {
    return MIME_TYPE_VIEWER_MAP[normalizedMimeType];
  }

  // Check for wildcard matches
  for (const [pattern, component] of Object.entries(MIME_TYPE_VIEWER_MAP)) {
    const patternRegex = new RegExp(
      "^" + pattern.replace("*", ".*").replace("?", ".?") + "$"
    );
    if (patternRegex.test(normalizedMimeType)) {
      return component;
    }
  }

  return null;
}

/**
 * Generate metadata for the view page
 */
export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<{ title: string; description: string }> {
  const { id } = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return {
      title: "Unauthorized",
      description: "Please log in to view this file",
    };
  }

  try {
    const download = await prisma.download.findUnique({
      where: { id },
    });

    if (!download) {
      return {
        title: "File Not Found",
        description: "The requested file could not be found",
      };
    }

    return {
      title: download.fileName || "View File",
      description: download.title || `View ${download.fileName}`,
    };
  } catch {
    return {
      title: "View File",
      description: "View your downloaded file",
    };
  }
}

/**
 * View page - Universal media viewer
 * Renders the appropriate viewer component based on the file's MIME type
 */
export default async function ViewPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Unauthorized
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Please log in to view this file
          </p>
        </div>
      </div>
    );
  }

  // Fetch download with auth check
  const download = await prisma.download.findFirst({
    where: {
      id,
      userId: session.user.id, // Ensure user owns this download
    },
  });

  if (!download) {
    notFound();
  }

  if (download.status !== "COMPLETED") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            File Not Ready
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This file is {download.status.toLowerCase()}. Please wait for it to complete downloading.
          </p>
        </div>
      </div>
    );
  }

  // Get the appropriate viewer component
  const ViewerComponent = getViewerForMimeType(download.mimeType);

  if (!ViewerComponent) {
    return <UnsupportedViewer download={download} />;
  }

  return (
    <ViewerWrapper
      download={download}
      ViewerComponent={ViewerComponent}
    />
  );
}
