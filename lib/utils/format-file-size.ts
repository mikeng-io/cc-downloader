/**
 * Format bytes to human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "5.3 KB", "1.2 MB", "2.5 GB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Use 2 decimal places for KB and above, no decimals for bytes
  const decimals = i === 0 ? 0 : 2;

  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${units[i]}`;
}
