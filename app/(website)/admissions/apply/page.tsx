import React from "react";
import { ArrowRight } from "lucide-react";

async function getAdmissions() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.admissions : null;
  } catch { return null; }
}

export default async function ApplyPage() {
  const admissions = await getAdmissions();
  const admissionOpen = admissions?.admission_open ?? true;
  const applyUrl = admissions?.apply_url || "";
  const howToApply = admissions?.how_to_apply;

  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-[#0F172A] mb-3">Apply for Admission</h1>
      <p className="text-[#1E3A5F] font-bold uppercase tracking-widest text-[12px] mb-10">
        {admissionOpen ? "Admissions are currently open" : "Admissions are currently closed"}
      </p>
      {howToApply && (
        <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line mb-10">{howToApply}</p>
      )}
      {admissionOpen && applyUrl ? (
        <a href={applyUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#1E3A5F] text-white font-bold rounded-sm hover:bg-[#162C47] transition-all shadow-lg uppercase tracking-wide">
          Apply Now <ArrowRight className="w-5 h-5" />
        </a>
      ) : !admissionOpen ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl">
          <p className="text-rose-600 font-medium">Admissions are currently closed. Please check back later or contact the admissions office.</p>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500">Apply link will appear here. Add it from <strong>Admin → Website → Admissions</strong>.</p>
        </div>
      )}
    </main>
  );
}
