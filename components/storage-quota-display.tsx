"use client";

/**
 * Enhanced StorageQuotaDisplay Component
 *
 * Displays user's storage quota with improved visual design
 *
 * Features:
 * - Color-coded zones: green (0-50%), yellow (50-80%), red (80-100%)
 * - Gradient styling for depth
 * - 8px height progress bar
 * - Animated transitions for quota changes
 * - Number count-up animations
 * - Detailed tooltip with exact bytes
 * - Responsive layout
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QuotaData {
  totalStorage: string;
  storageLimit: string;
  fileCount: number;
  percentage: number;
  remaining: string;
  formatted: {
    used: string;
    limit: string;
    remaining: string;
  };
}

interface StorageQuotaDisplayProps {
  className?: string;
}

export function StorageQuotaDisplay({ className = "" }: StorageQuotaDisplayProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchQuota();
    // Refresh quota every 30 seconds
    const interval = setInterval(fetchQuota, 30000);

    // Pause polling when not visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchQuota();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function fetchQuota() {
    try {
      const response = await fetch("/api/user/quota");
      if (!response.ok) {
        throw new Error("Failed to fetch quota");
      }
      const data = await response.json();
      setQuota(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching quota:", err);
      setError("Unable to load quota information");
    } finally {
      setLoading(false);
    }
  }

  // Determine color class based on usage percentage
  const getColorClass = (percentage: number) => {
    if (percentage < 50) return "bg-gradient-to-r from-green-500 to-green-600";
    if (percentage < 80) return "bg-gradient-to-r from-yellow-500 to-orange-500";
    return "bg-gradient-to-r from-red-500 to-red-600";
  };

  const getTextColorClass = (percentage: number) => {
    if (percentage < 50) return "text-green-600 dark:text-green-400";
    if (percentage < 80) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="skeleton h-6 w-32 rounded"></div>
          <div className="skeleton h-6 w-20 rounded"></div>
        </div>
        <div className="skeleton h-2 w-full rounded-full"></div>
        <div className="skeleton h-4 w-24 rounded"></div>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <span className="material-symbols-outlined text-xl">error</span>
        <span>Quota unavailable</span>
        <button
          onClick={fetchQuota}
          className="ml-2 rounded px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Usage Text and Percentage */}
      <div className="flex items-center justify-between">
        <motion.div
          key={quota.formatted.used}
          initial={{ opacity: 0.7, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          {quota.formatted.used} / {quota.formatted.limit}
        </motion.div>
        <motion.div
          key={quota.percentage}
          initial={{ opacity: 0.7, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`text-lg font-bold ${getTextColorClass(quota.percentage)}`}
        >
          {quota.percentage}%
        </motion.div>
      </div>

      {/* Enhanced Progress Bar */}
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <motion.div
            className={`h-full ${getColorClass(quota.percentage)}`}
            initial={{ width: 0 }}
            animate={{ width: `${quota.percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-gray-700"
            >
              <div className="space-y-1">
                <div>Used: {parseInt(quota.totalStorage).toLocaleString()} bytes</div>
                <div>Remaining: {quota.formatted.remaining}</div>
                <div>Files: {quota.fileCount}</div>
              </div>
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rotate-45 border-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* File Count and Remaining Space */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{quota.fileCount} files</span>
        <span>{quota.formatted.remaining} remaining</span>
      </div>
    </div>
  );
}
