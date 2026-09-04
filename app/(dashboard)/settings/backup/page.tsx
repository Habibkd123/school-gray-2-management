"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Users,
  Receipt,
  Banknote,
  CalendarCheck,
  FileSpreadsheet,
  ShieldCheck,
  Download,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";

interface BackupModule {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  color: string;
}

const BACKUP_MODULES: BackupModule[] = [
  {
    id: "students",
    name: "Student Directory",
    description: "Complete list of students with roll numbers, class, contact details and active status.",
    icon: GraduationCap,
    badge: "Directory",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "teachers",
    name: "Faculty & Staff",
    description: "Teacher profiles, employee IDs, designations, qualifications and salary info.",
    icon: Users,
    badge: "HR & Staff",
    color: "from-purple-500 to-pink-600",
  },
  {
    id: "student_fees",
    name: "Student Fees Collection",
    description: "Fee receipts, payment methods, transaction dates and total collection breakdown.",
    icon: Receipt,
    badge: "Finance",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "teacher_fees",
    name: "Teacher Salary Vouchers",
    description: "Disbursed staff salary vouchers, monthly payroll, allowances and net paid totals.",
    icon: Banknote,
    badge: "Payroll",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "attendance",
    name: "Attendance Logs",
    description: "Student and teacher daily attendance registers, present/absent counts and totals.",
    icon: CalendarCheck,
    badge: "Logs",
    color: "from-cyan-500 to-blue-600",
  },
  {
    id: "exams",
    name: "Exam Results & Marks",
    description: "Academic performance records, subject-wise marks, grades and pass/fail summary.",
    icon: FileSpreadsheet,
    badge: "Academics",
    color: "from-rose-500 to-red-600",
  },
  {
    id: "full_backup",
    name: "Full Executive System Backup",
    description: "Combined high-level executive report covering statistics across all school modules.",
    icon: ShieldCheck,
    badge: "All-in-One",
    color: "from-violet-600 to-indigo-800",
  },
];

export default function SystemBackupPage() {
  const [selectedModule, setSelectedModule] = useState<string>("full_backup");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2026-2027");
  const [loadingAction, setLoadingAction] = useState<"download" | "email" | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleBackup = async (action: "download" | "email") => {
    setStatusMessage(null);

    if (action === "email" && (!recipientEmail || !recipientEmail.includes("@"))) {
      setStatusMessage({ type: "error", text: "Please enter a valid recipient email address." });
      return;
    }

    setLoadingAction(action);

    try {
      const response = await fetch("/api/backup/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: selectedModule,
          action,
          email: recipientEmail,
          academicYear,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process backup request.");
      }

      if (action === "email") {
        const data = await response.json();
        setStatusMessage({
          type: "success",
          text: data.message || `Backup PDF sent successfully to ${recipientEmail}!`,
        });
      } else {
        // Trigger browser download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        // Extract filename from header or fallback
        const contentDisposition = response.headers.get("Content-Disposition");
        let fileName = `${selectedModule}_backup.pdf`;
        if (contentDisposition && contentDisposition.includes("filename=")) {
          fileName = contentDisposition.split("filename=")[1].replace(/"/g, "");
        }
        
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setStatusMessage({ type: "success", text: "PDF backup generated and downloaded successfully!" });
      }
    } catch (err: any) {
      console.error("Backup action error:", err);
      setStatusMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setLoadingAction(null);
    }
  };

  const currentModuleObj = BACKUP_MODULES.find((m) => m.id === selectedModule) || BACKUP_MODULES[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            System Administration
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Data Backup & PDF Export Hub
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Generate instantly formatted PDF backup reports for any school module including Students, Faculty, Student Fees collection, Teacher Salaries payroll, and Attendance. Send backups directly to your email or download instantly.
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border shadow-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Module Selection Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Select Backup Category
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BACKUP_MODULES.map((module) => {
              const Icon = module.icon;
              const isSelected = selectedModule === module.id;

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setSelectedModule(module.id)}
                  className={`text-left p-5 rounded-xl border transition-all duration-200 relative group flex flex-col justify-between ${
                    isSelected
                      ? "bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                      : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${module.color} text-white shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        isSelected
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
                          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {module.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-1">
                      {module.name}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Backup Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6 sticky top-6">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Configure Backup & Delivery
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Target Category: <strong className="text-indigo-600 dark:text-indigo-400">{currentModuleObj.name}</strong>
              </p>
            </div>

            {/* Academic Year Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Academic Session
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="2026-2027">2026-2027 (Current)</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Recipient Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="admin@school.com"
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Enter your email address to receive the PDF backup attachment directly.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => handleBackup("download")}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {loadingAction === "download" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Instant PDF Download
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => handleBackup("email")}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {loadingAction === "email" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Backup to Email
                  </>
                )}
              </button>
            </div>

            {/* Security Note */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                PDF backups contain live system records. Ensure recipient emails belong to authorized administrators.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
