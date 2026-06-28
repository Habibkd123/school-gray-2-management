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

export default async function ClassStructurePage() {
  const academics = await getAcademics();
  const classStructure = academics?.class_structure;
  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Class Structure</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-10">School Sections & Classes</p>
      {classStructure ? (
        <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{classStructure}</p>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500">Class structure details will appear here. Add them from <strong>Admin → Website → Academics</strong>.</p>
        </div>
      )}
    </main>
  );
}
