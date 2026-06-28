"use client";

import React from "react";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const from = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const to = Math.min(currentPage * pageSize, totalItems);

  // Build page number array with ellipsis
  const pages: (number | "...")[] = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "...")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-border ${className}`}
    >
      <p className="text-[13px] text-slate-500 dark:text-slate-400">
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

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-2 text-slate-400 text-[13px]">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-colors ${
                p === currentPage
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "border border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/** Simple hook for client-side pagination */
export function usePagination<T>(data: T[], pageSize = 10) {
  const [page, setPage] = React.useState(1);

  // Reset to page 1 whenever data length changes (e.g. after search)
  React.useEffect(() => {
    setPage(1);
  }, [data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = data.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page: safePage,
    setPage,
    totalPages,
    totalItems: data.length,
    pageSize,
    paged,
  };
}
