import React from "react";

async function getAcademics() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.academics : null;
  } catch { return null; }
}

export default async function CurriculumPage() {
  const academics = await getAcademics();
  const overview = academics?.curriculum_overview;
  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="page-title font-serif mb-3">Curriculum Overview</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-10">Our Teaching Approach</p>
      {overview ? (
        <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line dark:text-slate-300">{overview}</p>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl dark:bg-slate-800/50 dark:border-slate-800">
          <p className="text-gray-500">Curriculum details will appear here. Add them from <strong>Admin → Website → Academics</strong>.</p>
        </div>
      )}
    </main>
  );
}
