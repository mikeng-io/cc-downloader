"use client";

import { useDownloadProgress } from "@/lib/hooks/use-download-progress";
import { ProgressBar } from "./progress-bar";
import { DownloadActions } from "./download-actions";

interface DownloadCardProps {
  downloadId: string;
  sourceUrl: string;
  downloadType: string;
  createdAt: string;
  onDeleted?: () => void;
}

export function DownloadCard({
  downloadId,
  sourceUrl,
  downloadType,
  createdAt,
  onDeleted,
}: DownloadCardProps) {
  const { data, isComplete, isFailed } = useDownloadProgress(downloadId);

  if (!data) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium capitalize">{downloadType.toLowerCase()}</p>
          <p className="truncate text-xs text-gray-600 dark:text-gray-400">{sourceUrl}</p>
          <p className="mt-1 text-xs text-gray-500">
            {new Date(createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            isComplete
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : isFailed
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : data.status === "PROCESSING"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
          }`}
        >
          {data.status.toLowerCase()}
        </span>
      </div>

      {(data.status === "PROCESSING" ||
        data.status === "PENDING" ||
        data.status === "COMPLETED" ||
        data.status === "FAILED") && (
        <ProgressBar progress={data} />
      )}

      {data.result && (
        <div className="mt-3 border-t pt-3">
          <p className="text-sm font-medium">{data.result.fileName}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {data.result.fileSize ? `${(data.result.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <DownloadActions
          downloadId={downloadId}
          status={data.status}
          storagePath={null} // TODO: get from progress result
          onDeleted={onDeleted}
        />
      </div>
    </div>
  );
}
