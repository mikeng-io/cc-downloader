"use client";

/**
 * PDFViewer Component
 * Displays PDF documents using native embed/iframe
 */

import { useEffect, useState } from "react";
import type { Download } from "@prisma/client";

interface PDFViewerProps {
  download: Download;
}

export function PDFViewer({ download }: PDFViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const pdfUrl = `/api/downloads/${download.id}/content`;

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

      {/* PDF Viewer */}
      <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
        {error ? (
          <div className="text-center">
            <svg className="mx-auto mb-4 h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5a2 2 0 012 2v1.5a2 2 0 01-2 2v-1.5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.5a2 2 0 01-2 2v1.5a2 2 0 002 2h9z" />
            </svg>
            <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">PDF Preview Unavailable</h3>
              <p className="mb-4 text-gray-600 dark:text-gray-400">Your browser does not support inline PDF viewing.</p>
              <a
                href={pdfUrl}
                download
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l4 4m-4-4h12" />
                </svg>
                Download PDF
              </a>
            </div>
          </div>
        ) : (
          <embed
            src={pdfUrl}
            type="application/pdf"
            className="h-full w-full rounded-lg shadow-lg"
            onError={() => setError("Failed to load PDF. Please download to view.")}
          />
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
