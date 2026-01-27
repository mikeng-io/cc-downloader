"use client";

import Link from "next/link";
import { ErrorBoundary } from "./error-boundary";
import { MetadataPanel } from "./metadata-panel";
import { motion } from "framer-motion";

interface ViewerWrapperProps {
  download: any;
  ViewerComponent: React.ComponentType<{ download: any }>;
}

/**
 * Enhanced ViewerWrapper Component
 *
 * Client component that wraps viewer components with:
 * - Error boundary for graceful error handling
 * - Back navigation button
 * - Download button
 * - Metadata panel (responsive: side panel on desktop, bottom on mobile)
 * - Loading states
 */
export function ViewerWrapper({ download, ViewerComponent }: ViewerWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header with Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <Link
              href="/downloads"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-primary dark:text-gray-300 dark:hover:text-primary"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Downloads
            </Link>

            {/* Download Button */}
            <a
              href={`/api/downloads/${download.id}/content`}
              download={download.fileName || undefined}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
              <span className="material-symbols-outlined">download</span>
              Download
            </a>
          </div>
        </div>
      </motion.div>

      <ErrorBoundary
        fallback={
          <div className="flex min-h-[400px] items-center justify-center p-4">
            <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
              <svg
                className="mx-auto mb-4 h-16 w-16 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                Viewer Error
              </h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                We encountered an error while trying to display this file. You can still download it to view locally.
              </p>
              <div className="flex justify-center gap-3">
                <a
                  href={`/api/downloads/${download.id}/content`}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  download={download.fileName || undefined}
                >
                  Download File
                </a>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        }
      >
        {/* Main Content with Metadata Panel */}
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            {/* Viewer Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <ViewerComponent download={download} />
            </motion.div>

            {/* Metadata Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <MetadataPanel download={download} />
            </motion.div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
