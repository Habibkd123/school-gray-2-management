"use client";

import React, { ReactNode } from "react";

export interface PageToolbarProps {
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  className?: string;
}

/**
 * PageToolbar - Standard toolbar wrapper for list/table pages.
 * Usually placed above a ContentCard or Data Table.
 * Flexibly accepts left and right action groups (Search, Filters, Print, etc.).
 */
export function PageToolbar({ leftActions, rightActions, className = "" }: PageToolbarProps) {
  const baseClasses = "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 w-full mb-4";
  const finalClassName = [baseClasses, className].filter(Boolean).join(" ");

  return (
    <div className={finalClassName}>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {leftActions}
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
        {rightActions}
      </div>
    </div>
  );
}
