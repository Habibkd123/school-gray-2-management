"use client";

import React, { ReactNode } from "react";

export interface PageLayoutProps {
  children: ReactNode;
}

/**
 * PageLayout - The root wrapper for all ERP pages.
 * Enforces global spacing, background, and typography for the main content area.
 * It does not include the sidebar or top nav (which are in the root layout), 
 * but provides the consistent padding and container for the page itself.
 */
export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="w-full min-h-screen bg-slate-50/50 dark:bg-slate-900/20 text-slate-800 dark:text-slate-200  flex flex-col gap-5 md:gap-6">
      {children}
    </div>
  );
}
