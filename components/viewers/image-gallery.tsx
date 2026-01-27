"use client";

/**
 * ImageGallery Component
 * Displays image content with zoom and pan capabilities
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Download } from "@prisma/client";

interface ImageGalleryProps {
  download: Download;
}

export function ImageGallery({ download }: ImageGalleryProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const imageUrl = `/api/downloads/${download.id}/content`;

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

      {/* Image Viewer */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="relative max-h-full max-w-full">
          {error ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
              <svg className="mx-auto mb-4 h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg text-gray-900 dark:text-white">{error}</p>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-2 shadow-lg dark:bg-gray-800">
              {loading && (
                <div className="flex h-64 w-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
                </div>
              )}
              <img
                src={imageUrl}
                alt={download.title || download.fileName || "Image"}
                className="max-h-[70vh] max-w-full object-contain"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setError("Failed to load image. The file may be corrupted or in an unsupported format.");
                  setLoading(false);
                }}
              />
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
