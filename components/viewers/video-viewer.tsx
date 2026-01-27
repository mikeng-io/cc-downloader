"use client";

/**
 * VideoViewer Component
 * Displays video content with native HTML5 video controls
 */

import { useEffect, useRef, useState } from "react";
import type { Download } from "@prisma/client";

interface VideoViewerProps {
  download: Download;
}

export function VideoViewer({ download }: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const videoUrl = `/api/downloads/${download.id}/content`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = () => {
      setError("Failed to load video. The file may be corrupted or in an unsupported format.");
    };

    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="truncate text-xl font-semibold text-gray-900 dark:text-white" title={download.fileName || download.title || undefined}>
          {download.title || download.fileName}
        </h1>
        {download.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {download.description}
          </p>
        )}
      </div>

      {/* Video Player */}
      <div className="flex flex-1 items-center justify-center bg-black">
        {error ? (
          <div className="text-center text-white">
            <svg className="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-lg">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-h-full max-w-full"
            controls
            preload="metadata"
            title={download.title || download.fileName || undefined}
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      {/* Footer with file info */}
      <div className="border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Type: {download.mimeType}</span>
          {download.fileSize && (
            <span>Size: {(Number(download.fileSize) / 1024 / 1024).toFixed(2)} MB</span>
          )}
        </div>
      </div>
    </div>
  );
}
