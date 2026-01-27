"use client";

/**
 * UnsupportedViewer Component
 * Displayed when the file type is not supported for previewing
 */

import type { Download } from "@prisma/client";

interface UnsupportedViewerProps {
  download: Download;
}

export function UnsupportedViewer({ download }: UnsupportedViewerProps) {
  const downloadUrl = `/api/downloads/${download.id}/content`;

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

      {/* Unsupported Message */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
          <svg className="mx-auto mb-4 h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Preview Not Available
          </h2>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            This file type ({download.mimeType}) cannot be previewed in the browser.
          </p>

          {/* Download option */}
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l4 4m-4-4h12" />
            </svg>
            Download File
          </a>

          {/* File info */}
          <div className="mt-6 rounded-md bg-gray-50 p-4 text-left dark:bg-gray-900">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">File Name:</span>
                <span className="ml-4 font-mono text-gray-900 dark:text-white">{download.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">MIME Type:</span>
                <span className="ml-4 font-mono text-gray-900 dark:text-white">{download.mimeType}</span>
              </div>
              {download.fileSize && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Size:</span>
                  <span className="ml-4 font-mono text-gray-900 dark:text-white">
                    {(Number(download.fileSize) / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
