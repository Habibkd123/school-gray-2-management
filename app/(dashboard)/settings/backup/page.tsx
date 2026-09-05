"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  X,
  Info,
  AlertTriangle,
} from "lucide-react";

// ── Toast Types ──────────────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
}

const TOAST_ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: "border-emerald-500/40 bg-emerald-950/80 text-emerald-200",
  error:   "border-rose-500/40    bg-rose-950/80    text-rose-200",
  warning: "border-amber-500/40   bg-amber-950/80   text-amber-200",
  info:    "border-blue-500/40    bg-blue-950/80    text-blue-200",
};

const TOAST_ICON_COLORS: Record<ToastVariant, string> = {
  success: "text-emerald-400",
  error:   "text-rose-400",
  warning: "text-amber-400",
  info:    "text-blue-400",
};

// ── Toast Component ──────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = TOAST_ICONS[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      style={{ animation: "slideInRight 0.3s ease-out" }}
      className={`flex items-start gap-3 w-80 max-w-sm px-4 py-3.5 rounded-xl border backdrop-blur-xl shadow-2xl ${TOAST_STYLES[toast.variant]}`}
    >
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${TOAST_ICON_COLORS[toast.variant]}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs mt-1 opacity-80 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity p-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Toast Container ──────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── Backup Modules ───────────────────────────────────────────────────────────
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SystemBackupPage() {
  const [selectedModule, setSelectedModule] = useState<string>("full_backup");
  const [recipientEmail, setRecipientEmail]  = useState<string>("");
  const [academicYear, setAcademicYear]       = useState<string>("2026-2027");
  const [loadingAction, setLoadingAction]     = useState<"download" | "email" | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastId = 0;

  const addToast = useCallback((variant: ToastVariant, title: string, message = "") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, variant, title, message }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Handle Backup action ─────────────────────────────────────
  const handleBackup = async (action: "download" | "email") => {
    if (action === "email" && (!recipientEmail || !recipientEmail.includes("@"))) {
      addToast("error", "Invalid Email", "Please enter a valid recipient email address before sending.");
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

      // ── noData response (200 but with noData flag) ───────────
      // First check content-type to decide how to parse
      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (data.noData) {
          // Module has no records → show warning toast, don't download anything
          addToast(
            "warning",
            "No Data Available",
            data.message || "This module has no records to export."
          );
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || "Failed to process backup request.");
        }

        // Email success
        addToast("success", "Backup Email Sent!", data.message || `PDF sent to ${recipientEmail}`);
        return;
      }

      // ── Binary PDF response → download ───────────────────────
      if (!response.ok) {
        throw new Error("Server returned an error while generating the PDF.");
      }

      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;

      const cd       = response.headers.get("Content-Disposition") || "";
      let fileName   = `${selectedModule}_backup.pdf`;
      const match    = cd.match(/filename="?([^"]+)"?/);
      if (match) fileName = match[1];

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast("success", "PDF Downloaded!", "Your backup report has been generated and downloaded.");
    } catch (err: any) {
      console.error("Backup action error:", err);
      addToast("error", "Backup Failed", err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  const currentModuleObj = BACKUP_MODULES.find((m) => m.id === selectedModule) || BACKUP_MODULES[0];

  return (
    <>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 space-y-8">

        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-slate-800">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              System Administration
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Data Backup &amp; PDF Export Hub
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Generate instantly formatted PDF backup reports for any school module. Select a category —
              if no records exist you&apos;ll be notified immediately. Download or send to email with one click.
            </p>
          </div>
        </div>

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
                  Configure Backup &amp; Delivery
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Target Category:{" "}
                  <strong className="text-indigo-600 dark:text-indigo-400">{currentModuleObj.name}</strong>
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
                  Enter email to receive the PDF backup as an attachment.
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
                  PDF backups contain live system records. Ensure recipient emails belong to
                  authorized administrators only.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
