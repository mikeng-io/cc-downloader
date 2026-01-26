"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      {storagePath && status === "COMPLETED" && (
        <button
          onClick={handleDownload}
          className="rounded-md px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900"
        >
          Download
        </button>
      )}

      {status === "FAILED" && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="rounded-md px-3 py-1 text-sm font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900 disabled:opacity-50"
        >
          {isRetrying ? "Retrying..." : "Retry"}
        </button>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting || (status === "PROCESSING" && !showConfirm)}
        className="rounded-md px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900 disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <p className="mb-4">Are you sure you want to delete this download?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
