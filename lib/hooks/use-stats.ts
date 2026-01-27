import { useEffect, useState, useCallback } from "react";

export interface StatsData {
  total: number;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
}

interface UseStatsReturn {
  stats: StatsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const STATS_POLL_INTERVAL = 30000; // 30 seconds

/**
 * Custom hook for fetching and polling user download statistics
 *
 * Features:
 * - Automatic polling every 30 seconds
 * - Suspends polling when tab is not visible
 * - Manual refetch capability
 * - Loading and error states
 *
 * @returns {UseStatsReturn} Stats data, loading state, error, and refetch function
 */
export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/user/stats");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch statistics");
      }

      const data: StatsData = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up polling interval
    const interval = setInterval(() => {
      // Only poll if document is visible (tab is active)
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    }, STATS_POLL_INTERVAL);

    // Resume polling when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
