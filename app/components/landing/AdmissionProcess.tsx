"use client";

import React from "react";
import { ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

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

export function AdmissionProcess({ data }: { data?: AdmissionsData | null }) {
  const applyUrl = data?.apply_url || "#contact";
  const admissionOpen = data?.admission_open ?? true;
  const docs = data?.documents_required ?? [];

  return (
    <section id="admissions" className="py-24 relative overflow-hidden bg-[var(--section-alt)]">
      
      {/* Background gradients matching FAQ.tsx */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 dark:bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--primary-hover)]/20 dark:bg-[var(--primary-hover)]/10 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 md:p-16 rounded-xl shadow-lg text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            {admissionOpen ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success/20 border border-success/50 text-success font-bold uppercase tracking-wider text-sm shadow-[0_0_15px_var(--success)]">
                <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                Admissions Open for 2026-27
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-danger/20 border border-danger/50 text-danger font-bold uppercase tracking-wider text-sm">
                Admissions Closed
              </span>
            )}
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="page-title md:text-6xl mb-6 leading-tight"
          >
            Begin Your Educational Journey With Us
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-text max-w-2xl mx-auto mb-10 leading-relaxed font-light"
          >
            Join a community of lifelong learners and future leaders. Secure your spot today and unlock a world of opportunities.
          </motion.p>

          {admissionOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
              className="flex justify-center mb-12"
            >
              <a
                href={applyUrl}
                className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_var(--primary)] hover:scale-105"
              >
                <span className="relative">Apply Now</span>
                <ArrowRight className="relative w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          )}

          {docs.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10 text-left"
            >
              <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
                <FileText className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-foreground uppercase tracking-wider text-sm">Required Documents</h4>
              </div>
              <ul className="grid sm:grid-cols-2 gap-4">
                {docs.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-muted-text text-sm">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

        </div>
      </div>
    </section>
  );
}
