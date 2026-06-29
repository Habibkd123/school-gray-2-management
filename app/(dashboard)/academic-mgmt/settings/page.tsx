"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAuth } from "@/app/context/auth";

export default function AcademicSettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { config, isLoading, updateConfig } = useAcademicConfig();
  const [saving, setSaving] = useState<"streams" | "sections" | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleToggle = async (key: "enable_streams" | "enable_sections", value: boolean) => {
    if (!isAdmin) return;
    setSaving(key === "enable_streams" ? "streams" : "sections");
    setSuccessMsg(""); setErrorMsg("");
    const result = await updateConfig({ [key]: value });
    setSaving(null);
    if (result.success) {
      setSuccessMsg(`${key === "enable_streams" ? "Streams" : "Sections"} ${value ? "enabled" : "disabled"}.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg(result.message || "Failed to update.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  return (
    <div className="space-y-5 text-left max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Academic Settings</h1>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[13px]">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px]">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[13px]">Loading…</span>
          </div>
        ) : (
          <>
            {/* Streams */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-white">Enable Streams</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Science, Commerce, Arts etc.</p>
              </div>
              <button
                onClick={() => handleToggle("enable_streams", !config.enable_streams)}
                disabled={!isAdmin || saving !== null}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${config.enable_streams ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"}`}
              >
                {saving === "streams" && <Loader2 className="absolute left-0 right-0 mx-auto w-3 h-3 animate-spin text-white" />}
                <span className={`inline-block h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform ${config.enable_streams ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Sections */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-white">Enable Sections</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Divide classes into A, B, C…</p>
              </div>
              <button
                onClick={() => handleToggle("enable_sections", !config.enable_sections)}
                disabled={!isAdmin || saving !== null}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${config.enable_sections ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"}`}
              >
                {saving === "sections" && <Loader2 className="absolute left-0 right-0 mx-auto w-3 h-3 animate-spin text-white" />}
                <span className={`inline-block h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform ${config.enable_sections ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
