"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DownloadCard } from "@/components/download-card";
import { UrlSubmitForm } from "@/components/url-submit-form";
import { Pagination } from "@/components/pagination";

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

const DEFAULT_LIMIT = 12;

export function DownloadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Get current filter values from URL
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const currentFilter = searchParams.get("status") ?? "all";
  const currentSearch = searchParams.get("search") ?? "";

  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [pagination, setPagination] = useState<DownloadsResponse["pagination"] | null>(null);

  // Update URL params without navigation
  const updateUrlParams = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });

      // Reset to page 1 when filter/search changes
      if (params.status !== undefined || params.search !== undefined) {
        newParams.set("page", "1");
      }

      router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const fetchDownloads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", DEFAULT_LIMIT.toString());
      if (currentFilter !== "all") params.set("status", currentFilter);
      if (currentSearch) params.set("search", currentSearch);

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
  }, [currentPage, currentFilter, currentSearch]);

  useEffect(() => {
    fetchDownloads();
    // Poll every 5 seconds
    const interval = setInterval(fetchDownloads, 5000);
    return () => clearInterval(interval);
  }, [fetchDownloads]);

  // Handle filter changes
  const handleFilterChange = (value: string) => {
    updateUrlParams({ status: value === "all" ? null : value });
  };

  // Handle search changes
  const handleSearchChange = (value: string) => {
    updateUrlParams({ search: value || null });
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Downloads
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your downloaded media
          </p>
        </div>

        {/* URL Submit Form */}
        <div className="mb-6">
          <UrlSubmitForm onSubmit={fetchDownloads} />
        </div>

        {/* Filters and View Toggle */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={currentFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>

            <input
              type="text"
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by filename..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 sm:w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                view === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              }`}
              aria-label="List view"
            >
              <span className="material-symbols-outlined text-xl align-middle">
                view_list
              </span>
            </button>
            <button
              onClick={() => setView("grid")}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                view === "grid"
                  ? "bg-blue-600 text-white"
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

        {/* Downloads */}
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-center text-gray-500 dark:text-gray-400">
              No downloads found. Try adjusting your filters or submit a new URL.
            </p>
          </div>
        ) : (
          <>
            <div
              className={
                view === "list"
                  ? "grid gap-4"
                  : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }
            >
              {downloads.map((download) => (
                <DownloadCard
                  key={download.id}
                  downloadId={download.id}
                  sourceUrl={download.sourceUrl}
                  downloadType={download.downloadType}
                  createdAt={download.createdAt}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
