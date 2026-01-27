"use client";

/**
 * AudioViewer Component
 * Displays audio content with native HTML5 audio controls
 */

import { useEffect, useRef, useState } from "react";
import type { Download } from "@prisma/client";

interface AudioViewerProps {
  download: Download;
}

export function AudioViewer({ download }: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState<string | null>(null);
  const audioUrl = `/api/downloads/${download.id}/content`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = () => {
      setError("Failed to load audio. The file may be corrupted or in an unsupported format.");
    };

    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
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

      {/* Audio Player */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="w-full max-w-3xl px-4">
          {error ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
              <svg className="mx-auto mb-4 h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19l0-6m12 6l0-6" />
              </svg>
              <p className="text-lg text-gray-900 dark:text-white">{error}</p>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
              {/* Audio icon */}
              <div className="mb-6 flex justify-center">
                <svg className="h-24 w-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-.89 4-4V7H4v3.01c0 1.37.67 2.66 1.76 3.55l1.91-1.91C7.38 11.27 7.19 11.01 7 10.71c-.37-.53-.84-.95-1.37-1.25-.52-.37-1.09-.56-1.69-.56V3H12z" />
                </svg>
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                preload="metadata"
                className="w-full"
                title={download.title || download.fileName || undefined}
              >
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}
        </div>
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
