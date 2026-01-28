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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNext && onNext) {
      onNext();
    } else if (isRightSwipe && hasPrevious && onPrevious) {
      onPrevious();
    }
  };

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 sm:p-4"
          onClick={onClose}
        >
          {/* Previous button - Better positioned for mobile */}
          {hasPrevious && onPrevious && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-3 text-gray-900 shadow-lg transition-all hover:bg-white hover:scale-110 active:scale-95 sm:left-4 sm:p-4"
              aria-label="Previous"
            >
              <span className="material-symbols-outlined text-2xl sm:text-3xl">chevron_left</span>
            </button>
          )}

          {/* Next button - Better positioned for mobile */}
          {hasNext && onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-3 text-gray-900 shadow-lg transition-all hover:bg-white hover:scale-110 active:scale-95 sm:right-4 sm:p-4"
              aria-label="Next"
            >
              <span className="material-symbols-outlined text-2xl sm:text-3xl">chevron_right</span>
            </button>
          )}

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative h-full w-full overflow-hidden bg-white shadow-2xl dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-[90vw] sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 sm:px-4 sm:py-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                  {fileName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                  {fileSize && <span>{formatFileSize(fileSize)}</span>}
                  {currentIndex !== undefined && totalCount !== undefined && (
                    <>
                      {fileSize && <span>·</span>}
                      <span>{currentIndex + 1} of {totalCount}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="ml-2 flex items-center gap-1 sm:ml-4 sm:gap-2">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={fileName}
                    className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-primary/90 sm:px-3 sm:py-1.5 sm:text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg">download</span>
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Close preview"
                >
                  <span className="material-symbols-outlined text-xl sm:text-2xl">close</span>
                </button>
              </div>
            </div>

            {/* Media container */}
            <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 min-h-[50vh] sm:min-h-[300px]">
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
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain sm:max-h-[calc(90vh-120px)] sm:max-w-full"
                  onError={() => setError(true)}
                  style={{ maxHeight: 'calc(100vh - 120px)' }}
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
                  className="h-full w-full object-contain sm:max-h-[calc(90vh-120px)] sm:max-w-full"
                  style={{ maxHeight: 'calc(100vh - 120px)' }}
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
              <div className="border-t border-gray-200 bg-white px-4 py-2 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                <span className="hidden sm:inline">Use arrow keys or </span>Swipe to navigate
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
