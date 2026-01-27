"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "actify";

interface DownloadActionsProps {
  downloadId: string;
  status: string;
  storagePath: string | null;
  onDeleted?: () => void;
}

export function DownloadActions({ downloadId, status, storagePath, onDeleted }: DownloadActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/downloads/${downloadId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onDeleted?.();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch(`/api/downloads/${downloadId}/retry`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to retry:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = async () => {
    // TODO: Generate presigned URL from MinIO and trigger download
    console.log("Download file:", storagePath);
  };

  return (
    <div className="flex items-center gap-2">
      {/* View button - primary action for completed media */}
      {status === "COMPLETED" && (
        <Button
          variant="filled"
          className="flex items-center gap-1"
          onPress={() => {
            window.location.href = `/view/${downloadId}`;
          }}
        >
          <span className="material-symbols-outlined text-xl">visibility</span>
          View
        </Button>
      )}

      {/* Download button - secondary action */}
      {status === "COMPLETED" && (
        <a
          href={`/api/downloads/${downloadId}/content`}
          download
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-transparent px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="material-symbols-outlined text-xl">download</span>
          Download
        </a>
      )}

      {/* Retry button for failed downloads */}
      {status === "FAILED" && (
        <Button
          variant="outlined"
          color="secondary"
          onPress={handleRetry}
          isDisabled={isRetrying}
          className="flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
          {isRetrying ? "Retrying..." : "Retry"}
        </Button>
      )}

      {/* Delete button */}
      <Button
        variant="text"
        color="error"
        onPress={() => setShowConfirm(true)}
        isDisabled={isDeleting || status === "PROCESSING"}
        className="flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-xl">delete</span>
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>

      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Download?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This action cannot be undone. The file will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="text"
                color="secondary"
                onPress={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="filled"
                color="error"
                onPress={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
