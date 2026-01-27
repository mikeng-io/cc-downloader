"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pagination } from "./pagination";
import { ImagePreviewModal } from "./image-preview-modal";
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

const ITEMS_PER_PAGE = 10;
const POLL_INTERVAL = 5000;

export function RecentDownloads() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<DownloadsResponse["pagination"] | null>(null);
  const [previewDownload, setPreviewDownload] = useState<Download | null>(null);

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
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDownloads();
      }
    }, POLL_INTERVAL);

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

  const handleDelete = async (downloadId: string) => {
    if (!confirm("Delete this download?")) return;
    try {
      const response = await fetch(`/api/downloads/${downloadId}`, { method: "DELETE" });
      if (response.ok) fetchDownloads();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-on-surface">Recent Downloads</h2>
        <div className="h-48 flex items-center justify-center text-on-surface-variant">
          Loading...
        </div>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-on-surface">Recent Downloads</h2>
        <div className="rounded-lg border border-dashed border-outline bg-surface-container p-12 text-center">
          <span className="material-symbols-outlined mb-4 text-6xl text-on-surface-variant">
            cloud_download
          </span>
          <p className="text-on-surface-variant">
            No downloads yet. Submit a URL above to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-on-surface">Recent Downloads</h2>
        <a
          href="/downloads"
          className="rounded-md bg-surface-container px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high"
        >
          View All
        </a>
      </div>

      {/* Table View */}
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
              <tr key={download.id} className="hover:bg-surface-container-high">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant">
                      {download.downloadType === "VIDEO" ? "videocam" : "image"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-on-surface">
                        {download.fileName || "Untitled"}
                      </p>
                      <p className="truncate text-xs text-on-surface-variant max-w-[250px]">
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
                          onClick={() => setPreviewDownload(download)}
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

      {/* Preview Modal */}
      {previewDownload && (
        <ImagePreviewModal
          isOpen={!!previewDownload}
          onClose={() => setPreviewDownload(null)}
          imageUrl={`/api/downloads/${previewDownload.id}/content`}
          fileName={previewDownload.fileName || "Unknown"}
          fileSize={previewDownload.fileSize}
          downloadUrl={`/api/downloads/${previewDownload.id}/content`}
        />
      )}
    </div>
  );
}
