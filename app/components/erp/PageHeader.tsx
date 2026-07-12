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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-roboto w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          {title}
        </h1>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs font-bold">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={index} className="flex items-center gap-1.5">
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-800 dark:text-slate-200">
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
