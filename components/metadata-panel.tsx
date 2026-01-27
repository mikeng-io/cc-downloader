"use client";

import { useState } from "react";
import { Card } from "actify";
import { motion } from "framer-motion";
import { formatFileSize } from "@/lib/utils/format-file-size";

interface MetadataPanelProps {
  download: {
    id: string;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    createdAt: string;
    sourceUrl: string;
    title?: string | null;
  };
  className?: string;
}

/**
 * MetadataPanel Component
 *
 * Displays comprehensive file metadata in viewer pages
 *
 * Features:
 * - Filename, file size, MIME type, download date, source URL
 * - Human-readable formatting
 * - Copy-to-clipboard functionality
 * - Responsive positioning (side panel on desktop, bottom on mobile)
 * - Material 3 styling
 */
export function MetadataPanel({ download, className = "" }: MetadataPanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getMimeTypeFriendlyName = (mimeType: string | null): string => {
    if (!mimeType) return "Unknown";
    const parts = mimeType.split("/");
    if (parts.length === 2) {
      const [type, subtype] = parts;
      return `${subtype.toUpperCase()} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
    return mimeType;
  };

  return (
    <Card
      variant="elevated"
      elevation={1}
      className={`p-6 ${className}`}
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        File Information
      </h3>

      <div className="space-y-4">
        {/* Filename */}
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
            description
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Filename</p>
            <div className="group flex items-center gap-2">
              <p className="break-words text-sm font-medium text-gray-900 dark:text-white">
                {download.fileName || "Unknown"}
              </p>
              {download.fileName && (
                <button
                  onClick={() => copyToClipboard(download.fileName!, "filename")}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  title="Copy filename"
                >
                  <span className="material-symbols-outlined text-sm text-gray-600 hover:text-primary dark:text-gray-400">
                    {copiedField === "filename" ? "check" : "content_copy"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* File Size */}
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
            storage
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">File Size</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatFileSize(download.fileSize)}
            </p>
          </div>
        </div>

        {/* File Type */}
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
            category
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">File Type</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {getMimeTypeFriendlyName(download.mimeType)}
            </p>
            {download.mimeType && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {download.mimeType}
              </p>
            )}
          </div>
        </div>

        {/* Download Date */}
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
            event
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Downloaded</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(download.createdAt)}
            </p>
          </div>
        </div>

        {/* Source URL */}
        {download.sourceUrl && (
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
              link
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Source URL</p>
              <div className="group flex items-center gap-2">
                <a
                  href={download.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="url-truncate text-sm text-primary hover:underline"
                  title={download.sourceUrl}
                >
                  {download.sourceUrl}
                </a>
                <button
                  onClick={() => copyToClipboard(download.sourceUrl, "url")}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  title="Copy URL"
                >
                  <span className="material-symbols-outlined text-sm text-gray-600 hover:text-primary dark:text-gray-400">
                    {copiedField === "url" ? "check" : "content_copy"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copy All Metadata */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          const metadata = `
Filename: ${download.fileName || "Unknown"}
File Size: ${formatFileSize(download.fileSize)}
File Type: ${getMimeTypeFriendlyName(download.mimeType)} (${download.mimeType})
Downloaded: ${formatDate(download.createdAt)}
Source URL: ${download.sourceUrl || "N/A"}
          `.trim();
          copyToClipboard(metadata, "all");
        }}
        className="mt-6 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {copiedField === "all" ? (
          <>
            <span className="material-symbols-outlined mr-2 inline text-green-600">check</span>
            Copied!
          </>
        ) : (
          <>
            <span className="material-symbols-outlined mr-2 inline">content_copy</span>
            Copy All Metadata
          </>
        )}
      </motion.button>
    </Card>
  );
}
