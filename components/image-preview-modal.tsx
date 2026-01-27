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
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  fileSize,
  downloadUrl,
}: ImagePreviewModalProps) {
  const [mediaType, setMediaType] = useState<"image" | "video" | "unknown">("unknown");
  const [error, setError] = useState(false);

  // Determine media type from filename
  useEffect(() => {
    if (fileName) {
      const ext = fileName.toLowerCase().split(".").pop();
      if (["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext || "")) {
        setMediaType("video");
      } else if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext || "")) {
        setMediaType("image");
      } else {
        setMediaType("unknown");
      }
    }
  }, [fileName]);

  // Close on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      setError(false);
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
                {fileSize && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(fileSize)}
                  </p>
                )}
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
                  src={imageUrl}
                  controls
                  autoPlay
                  className="max-h-[calc(90vh-120px)] max-w-full"
                  onError={() => setError(true)}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <img
                  src={imageUrl}
                  alt={fileName}
                  className="max-h-[calc(90vh-120px)] max-w-full object-contain"
                  onError={() => setError(true)}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
