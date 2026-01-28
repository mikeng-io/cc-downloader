"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pagination } from "@/components/pagination";
import { ImagePreviewModal } from "@/components/image-preview-modal";
import { formatFileSize } from "@/lib/utils/format-file-size";

interface Download {
  id: string;
  sourceUrl: string;
  downloadType: string;
  status: string;
  fileName: string | null;
  fileSize?: number | null;
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

const DEFAULT_LIMIT = 20;

export function DownloadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const currentFilter = searchParams.get("status") ?? "all";
  const currentSearch = searchParams.get("search") ?? "";

  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<DownloadsResponse["pagination"] | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Get completed downloads for preview navigation
  const completedDownloads = downloads.filter((d) => d.status === "COMPLETED");
  const previewDownload = previewIndex !== null ? completedDownloads[previewIndex] : null;

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

    // Only poll if there are active downloads (PENDING or PROCESSING)
    const hasActiveDownloads = downloads.some(
      (d) => d.status === "PENDING" || d.status === "PROCESSING"
    );

    if (hasActiveDownloads) {
      const interval = setInterval(fetchDownloads, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchDownloads, downloads]);

  const handleFilterChange = (value: string) => {
    updateUrlParams({ status: value === "all" ? null : value });
  };

  const handleSearchChange = (value: string) => {
    updateUrlParams({ search: value || null });
  };

  const handleDelete = async (downloadId: string) => {
    if (!confirm("Are you sure you want to delete this download?")) return;

    try {
      const response = await fetch(`/api/downloads/${downloadId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchDownloads();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleRetry = async (downloadId: string) => {
    try {
      const response = await fetch(`/api/downloads/${downloadId}/retry`, {
        method: "POST",
      });
      if (response.ok) {
        fetchDownloads();
      }
    } catch (error) {
      console.error("Failed to retry:", error);
    }
  };

  return (
    <main className="min-h-screen bg-surface p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-on-surface">My Downloads</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            View and manage your downloaded media files
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={currentFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
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
            className="rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary sm:w-64"
          />
        </div>

        {/* Downloads Table */}
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-on-surface-variant">Loading...</p>
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-outline bg-surface-container">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">
                cloud_download
              </span>
              <p className="mt-4 text-on-surface-variant">
                No downloads found. Try adjusting your filters or{" "}
                <a href="/" className="text-primary hover:underline">
                  submit a new URL
                </a>
                .
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container">
              <table className="w-full">
                <thead className="border-b border-outline-variant bg-surface-container-high">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                      File
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {downloads.map((download) => (
                    <tr
                      key={download.id}
                      className="transition-colors hover:bg-surface-container-high"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-on-surface-variant">
                            {download.downloadType === "VIDEO" ? "videocam" : "image"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-on-surface">
                              {download.fileName || "Untitled"}
                            </p>
                            <p className="truncate text-xs text-on-surface-variant max-w-[300px]">
                              {download.sourceUrl}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-on-surface">
                          {download.fileSize ? formatFileSize(download.fileSize) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            download.status === "COMPLETED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : download.status === "PROCESSING"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : download.status === "FAILED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {download.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-on-surface">
                          {new Date(download.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {download.status === "COMPLETED" && (
                            <>
                              <button
                                onClick={() => {
                                  const idx = completedDownloads.findIndex((d) => d.id === download.id);
                                  setPreviewIndex(idx >= 0 ? idx : null);
                                }}
                                className="rounded px-2 py-1 text-sm text-primary hover:bg-primary/10"
                              >
                                View
                              </button>
                              <a
                                href={`/api/downloads/${download.id}/content`}
                                download
                                className="rounded px-2 py-1 text-sm text-primary hover:bg-primary/10"
                              >
                                Download
                              </a>
                            </>
                          )}
                          {download.status === "FAILED" && (
                            <button
                              onClick={() => handleRetry(download.id)}
                              className="rounded px-2 py-1 text-sm text-primary hover:bg-primary/10"
                            >
                              Retry
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(download.id)}
                            disabled={download.status === "PROCESSING"}
                            className="rounded px-2 py-1 text-sm text-error hover:bg-error/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
              />
            )}
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewDownload && previewIndex !== null && (
        <ImagePreviewModal
          isOpen={!!previewDownload}
          onClose={() => setPreviewIndex(null)}
          imageUrl={`/api/downloads/${previewDownload.id}/content`}
          fileName={previewDownload.fileName || "Unknown"}
          fileSize={previewDownload.fileSize}
          downloadUrl={`/api/downloads/${previewDownload.id}/content`}
          onPrevious={() => setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
          onNext={() => setPreviewIndex((prev) => (prev !== null && prev < completedDownloads.length - 1 ? prev + 1 : prev))}
          hasPrevious={previewIndex > 0}
          hasNext={previewIndex < completedDownloads.length - 1}
          currentIndex={previewIndex}
          totalCount={completedDownloads.length}
        />
      )}
    </main>
  );
}
