import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

interface ApplyNowSectionProps {
  data?: {
    admissions?: {
      admission_open?: boolean;
      apply_url?: string;
      how_to_apply?: string;
    };
  } | null;
}

export function ApplyNowSection({ data }: ApplyNowSectionProps) {
  const admissionOpen = data?.admissions?.admission_open ?? true;
  const applyUrl = data?.admissions?.apply_url || "#contact";
  const howToApply = data?.admissions?.how_to_apply;

  const details = howToApply
    ? howToApply.split(/\n+/).filter(Boolean).slice(0, 3)
    : [
        "Submit the online enquiry form to reserve your child’s seat.",
        "Attend a personalized campus tour with our admissions team.",
        "Complete documents and pay fees securely online.",
      ];

  return (
    <section className="py-24 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-[28px] overflow-hidden bg-gradient-to-r from-[var(--primary)] via-[#1D3C62] to-[#231F20] shadow-2xl border border-white/10">
          <div className="grid lg:grid-cols-2 gap-0">
            <div className="relative p-10 sm:p-16 text-white">
              <div className="absolute inset-y-0 left-0 w-2 bg-white/10" />
              <div className="relative z-10">
                <SectionHeading
                  eyebrow="Ready to Join"
                  title="Apply for admission with confidence."
                  description="A simplified admission experience supported by clear guidance, strong facilities, and a caring campus community."
                  align="left"
                />
                <div className="grid gap-4 mt-8">
                  {details.map((text, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-white/10 rounded-2xl p-4">
                      <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                      <p className="text-sm leading-relaxed text-white/90">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative p-10 sm:p-16 bg-[#0C172A]">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] uppercase tracking-[0.25em] text-white/80 font-bold">
                    {admissionOpen ? "Admission Open" : "Admission Closed"}
                  </span>
                  <h3 className="mt-10 text-3xl font-black text-white leading-tight">
                    {admissionOpen
                      ? "Start your child’s future at our campus today."
                      : "Enrollment is currently paused — join the waiting list."}
                  </h3>
                  <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-xl">
                    {admissionOpen
                      ? "Our admissions team is here to help you complete the process quickly and transparently."
                      : "We will notify you when the next admission window opens."}
                  </p>
                </div>

                <div className="mt-10">
                  <a
                    href={applyUrl}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                      admissionOpen
                        ? "bg-white text-[var(--primary)] hover:bg-slate-100 shadow-xl shadow-white/10"
                        : "bg-slate-700 text-slate-300 cursor-not-allowed opacity-70"
                    }`}
                  >
                    {admissionOpen ? "Apply Now" : "Join Waitlist"}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <div className="mt-6 text-sm text-slate-400">
                    <span className="font-semibold">Need help?</span> Email us at admissions@school.edu.in or call +91 98765 43210.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
