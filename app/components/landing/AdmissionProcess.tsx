import React from "react";
import { ArrowRight } from "lucide-react";

interface AdmissionsData {
  how_to_apply?: string;
  admission_open?: boolean;
  apply_url?: string;
  documents_required?: string[];
  fee_structure?: Array<{
    _id?: string;
    class_name: string;
    annual_fee: number;
    monthly_fee: number;
  }>;
}

const DEFAULT_STEPS = [
  { title: "Online Enquiry", desc: "Submit the admission enquiry form for the upcoming academic session." },
  { title: "Campus Interaction", desc: "Interactive session with the Principal and campus tour." },
  { title: "Document Submission", desc: "Submit birth certificate, previous school records, and Aadhar." },
  { title: "Fee Payment", desc: "Confirm admission by paying the first quarter fees online." },
];

export function AdmissionProcess({ data }: { data?: AdmissionsData | null }) {
  const applyUrl = data?.apply_url || "#contact";
  const admissionOpen = data?.admission_open ?? true;
  const howToApply = data?.how_to_apply;
  const docs = data?.documents_required ?? [];

  // Parse how_to_apply into steps if provided
  const apiSteps = howToApply
    ? howToApply
        .split(/\n|\.\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10)
        .slice(0, 4)
        .map((s, i) => ({ title: `Step ${i + 1}`, desc: s }))
    : [];

  const steps = apiSteps.length >= 2 ? apiSteps : DEFAULT_STEPS;

  return (
    <section id="admissions" className="py-24 bg-[var(--sidebar-bg)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Join Our Legacy</h2>
          <h3 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
            Admission Process
          </h3>
          {!admissionOpen && (
            <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-sm text-[13px] font-bold uppercase tracking-wide">
              Admissions Currently Closed
            </p>
          )}
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-8 left-0 right-0 h-1 bg-white/10" />

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center text-center group">
                <div className="w-16 h-16 bg-[var(--sidebar-bg)] border-4 border-primary text-primary rounded-full flex items-center justify-center text-xl font-black mb-6 relative z-10 shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:scale-110 group-hover:bg-primary group-hover:text-foreground transition-all duration-300">
                  {idx + 1}
                </div>
                <h4 className="text-[16px] font-bold text-white mb-3">{step.title}</h4>
                <p className="text-slate-400 text-[14px] leading-relaxed max-w-full sm:w-[200px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Documents Required */}
        {docs.length > 0 && (
          <div className="mt-16 bg-white/5 rounded-sm border border-white/10 p-8">
            <h4 className="text-primary font-bold text-[13px] uppercase tracking-widest mb-4">Documents Required</h4>
            <ul className="grid sm:grid-cols-2 gap-2">
              {docs.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-300 text-[14px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {admissionOpen && (
          <div className="mt-16 text-center">
            <a
              href={applyUrl}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-sm bg-primary text-white font-bold text-[14px] hover:bg-[var(--primary-hover)] shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all duration-300 uppercase tracking-wide"
            >
              Apply Now <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        )}

      </div>
    </section>
  );
}
