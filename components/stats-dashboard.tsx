"use client";

import { useStats } from "@/lib/hooks/use-stats";
import { StatsCard } from "./stats-card";
import { StorageQuotaDisplay } from "./storage-quota-display";

/**
 * StatsDashboard Component
 *
 * Displays a comprehensive dashboard of user download statistics
 *
 * Features:
 * - Real-time statistics with 30-second polling
 * - Storage quota visualization
 * - Total, completed, and in-progress download counts
 * - Responsive grid layout (1/2/4 columns)
 * - Error handling with retry
 * - Loading states
 *
 * Grid Layout:
 * - Mobile (<640px): 1 column
 * - Tablet (640-1024px): 2x2 grid
 * - Desktop (>1024px): 4 columns in one row
 */
export function StatsDashboard() {
  const { stats, loading, error, refetch } = useStats();

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-800">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Unable to load statistics: {error}
        </p>
        <button
          onClick={refetch}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  const inProgress = (stats?.processing ?? 0) + (stats?.pending ?? 0);

  return (
    <div className="space-y-6">
      {/* Storage Quota */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Storage Usage
        </h3>
        <StorageQuotaDisplay />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Downloads */}
        <StatsCard
          label="Total Downloads"
          value={stats?.total ?? 0}
          icon="download"
          color="primary"
          loading={loading}
        />

        {/* Completed Downloads */}
        <StatsCard
          label="Completed"
          value={stats?.completed ?? 0}
          icon="check_circle"
          color="success"
          loading={loading}
        />

        {/* In Progress Downloads */}
        <StatsCard
          label="In Progress"
          value={inProgress}
          icon="pending"
          color="warning"
          loading={loading}
        />

        {/* Failed Downloads */}
        <StatsCard
          label="Failed"
          value={stats?.failed ?? 0}
          icon="error"
          color="error"
          loading={loading}
        />
      </div>
    </div>
  );
}
