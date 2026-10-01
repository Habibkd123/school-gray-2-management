"use client";

import React, { useState } from "react";
import { Calculator, Clock, FileText, ArrowRight, TrendingUp, ShieldCheck } from "lucide-react";

interface SaaSCalculatorProps {
  onOpenDemo: () => void;
}

export function SaaSCalculator({ onOpenDemo }: SaaSCalculatorProps) {
  const [studentCount, setStudentCount] = useState(850);

  // Realistic Indian School Operations metrics:
  // 1. Paper, registers, report card cards, and diary printing: ~₹280/student/year
  // 2. Staff administrative time: ~2.2 hours/student/year on registers, tabulation, dues reconciliation
  // 3. Automated SMS / WhatsApp fee reminder recovery value: ~₹450/student/year saved in unpaid dues
  const paperSavings = studentCount * 280;
  const staffHoursSaved = Math.round(studentCount * 2.2);
  const feeRecoveryImpact = studentCount * 450;
  const netFinancialValue = paperSavings + feeRecoveryImpact + Math.round(staffHoursSaved * 60);

  return (
    <section id="calculator" className="py-24 bg-[#080B12] border-t border-slate-800/80 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 text-xs font-semibold text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/25 tracking-wide">
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>School Operational Audit</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Calculate Your Campus Time &amp; Cost ROI
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2.5 font-normal leading-relaxed">
            See the quantifiable impact of digitizing admissions, attendance registers, and fee collection across your school strength.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-10 lg:p-12 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Controls & Slider (7 Cols) */}
            <div className="lg:col-span-7 space-y-7">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="student-slider" className="text-sm font-semibold text-slate-200">
                    Active Student Enrollment
                  </label>
                  <span className="px-3.5 py-1 rounded-xl bg-slate-950 border border-slate-700/80 text-amber-300 font-mono font-bold text-base">
                    {studentCount.toLocaleString()} Students
                  </span>
                </div>

                <input
                  id="student-slider"
                  type="range"
                  min="150"
                  max="3500"
                  step="50"
                  value={studentCount}
                  onChange={(e) => setStudentCount(parseInt(e.target.value))}
                  className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400 border border-slate-800"
                />

                <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
                  <span>150 Students</span>
                  <span>1,800 Avg Campus</span>
                  <span>3,500+ Group</span>
                </div>
              </div>

              {/* Realistic Operational Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Stationery &amp; Print</span>
                  </div>
                  <div className="text-lg font-bold text-white tabular-nums">
                    ₹ {paperSavings.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Registers, diaries, forms</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Staff Hours Saved</span>
                  </div>
                  <div className="text-lg font-bold text-white tabular-nums">
                    {staffHoursSaved.toLocaleString()} <span className="text-xs text-slate-400 font-normal">hrs</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Tabulation &amp; attendance</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Defaulter Dues</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-400 tabular-nums">
                    +18% Faster
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Instant UPI WhatsApp link</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Estimates verified across 15+ affiliated CBSE &amp; RBSE school administrations.</span>
              </div>
            </div>

            {/* Right Result Card (5 Cols) with Moving Border */}
            <div className="lg:col-span-5 moving-border-card-subtle shadow-xl">
              <div className="moving-border-inner p-7 sm:p-8 text-center relative flex flex-col justify-between h-full">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Total Quantified Campus Value
                  </span>

                  <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums font-mono">
                    <span className="text-amber-400">₹ {netFinancialValue.toLocaleString()}</span>
                    <span className="text-xs font-normal text-slate-400 block mt-1 font-sans">
                      net operational benefit per academic year
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-4 leading-relaxed font-normal">
                    Eliminates physical register maintenance, manual fee reconciliation mistakes, and reduces administrative overhead by over 70%.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2.5">
                  <button
                    onClick={onOpenDemo}
                    className="w-full py-3 px-5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Request Full Campus Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-[10px] text-slate-500">
                    Customized walkthrough with your school&apos;s current fee structure
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
