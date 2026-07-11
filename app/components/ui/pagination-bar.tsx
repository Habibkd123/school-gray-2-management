"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export const PERSISTED_PAGE_SIZE_KEY = "erp_page_size";

/** Helper to retrieve session page size choice, defaulting to 25 */
export function getPersistedPageSize(defaultValue = 25): number {
  if (typeof window !== "undefined") {
    const saved = window.sessionStorage.getItem(PERSISTED_PAGE_SIZE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if ([10, 25, 50, 100].includes(parsed)) return parsed;
    }
  }
  return defaultValue;
}

/** Helper to persist session page size choice */
export function persistPageSize(size: number): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(PERSISTED_PAGE_SIZE_KEY, String(size));
  }
}

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  className = "",
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const from = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const to = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array with ellipsis
  const pages: (number | "...")[] = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "...")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    persistPageSize(newSize);
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
  };

  const isFirstDisabled = currentPage <= 1 || isLoading;
  const isLastDisabled = currentPage >= totalPages || isLoading;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-border bg-white dark:bg-slate-900 transition-colors ${
        isLoading ? "opacity-75" : ""
      } ${className}`}
    >
      {/* Records Count and Page Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="card-subtitle text-[13px]">
          Showing{" "}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {from}–{to}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {totalItems}
          </span>{" "}
          results
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 no-print">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Show
            </span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              disabled={isLoading}
              className="px-2 py-1 text-[12px] font-bold border border-border rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5 no-print">
        {/* First Page Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={isFirstDisabled}
          className="p-2 rounded-lg border border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstDisabled}
          className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Desktop Page Numbers list */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="px-2 text-slate-400 text-[13px] font-bold">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                disabled={isLoading}
                className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-colors ${
                  p === currentPage
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "border border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Mobile Page indicator */}
        <span className="sm:hidden px-3 text-[12.5px] font-bold text-slate-600 dark:text-slate-300">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastDisabled}
          className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          title="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page Button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={isLastDisabled}
          className="p-2 rounded-lg border border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Helper hook for client-side pagination with persisted page size option */
export function usePagination<T>(data: T[], initialPageSize = 25) {
  const [pageSize, setPageSize] = React.useState(() => getPersistedPageSize(initialPageSize));
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [data.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = data.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems: data.length,
    paged,
  };
}
