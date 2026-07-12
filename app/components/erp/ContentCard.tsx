"use client";

import React, { ReactNode } from "react";


export interface ContentCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * ContentCard - Standard container for tables, forms, and main content.
 * Enforces the 12px border radius, clean borders, and uniform shadow.
 */
export function ContentCard({ children, className = "", noPadding = false }: ContentCardProps) {
  // If no cn utility, we just merge strings
  const baseClasses = "w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm";
  const paddingClasses = noPadding ? "" : "p-4 sm:p-5";

  const finalClassName = [baseClasses, paddingClasses, className].filter(Boolean).join(" ");

  return (
    <div className={finalClassName}>
      {children}
    </div>
  );
}
