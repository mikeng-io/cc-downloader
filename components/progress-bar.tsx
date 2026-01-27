import { DownloadProgress } from "@/lib/hooks/use-download-progress";
import { LinearProgress } from "actify";

interface ProgressBarProps {
  progress: DownloadProgress;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const percentage = progress.progress?.percentage ?? 0;
  const bytesDownloaded = progress.progress?.bytesDownloaded ?? 0;
  const totalBytes = progress.progress?.totalBytes;
  const speed = progress.progress?.speed;
  const eta = progress.progress?.eta;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number | null): string => {
    if (!bytesPerSecond) return "";
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatEta = (seconds: number | null | undefined): string => {
    if (!seconds || seconds < 0) return "";
    if (seconds < 60) return `${seconds}s left`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m left`;
    return `${Math.ceil(seconds / 3600)}h left`;
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case "COMPLETED":
        return "primary";
      case "FAILED":
      case "CANCELLED":
        return "error";
      case "PROCESSING":
        return "primary";
      default:
        return "primary";
    }
  };

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium capitalize">{progress.status.toLowerCase()}</span>
        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
          {totalBytes && (
            <span>
              {formatBytes(bytesDownloaded)} / {formatBytes(totalBytes)}
            </span>
          )}
          {speed && <span>{formatSpeed(speed)}</span>}
          {eta !== null && <span>{formatEta(eta)}</span>}
        </div>
      </div>
      <LinearProgress value={Math.min(percentage, 100)} color={getStatusColor()} />
      {progress.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {progress.error.message}
        </p>
      )}
    </div>
  );
}
