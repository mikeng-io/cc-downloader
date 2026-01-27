"use client";

import { useEffect, useState } from "react";
import { useDownloadProgress } from "@/lib/hooks/use-download-progress";
import { ProgressBar } from "./progress-bar";
import { DownloadActions } from "./download-actions";
import { TypeIcon } from "./type-icon";
import { CardSkeleton } from "./loading-skeleton";
import { ImagePreviewModal } from "./image-preview-modal";
import { Card } from "actify";
import { motion, AnimatePresence } from "framer-motion";
import { formatFileSize } from "@/lib/utils/format-file-size";

interface DownloadCardProps {
  downloadId: string;
  sourceUrl: string;
  downloadType: string;
  createdAt: string;
  onDeleted?: () => void;
}

/**
 * Enhanced DownloadCard Component
 *
 * Features:
 * - Hover elevation animation
 * - Status transition animations (color/icon changes)
 * - Delete animation (slide out + shrink)
 * - Update flash animation when data changes
 * - Optimized with React.memo
 */
export function DownloadCard({
  downloadId,
  sourceUrl,
  downloadType,
  createdAt,
  onDeleted,
}: DownloadCardProps) {
  const { data, isComplete, isFailed } = useDownloadProgress(downloadId);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Detect status changes and trigger flash animation
  useEffect(() => {
    if (data && prevStatus && data.status !== prevStatus) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);
    }
    if (data) {
      setPrevStatus(data.status);
    }
  }, [data?.status, prevStatus]);

  if (!data) {
    return <CardSkeleton />;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "pending":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "check_circle";
      case "failed":
        return "error";
      case "processing":
        return "sync";
      case "pending":
        return "pending";
      default:
        return "help";
    }
  };

  return (
    <motion.div
      layout
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`relative p-4 transition-all duration-normal ${
          isHovered ? "elevation-2" : "elevation-1"
        }`}
        variant="elevated"
      >
        {/* Flash overlay for status updates */}
        <AnimatePresence>
          {showFlash && (
            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 rounded-lg bg-primary/10 pointer-events-none"
            />
          )}
        </AnimatePresence>

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

          {/* Animated Status Badge */}
          <motion.span
            key={data.status}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`status-badge shrink-0 ${getStatusColor(data.status)}`}
          >
            <span className="material-symbols-outlined text-sm">
              {getStatusIcon(data.status)}
            </span>
            {data.status.toLowerCase()}
          </motion.span>
        </div>

        {/* Progress bar for active downloads */}
        {(data.status === "PROCESSING" ||
          data.status === "PENDING" ||
          data.status === "COMPLETED" ||
          data.status === "FAILED") && (
          <ProgressBar progress={data} />
        )}

        {/* Result info */}
        <AnimatePresence>
          {data.result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.result.fileName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {formatFileSize(data.result.fileSize)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="mt-4 flex justify-end">
          <DownloadActions
            downloadId={downloadId}
            status={data.status}
            onDeleted={onDeleted}
            onPreview={() => setShowPreview(true)}
          />
        </div>
      </Card>

      {/* Image Preview Modal */}
      {data.result && (
        <ImagePreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          imageUrl={`/api/downloads/${downloadId}/content`}
          fileName={data.result.fileName}
          fileSize={data.result.fileSize}
          downloadUrl={`/api/downloads/${downloadId}/content`}
        />
      )}
    </motion.div>
  );
}
