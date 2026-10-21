"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 border border-rose-200 dark:border-rose-500/20 shadow-sm">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
        Unable to Load Dashboard View
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        {error?.message || "An unexpected error occurred while loading this report or page."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              sessionStorage.clear();
            }
            reset();
          }}
          className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
