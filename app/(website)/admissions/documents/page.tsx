import React from "react";
import { CheckCircle2 } from "lucide-react";

async function getAdmissions() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.admissions : null;
  } catch { return null; }
}

export default async function DocumentsPage() {
  const admissions = await getAdmissions();
  const docs = admissions?.documents_required ?? [];
  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Documents Required</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-10">Bring the following documents at the time of admission</p>
      {docs.length > 0 ? (
        <ul className="grid sm:grid-cols-2 gap-4">
          {docs.map((doc: string, i: number) => (
            <li key={i} className="flex items-start gap-3 bg-white p-5 rounded-sm border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-slate-700 font-medium text-[14px] dark:text-slate-200">{doc}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl dark:bg-slate-800/50 dark:border-slate-800">
          <p className="text-gray-500">Documents list will appear here. Add it from <strong>Admin → Website → Admissions</strong>.</p>
        </div>
      )}
    </main>
  );
}
