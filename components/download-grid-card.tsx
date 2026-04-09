"use client";

import { useRef, useState, useEffect } from "react";
import { formatFileSize } from "@/lib/utils/format-file-size";

export interface GridDownload {
  id: string;
  fileName: string | null;
  fileSize?: string | number | null;
  status: string;
  mimeType: string;
  thumbnailPath: string | null;
  createdAt: string;
  downloadType: string;
}

interface Props {
  download: GridDownload;
  onPreview: () => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}

const IMAGE_MIMES = new Set(["IMAGE_JPEG", "IMAGE_PNG", "IMAGE_GIF", "IMAGE_WEBP"]);
const VIDEO_MIMES = new Set(["VIDEO_MP4", "VIDEO_WEBM"]);

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PENDING: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export function DownloadGridCard({ download, onPreview, onDelete, onRetry }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isCompleted = download.status === "COMPLETED";
  const isImage = IMAGE_MIMES.has(download.mimeType);
  const isVideo = VIDEO_MIMES.has(download.mimeType);

  // Resolve thumbnail source: server thumbnail > image content > nothing
  let thumbnailSrc: string | null = null;
  if (isCompleted && !imgError) {
    if (download.thumbnailPath) {
      thumbnailSrc = `/api/downloads/${download.id}/thumbnail`;
    } else if (isImage) {
      thumbnailSrc = `/api/downloads/${download.id}/content`;
    }
  }

  const mediaIcon = isVideo ? "videocam" : isImage ? "image" : "audio_file";
  const fileSizeNum =
    typeof download.fileSize === "string"
      ? parseInt(download.fileSize, 10)
      : (download.fileSize ?? null);

  return (
    <div
      ref={ref}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container transition-shadow hover:shadow-md"
    >
      {/* Thumbnail area */}
      <div
        className={`relative aspect-video w-full bg-surface-container-high ${isCompleted ? "cursor-pointer" : ""}`}
        onClick={isCompleted ? onPreview : undefined}
      >
        {isVisible && thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={download.fileName || "thumbnail"}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">
              {mediaIcon}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute left-2 top-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_COLORS[download.status] ?? STATUS_COLORS.PENDING
            }`}
          >
            {download.status}
          </span>
        </div>

        {/* Play icon overlay for videos with thumbnail */}
        {isVideo && isCompleted && thumbnailSrc && !imgError && isVisible && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="material-symbols-outlined rounded-full bg-black/50 p-2 text-3xl text-white">
              play_arrow
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-1 p-3">
        <p
          className="truncate text-sm font-medium text-on-surface"
          title={download.fileName || "Untitled"}
        >
          {download.fileName || "Untitled"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">
            {fileSizeNum ? formatFileSize(fileSizeNum) : "—"}
          </span>
          <span className="text-xs text-on-surface-variant">
            {new Date(download.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-1 flex flex-wrap gap-1">
          {isCompleted && (
            <>
              <button
                onClick={onPreview}
                className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
              >
                View
              </button>
              <a
                href={`/api/downloads/${download.id}/content`}
                download
                className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
              >
                Download
              </a>
            </>
          )}
          {download.status === "FAILED" && (
            <button
              onClick={() => onRetry(download.id)}
              className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => onDelete(download.id)}
            disabled={download.status === "PROCESSING"}
            className="ml-auto rounded px-2 py-1 text-xs text-error hover:bg-error/10 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
