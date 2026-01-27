"use client";

import { useDownloadProgress } from "@/lib/hooks/use-download-progress";
import { ProgressBar } from "./progress-bar";
import { DownloadActions } from "./download-actions";
import { TypeIcon } from "./type-icon";
import { CardSkeleton } from "./loading-skeleton";
import { Card } from "actify";

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
    return <CardSkeleton />;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-700 dark:text-green-400";
      case "failed":
        return "text-red-700 dark:text-red-400";
      case "processing":
        return "text-blue-700 dark:text-blue-400";
      default:
        return "text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <Card className="p-4" variant="elevated" elevation={1}>
      {/* Header with type and status */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TypeIcon type={downloadType} className="text-xl" />
            {downloadType.toLowerCase()}
          </p>
          <p
            className="url-truncate mt-1 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"
            title={sourceUrl}
          >
            {sourceUrl}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {new Date(createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
            data.status
          )}`}
        >
          {data.status.toLowerCase()}
        </span>
      </div>

      {/* Progress bar for active downloads */}
      {(data.status === "PROCESSING" ||
        data.status === "PENDING" ||
        data.status === "COMPLETED" ||
        data.status === "FAILED") && (
        <ProgressBar progress={data} />
      )}

      {/* Result info */}
      {data.result && (
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.result.fileName}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {data.result.fileSize
              ? `${(data.result.fileSize / 1024 / 1024).toFixed(2)} MB`
              : "Unknown size"}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex justify-end">
        <DownloadActions
          downloadId={downloadId}
          status={data.status}
          storagePath={null} // TODO: get from progress result
          onDeleted={onDeleted}
        />
      </div>
    </Card>
  );
}
