// Instant streaming skeleton for Admissions Conversion Reports
export default function AdmissionsReportsLoading() {
  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left animate-pulse" aria-busy="true">
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Summary Panel Skeleton */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-6 lg:col-span-1">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-850 border border-border rounded-xl space-y-2">
                <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 w-20 bg-slate-300 dark:bg-slate-600 rounded" />
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1 py-1">
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3.5 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Class Breakdown Skeleton */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="h-5 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-8 w-44 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table w-full">
              <thead>
                <tr className="border-b border-border text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3"><div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></th>
                  <th className="py-3 px-2 text-center"><div className="h-3.5 w-10 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></th>
                  <th className="py-3 px-2 text-center"><div className="h-3.5 w-10 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></th>
                  <th className="py-3 px-2 text-center"><div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></th>
                  <th className="py-3 px-2 text-center"><div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></th>
                  <th className="py-3 px-2 text-center"><div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></th>
                  <th className="py-3 px-2 text-center"><div className="h-3.5 w-14 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="py-3">
                    <td className="py-3.5 px-3"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-2 text-center"><div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-2 text-center"><div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-2 text-center"><div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-2 text-center"><div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-2 text-center"><div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="py-3.5 px-2 text-center"><div className="h-4 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
