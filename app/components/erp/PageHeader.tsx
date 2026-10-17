"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

/**
 * PageHeader - Standard header for all ERP pages.
 * Displays the page title, breadcrumb trail, and a slot for top-level action buttons.
 */
export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={index} className="flex items-center gap-2">
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-primary transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-slate-400"}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && (
                    <span className="text-slate-400 dark:text-slate-600">/</span>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
