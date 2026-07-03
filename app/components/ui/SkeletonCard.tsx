"use client";

import React from "react";

// ─── Skeleton Stat Card (top metric cards on dashboard) ───────────
export function SkeletonStatCard() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-[52px] h-[52px] rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50">
        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

// ─── Skeleton Table Rows ──────────────────────────────────────────
interface SkeletonTableRowsProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTableRows({ rows = 5, cols = 5 }: SkeletonTableRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="animate-pulse">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div
                className="h-4 rounded bg-slate-200 dark:bg-slate-800"
                style={{ width: colIdx === 0 ? "60%" : colIdx === cols - 1 ? "40%" : "80%" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Skeleton Card (generic info card) ───────────────────────────
interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow animate-pulse">
      <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 rounded bg-slate-200 dark:bg-slate-800"
            style={{ width: i === lines - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton List Item (for notice/leave lists) ──────────────────
export function SkeletonListItem({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center gap-4 py-3.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0"
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-5 w-16 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </>
  );
}

// ─── Skeleton Leave Card (dashboard leave requests) ───────────────
export function SkeletonLeaveCard({ count = 2 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse border border-slate-100 dark:border-slate-800/50 rounded-xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/50">
            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </>
  );
}
