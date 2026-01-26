"use client";

import { useEffect, useState } from "react";
import { DownloadCard } from "@/components/download-card";
import { UrlSubmitForm } from "@/components/url-submit-form";

interface Download {
  id: string;
  sourceUrl: string;
  downloadType: string;
  status: string;
  fileName: string | null;
  createdAt: string;
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchDownloads = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);
      if (search) params.append("search", search);

      const response = await fetch(`/api/downloads?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDownloads(data.downloads || []);
      }
    } catch (error) {
      console.error("Failed to fetch downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
    // Poll every 5 seconds
    const interval = setInterval(fetchDownloads, 5000);
    return () => clearInterval(interval);
  }, [filter, search]);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">My Downloads</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Manage your downloaded media
          </p>
        </div>

        <div className="mb-8">
          <UrlSubmitForm onSubmit={fetchDownloads} />
        </div>

        {/* Filters and View Toggle */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by filename..."
              className="rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-2 text-sm ${
                view === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView("grid")}
              className={`rounded-md px-3 py-2 text-sm ${
                view === "grid"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              Grid
            </button>
          </div>
        </div>

        {/* Downloads */}
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : downloads.length === 0 ? (
          <p className="text-center text-gray-500">
            No downloads yet. Submit a URL above to get started.
          </p>
        ) : view === "list" ? (
          <div className="space-y-4">
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
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        )}
      </div>
    </main>
  );
}
