/**
 * LoadingSkeleton Component
 * Provides a loading placeholder with Material 3 shimmer effect
 */

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string;
  height?: string;
}

export function LoadingSkeleton({
  className = "",
  variant = "rectangular",
  width = "100%",
  height = "1rem",
}: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700 rounded";

  const variantClasses = {
    text: "h-4 w-3/4",
    circular: "rounded-full",
    rectangular: "rounded-md",
    card: "h-24 w-full rounded-lg",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <div
      className={classes.trim()}
      style={{ width: variant === "text" ? undefined : width, height: variant === "text" ? undefined : height }}
    />
  );
}

/**
 * CardSkeleton Component
 * Skeleton for download cards while loading
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800 animate-pulse">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-2 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="flex justify-end gap-2 mt-4">
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

/**
 * ProgressSkeleton Component
 * Skeleton for progress bar while loading
 */
export function ProgressSkeleton() {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex items-center gap-4">
          <span className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <span className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}
