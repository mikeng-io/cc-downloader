"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Button } from "actify";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Create a new URL with updated page parameter
  const createPageUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      return `?${params.toString()}`;
    },
    [searchParams]
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Call custom handler if provided
    onPageChange?.(page);

    // Update URL
    router.push(createPageUrl(page));
  };

  // Generate page numbers to show
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // Show at most 5 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  // Don't render if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      {/* Results info */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {startItem}–{endItem} of {total} results
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <Button
          variant="text"
          onPress={() => handlePageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          className="flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xl">chevron_left</span>
          Previous
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === "...") {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                  …
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <Button
                key={pageNum}
                variant={isActive ? "filled" : "text"}
                color={isActive ? "primary" : "secondary"}
                onPress={() => handlePageChange(pageNum)}
                className="min-w-[40px]"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next button */}
        <Button
          variant="text"
          onPress={() => handlePageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          className="flex items-center gap-1"
        >
          Next
          <span className="material-symbols-outlined text-xl">chevron_right</span>
        </Button>
      </div>
    </div>
  );
}
