"use client";

import { ErrorBoundary } from "./error-boundary";

interface ViewerWrapperProps {
  download: any;
  ViewerComponent: React.ComponentType<{ download: any }>;
}

/**
 * ViewerWrapper Component
 * Client component that wraps viewer components with ErrorBoundary
 * This isolates viewer errors from the rest of the application
 */
export function ViewerWrapper({ download, ViewerComponent }: ViewerWrapperProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <ErrorBoundary
        fallback={
          <div className="flex min-h-[400px] flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
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
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  download={download.fileName || undefined}
                >
                  Download File
                </a>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-md border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        }
      >
        <ViewerComponent download={download} />
      </ErrorBoundary>
    </div>
  );
}
