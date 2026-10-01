// Website page loading skeleton — shown immediately while the Server Component
// fetches landing data from MongoDB. The website layout (nav + footer) is already painted.
export default function Loading() {
  return (
    <div className="animate-pulse w-full min-h-[60vh]" aria-label="Loading..." aria-busy="true">
      {/* Hero banner skeleton */}
      <div className="w-full h-[420px] bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        <div className="absolute bottom-10 left-10 space-y-3">
          <div className="h-10 w-72 bg-white/20 rounded-xl" />
          <div className="h-5 w-96 bg-white/15 rounded-lg" />
          <div className="flex gap-3 mt-4">
            <div className="h-11 w-32 bg-white/25 rounded-full" />
            <div className="h-11 w-32 bg-white/15 rounded-full" />
          </div>
        </div>
      </div>

      {/* Content section skeletons */}
      <div className="max-w-7xl mx-auto px-4 py-14 space-y-12">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 space-y-3">
              <div className="h-8 w-16 bg-slate-300 dark:bg-slate-600 rounded-lg" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>

        {/* Two-column content */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-4 bg-slate-100 dark:bg-slate-800 rounded ${i === 4 ? 'w-3/4' : 'w-full'}`} />
              ))}
            </div>
          </div>
          <div className="h-56 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>

        {/* Card grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-5 space-y-3">
              <div className="h-12 w-12 bg-slate-300 dark:bg-slate-600 rounded-xl" />
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-700/50 rounded" />
              <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}