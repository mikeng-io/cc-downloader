"use client";

/**
 * TextViewer Component
 * Displays text files with monospace font and proper formatting
 */

import { useEffect, useState } from "react";
import type { Download } from "@prisma/client";

interface TextViewerProps {
  download: Download;
}

export function TextViewer({ download }: TextViewerProps) {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`/api/downloads/${download.id}/content`);
        if (!response.ok) {
          throw new Error("Failed to load content");
        }
        const text = await response.text();
        setContent(text);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
        setLoading(false);
      }
    };

    fetchContent();
  }, [download.id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

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

      {/* Text Content */}
      <div className="flex flex-1 overflow-auto bg-white p-4 dark:bg-gray-900">
        {error ? (
          <div className="text-center">
            <svg className="mx-auto mb-4 h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5a2 2 0 012 2v1a2 2 0 01-2 2v1a2 2 0 002 2h9z" />
            </svg>
            <p className="text-lg text-gray-900 dark:text-white">{error}</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-900 dark:text-gray-100">
            {content}
          </pre>
        )}
      </div>

      {/* Footer with file info */}
      <div className="border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Type: {download.mimeType}</span>
          <span>Lines: {content.split("\n").length}</span>
          {download.fileSize && (
            <span>Size: {(Number(download.fileSize) / 1024).toFixed(2)} KB</span>
          )}
        </div>
      </div>
    </div>
  );
}
