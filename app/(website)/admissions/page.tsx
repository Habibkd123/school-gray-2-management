import React from "react";
import { CheckCircle2, FileText, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";

async function getLanding() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export default async function AdmissionsPage() {
  const data = await getLanding();
  const admissions = data?.admissions;
  const howToApply = admissions?.how_to_apply;
  const admissionOpen = admissions?.admission_open ?? true;
  const applyUrl = admissions?.apply_url || "#";
  const docs = admissions?.documents_required ?? [];
  const fees = admissions?.fee_structure ?? [];

  return (
    <main className="w-full">
      {/* Hero */}
      <section className="relative py-28 bg-[var(--sidebar-bg)] overflow-hidden">
        <div className="absolute inset-0">
          <img src={admissions?.hero_image_url || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1920&auto=format&fit=crop"} alt="Admissions" className="w-full h-full object-cover opacity-45 blur-[3px] scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 to-[#0F172A]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-primary/20 border border-primary/30 text-[#FCA5A5] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Join Our Legacy</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight mb-4">Admissions</h1>
          {admissionOpen ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[13px] font-bold rounded-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Admissions Open
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[13px] font-bold rounded-sm">
              Admissions Currently Closed
            </span>
          )}
        </div>
      </section>

      {/* How to Apply */}
      {howToApply && (
        <section className="py-16 bg-white dark:bg-slate-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Process</h2>
            <h3 className="text-3xl font-serif font-bold text-foreground mb-6">How to Apply</h3>
            <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line dark:text-slate-300">{howToApply}</p>
            {admissionOpen && (
              <a href={applyUrl} target={applyUrl.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-bold rounded-sm hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-primary/20 uppercase tracking-wide">
                Apply Now <ArrowRight className="w-5 h-5" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* Documents */}
      {docs.length > 0 && (
        <section className="py-16 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Documents</h2>
            <h3 className="text-3xl font-serif font-bold text-foreground mb-8">Documents Required</h3>
            <ul className="grid sm:grid-cols-2 gap-4">
              {docs.map((doc: string, i: number) => (
                <li key={i} className="flex items-start gap-3 bg-white p-4 rounded-sm border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-[14px] font-medium dark:text-slate-200">{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}


      {/* Quick links */}
      <section className="py-14 bg-[var(--sidebar-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: "/admissions/apply", label: "Apply Online" },
              { href: "/admissions/documents", label: "Documents Required" },
              { href: "/admissions/online-form", label: "Online Enquiry" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-sm hover:bg-primary/10 hover:border-primary/30 transition-all group">
                <span className="text-white font-bold text-[14px]">{l.label}</span>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
