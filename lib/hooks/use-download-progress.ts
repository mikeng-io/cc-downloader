"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface DownloadProgress {
  downloadId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress?: {
    bytesDownloaded: number;
    totalBytes: number | null;
    percentage: number;
    speed: number | null;
    eta: number | null;
  };
  result?: {
    fileName: string;
    fileSize: number | null;
    mimeType: string;
  };
  error?: {
    type: string;
    message: string;
    retryable: boolean;
  };
  updatedAt: string;
}

interface UseDownloadProgressOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export function useDownloadProgress(
  downloadId: string | null,
  options: UseDownloadProgressOptions = {}
) {
  const { pollInterval = 3000, enabled = true } = options;
  const [data, setData] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!downloadId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/downloads/${downloadId}/progress`);
      if (!response.ok) {
        throw new Error("Failed to fetch progress");
      }
      const progressData = await response.json();
      setData(progressData);

      // Stop polling if completed or failed
      if (
        progressData.status === "COMPLETED" ||
        progressData.status === "FAILED" ||
        progressData.status === "CANCELLED"
      ) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [downloadId, enabled]);

  useEffect(() => {
    if (!downloadId || !enabled) return;

    // Initial fetch
    fetchProgress();

    // Set up polling
    intervalRef.current = setInterval(fetchProgress, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [downloadId, pollInterval, enabled, fetchProgress]);

  const refetch = useCallback(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    data,
    error,
    isLoading,
    refetch,
    isComplete: data?.status === "COMPLETED",
    isFailed: data?.status === "FAILED",
    isProcessing: data?.status === "PROCESSING",
    isPending: data?.status === "PENDING",
  };
}
