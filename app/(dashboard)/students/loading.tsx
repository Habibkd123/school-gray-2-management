// Loading skeleton — rendered INSTANTLY by Next.js while the page suspends.
// The layout (sidebar + header) is already visible; only the content area shows this skeleton.
// This file auto-wraps page.tsx in a <Suspense> boundary — zero JS required.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-0" aria-label="Loading page content..." aria-busy="true">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>

      {/* Filter/search bar skeleton */}
      <div className="flex gap-3 mb-4">
        <div className="h-9 flex-1 max-w-xs bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>

      {/* Stats cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-2">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-7 w-14 bg-slate-300 dark:bg-slate-600 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="border-b border-slate-100 dark:border-slate-700 px-4 py-3 flex gap-4">
          {[40, 120, 80, 100, 60, 60].map((w, i) => (
            <div key={i} className={`h-4 bg-slate-200 dark:bg-slate-700 rounded`} style={{ width: w }} />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 items-center border-b border-slate-50 dark:border-slate-700/50 last:border-0">
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0" />
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}