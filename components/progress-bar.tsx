"use client";

import { DownloadProgress } from "@/lib/hooks/use-download-progress";
import { motion } from "framer-motion";
import { formatFileSize } from "@/lib/utils/format-file-size";

interface ProgressBarProps {
  progress: DownloadProgress;
}

/**
 * Enhanced ProgressBar Component
 *
 * Features:
 * - Smooth width transitions with Framer Motion
 * - Color zones (green→yellow→red) based on percentage
 * - Indeterminate shimmer animation for PENDING state
 * - GPU-accelerated animations using transforms
 * - Animated percentage counter
 */
export function ProgressBar({ progress }: ProgressBarProps) {
  // For completed downloads, show 100% even if progress data is missing
  const isCompleted = progress.status === "COMPLETED";
  const percentage = isCompleted ? 100 : (progress.progress?.percentage ?? 0);
  const bytesDownloaded = progress.progress?.bytesDownloaded ?? 0;
  const totalBytes = progress.progress?.totalBytes;
  const speed = progress.progress?.speed;
  const eta = progress.progress?.eta;

  const formatSpeed = (bytesPerSecond: number | null): string => {
    if (!bytesPerSecond) return "";
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  const formatEta = (seconds: number | null | undefined): string => {
    if (!seconds || seconds < 0) return "";
    if (seconds < 60) return `${seconds}s left`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m left`;
    return `${Math.ceil(seconds / 3600)}h left`;
  };

  const getProgressColor = () => {
    if (progress.status === "FAILED" || progress.status === "CANCELLED") {
      return "bg-gradient-to-r from-red-500 to-red-600";
    }
    if (progress.status === "COMPLETED") {
      return "bg-gradient-to-r from-green-500 to-green-600";
    }
    // Color zones for in-progress downloads
    if (percentage < 33) {
      return "bg-gradient-to-r from-blue-500 to-blue-600";
    }
    if (percentage < 66) {
      return "bg-gradient-to-r from-yellow-500 to-yellow-600";
    }
    return "bg-gradient-to-r from-green-500 to-green-600";
  };

  const isPending = progress.status === "PENDING";
  const isProcessing = progress.status === "PROCESSING";

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium capitalize text-gray-900 dark:text-gray-100">
          {progress.status.toLowerCase()}
        </span>
        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
          {totalBytes && (
            <span>
              {formatFileSize(bytesDownloaded)} / {formatFileSize(totalBytes)}
            </span>
          )}
          {speed && <span>{formatSpeed(speed)}</span>}
          {eta !== null && <span>{formatEta(eta)}</span>}
          {(isProcessing || progress.status === "COMPLETED") && (
            <motion.span
              key={percentage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="font-semibold text-primary"
            >
              {Math.round(percentage)}%
            </motion.span>
          )}
        </div>
      </div>

      {/* Progress bar container */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {/* Indeterminate shimmer for PENDING */}
        {isPending && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        {/* Actual progress bar */}
        {!isPending && (
          <motion.div
            className={`h-full ${getProgressColor()} relative overflow-hidden`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            {/* Shimmer overlay for active downloads */}
            {isProcessing && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
          </motion.div>
        )}
      </div>

      {/* Error message */}
      {progress.error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {progress.error.message}
        </motion.p>
      )}
    </div>
  );
}
