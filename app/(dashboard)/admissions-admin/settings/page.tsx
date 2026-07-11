"use client";

import React, { useState } from "react";
import {
  Settings, Save, Globe, Info, HelpCircle, CheckCircle, AlertCircle
} from "lucide-react";

export default function AdmissionsSettingsPage() {
  const [admissionsOpen, setAdmissionsOpen] = useState(true);
  const [session, setSession] = useState("2026-2027");
  const [instructionText, setInstructionText] = useState(
    "1. Complete the online registration form.\n2. Upload Student Photo and Birth Certificate proof.\n3. Pay registration fees online.\n4. Verification team will review documents."
  );

  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Settings updated successfully", "success");
  };

  const labelClass = "block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5";
  const fieldClass = "w-full bg-slate-50 dark:bg-slate-800 border border-border rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-550 focus:outline-none focus:border-primary transition-colors text-[13.5px]";

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {toast && (
        <div className={`fixed top-5 right-5 z-[80] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold transition-all ${
          toast.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admissions Settings</h1>
          <p className="text-[12px] text-slate-500 mt-1 font-normal">Configure parameters and public facing instructions</p>
        </div>
      </div>

      <div className="max-w-2xl bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 pb-3 border-b border-border flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> Configuration presets
          </h2>

          <div className="space-y-5">
            {/* Toggle admission open */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-border">
              <div>
                <span className="text-[13.5px] font-bold text-slate-800 dark:text-slate-200">Open Online Admissions</span>
                <p className="text-[11.5px] text-slate-400 mt-0.5">Toggle the availability of the public apply form.</p>
              </div>
              <button
                type="button"
                onClick={() => setAdmissionsOpen(!admissionsOpen)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${admissionsOpen ? 'bg-primary' : 'bg-slate-350 dark:bg-slate-700'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${admissionsOpen ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Active Academic Year */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Active Admission Session</label>
                <select value={session} onChange={e => setSession(e.target.value)} className={fieldClass}>
                  <option>2026-2027</option>
                  <option>2027-2028</option>
                </select>
              </div>
            </div>

            {/* Public Instructions */}
            <div className="space-y-1.5">
              <label className={labelClass}>Public Instructions / Guidelines</label>
              <textarea
                value={instructionText}
                onChange={e => setInstructionText(e.target.value)}
                rows={4}
                className={`${fieldClass} resize-none`}
              />
              <span className="text-[11px] text-slate-400 block mt-1">This text appears on the public admission landing page guide.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
