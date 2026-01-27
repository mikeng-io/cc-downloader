"use client";

/**
 * StorageQuotaDisplay Component
 *
 * Displays the user's storage quota usage with a progress bar
 * Shows: used/total, percentage, and visual progress indicator
 */

import { useEffect, useState } from "react";
import { LinearProgress } from "actify";

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

  useEffect(() => {
    fetchQuota();
    // Refresh quota every 30 seconds
    const interval = setInterval(fetchQuota, 30000);
    return () => clearInterval(interval);
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

  // Determine color based on usage percentage
  const getColor = (percentage: number) => {
    if (percentage < 50) return "primary";      // Green/blue for low usage
    if (percentage < 80) return "secondary";    // Orange for medium usage
    return "error";                              // Red for high usage
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
        <span className="hidden sm:inline">Quota unavailable</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${className}`}>
      {/* Text display - shows full details on desktop, condensed on mobile */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-700 dark:text-gray-300">
          {quota.formatted.used} / {quota.formatted.limit}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          ({quota.percentage}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none sm:w-48">
        <LinearProgress
          value={quota.percentage}
          color={getColor(quota.percentage)}
        />
      </div>

      {/* File count - hidden on mobile */}
      <span className="hidden lg:inline text-sm text-gray-500 dark:text-gray-400">
        {quota.fileCount} files
      </span>
    </div>
  );
}
