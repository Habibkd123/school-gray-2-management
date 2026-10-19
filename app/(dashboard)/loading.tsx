export default function DashboardLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse p-2 md:p-4" aria-label="Loading..." aria-busy="true">
      {/* Top Header / Breadcrumbs Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-md" />
          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-9 w-32 bg-primary/20 rounded-lg" />
        </div>
      </div>

      {/* Stats Cards Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-border shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700/60" />
            </div>
            <div className="h-7 w-24 bg-slate-300 dark:bg-slate-600 rounded-md" />
            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-700/40 rounded" />
          </div>
        ))}
      </div>

      {/* Content Table / Main Area Skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 pb-3 border-b border-border/60">
          <div className="h-9 w-64 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
            <div className="h-9 w-28 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/40 flex items-center px-4 gap-4">
              <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded hidden sm:block" />
              <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded hidden md:block" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
