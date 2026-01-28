"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatFileSize } from "@/lib/utils/format-file-size";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  fileSize?: number | null;
  downloadUrl?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  fileSize,
  downloadUrl,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  currentIndex,
  totalCount,
}: ImagePreviewModalProps) {
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | "unknown">("unknown");
  const [error, setError] = useState(false);

  // Determine media type from filename
  useEffect(() => {
    if (fileName) {
      const ext = fileName.toLowerCase().split(".").pop();
      if (["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext || "")) {
        setMediaType("video");
      } else if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext || "")) {
        setMediaType("image");
      } else if (["mp3", "wav", "m4a", "flac", "aac", "ogg"].includes(ext || "")) {
        setMediaType("audio");
      } else {
        setMediaType("unknown");
      }
    }
  }, [fileName]);

  // Reset error when imageUrl changes
  useEffect(() => {
    setError(false);
  }, [imageUrl]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext && onNext) {
        onNext();
      }
    },
    [onClose, onPrevious, onNext, hasPrevious, hasNext]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          {/* Previous button */}
          {hasPrevious && onPrevious && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              aria-label="Previous"
            >
              <span className="material-symbols-outlined text-3xl">chevron_left</span>
            </button>
          )}

          {/* Next button */}
          {hasNext && onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              aria-label="Next"
            >
              <span className="material-symbols-outlined text-3xl">chevron_right</span>
            </button>
          )}

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                  {fileName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  {fileSize && <span>{formatFileSize(fileSize)}</span>}
                  {currentIndex !== undefined && totalCount !== undefined && (
                    <>
                      {fileSize && <span>·</span>}
                      <span>{currentIndex + 1} of {totalCount}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={fileName}
                    className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    Download
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Close preview"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>
            </div>

            {/* Media container */}
            <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 min-h-[300px]">
              {error ? (
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-5xl text-gray-400 mb-2">error</span>
                  <p className="text-gray-500 dark:text-gray-400">Failed to load media</p>
                </div>
              ) : mediaType === "video" ? (
                <video
                  key={imageUrl}
                  src={imageUrl}
                  controls
                  autoPlay
                  className="max-h-[calc(90vh-120px)] max-w-full"
                  onError={() => setError(true)}
                >
                  Your browser does not support video playback.
                </video>
              ) : mediaType === "audio" ? (
                <div className="p-8 flex flex-col items-center gap-4">
                  <span className="material-symbols-outlined text-6xl text-gray-400">audio_file</span>
                  <audio
                    key={imageUrl}
                    src={imageUrl}
                    controls
                    autoPlay
                    className="w-full max-w-md"
                    onError={() => setError(true)}
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : mediaType === "image" ? (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt={fileName}
                  className="max-h-[calc(90vh-120px)] max-w-full object-contain"
                  onError={() => setError(true)}
                />
              ) : (
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-5xl text-gray-400 mb-2">description</span>
                  <p className="text-gray-500 dark:text-gray-400">Preview not available for this file type</p>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={fileName}
                      className="mt-4 inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      <span className="material-symbols-outlined text-lg">download</span>
                      Download File
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Footer with navigation hint */}
            {(hasPrevious || hasNext) && (
              <div className="border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Use arrow keys to navigate
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
