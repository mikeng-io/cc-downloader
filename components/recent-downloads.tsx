"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DownloadCard } from "./download-card";
import { Pagination } from "./pagination";
import { motion } from "framer-motion";

interface Download {
  id: string;
  sourceUrl: string;
  downloadType: string;
  status: string;
  fileName: string | null;
  createdAt: string;
}

interface DownloadsResponse {
  downloads: Download[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ITEMS_PER_PAGE = 10;
const POLL_INTERVAL = 5000; // 5 seconds

/**
 * RecentDownloads Component
 *
 * Displays paginated list of recent downloads on homepage
 *
 * Features:
 * - Paginated display (10 items per page)
 * - Real-time updates via polling (5s interval)
 * - List/Grid view toggle with localStorage persistence
 * - Staggered card entry animations
 * - Empty state handling
 * - "View All Downloads" link
 */
export function RecentDownloads() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<DownloadsResponse["pagination"] | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("downloads-view") as "list" | "grid" | null;
    if (savedView) {
      setView(savedView);
    }
  }, []);

  // Save view preference to localStorage
  const handleViewChange = (newView: "list" | "grid") => {
    setView(newView);
    localStorage.setItem("downloads-view", newView);
  };

  const fetchDownloads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", ITEMS_PER_PAGE.toString());

      const response = await fetch(`/api/downloads?${params}`);
      if (response.ok) {
        const data: DownloadsResponse = await response.json();
        setDownloads(data.downloads || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch downloads:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchDownloads();

    // Poll every 5 seconds only if page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDownloads();
      }
    }, POLL_INTERVAL);

    // Resume polling when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDownloads();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchDownloads]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recent Downloads
          </h2>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recent Downloads
        </h2>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <span className="material-symbols-outlined mb-4 text-6xl text-gray-400">
            cloud_download
          </span>
          <p className="text-gray-600 dark:text-gray-400">
            No downloads yet. Submit a URL above to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recent Downloads
        </h2>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewChange("list")}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              view === "list"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            }`}
            aria-label="List view"
          >
            <span className="material-symbols-outlined text-xl align-middle">
              view_list
            </span>
          </button>
          <button
            onClick={() => handleViewChange("grid")}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              view === "grid"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            }`}
            aria-label="Grid view"
          >
            <span className="material-symbols-outlined text-xl align-middle">
              grid_view
            </span>
          </button>
        </div>
      </div>

      {/* Downloads Grid/List */}
      <div
        className={
          view === "list"
            ? "grid gap-4"
            : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }
      >
        {downloads.map((download, index) => (
          <motion.div
            key={download.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05, // Stagger effect
            }}
          >
            <DownloadCard
              downloadId={download.id}
              sourceUrl={download.sourceUrl}
              downloadType={download.downloadType}
              createdAt={download.createdAt}
              onDeleted={fetchDownloads}
            />
          </motion.div>
        ))}
      </div>

      {/* Pagination and View All */}
      {pagination && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
            />
          )}

          {/* View All Downloads Link */}
          <a
            href="/downloads"
            className="rounded-md bg-gray-200 px-6 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            View All Downloads
          </a>
        </div>
      )}
    </div>
  );
}
