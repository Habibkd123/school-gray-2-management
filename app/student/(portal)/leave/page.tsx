"use client";

import React, { useState } from "react";
import { useStudentAuth } from "../../context/studentAuth";
import { useLeave, ApiLeaveRequest } from "../../../hooks/useLeave";
import {
  CalendarDays,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  Plus,
  Info,
} from "lucide-react";

export default function StudentLeavePage() {
  const { user } = useStudentAuth();
  const {
    leaveRequests,
    loading,
    submitLeave,
    deleteLeave,
  } = useLeave(undefined, user?.id);

  // Form State
  const [leaveType, setLeaveType] = useState<"sick" | "casual" | "emergency" | "other">("sick");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Validation and submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      setMessage({ type: "error", text: "Please fill in all fields." });
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (end < start) {
      setMessage({ type: "error", text: "End date cannot be before start date." });
      return;
    }

    setFormLoading(true);
    setMessage(null);

    try {
      const payload = {
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: reason.trim(),
        user_id: user?.id,
      };

      const res = await submitLeave(payload);

      if (res.success) {
        setMessage({ type: "success", text: "Leave request submitted successfully!" });
        setFromDate("");
        setToDate("");
        setReason("");
      } else {
        setMessage({ type: "error", text: res.message || "Failed to submit leave request." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;

    try {
      const res = await deleteLeave(id);
      if (res.success) {
        setMessage({ type: "success", text: "Leave request cancelled." });
      } else {
        setMessage({ type: "error", text: res.message || "Failed to cancel request." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to cancel request." });
    }
  };

  const statusConfigs: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: any }
  > = {
    pending: {
      label: "Pending",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-500/20",
      icon: Clock,
    },
    approved: {
      label: "Approved",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-500/20",
      icon: CheckCircle2,
    },
    rejected: {
      label: "Rejected",
      bg: "bg-rose-50 dark:bg-rose-500/10",
      text: "text-rose-700 dark:text-rose-400",
      border: "border-rose-100 dark:border-rose-500/20",
      icon: XCircle,
    },
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Apply for Leave</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Request leaves and track your approval status
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Submit Leave Request Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-6">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              New Leave Request
            </h3>

            {message && (
              <div
                className={`p-3.5 rounded-xl border text-[12px] font-semibold flex items-start gap-2.5 mb-5 ${
                  message.type === "success"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-450"
                    : "bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-450"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[13px] font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all"
                >
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="other">Other Leave</option>
                </select>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[13px] font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[13px] font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                  Reason / Description
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the reason for leave..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[13px] font-semibold text-slate-700 dark:text-slate-350 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-[13px] font-bold shadow-md shadow-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
              >
                {formLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Apply Request</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Column 2: Leave History & Requests List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[500px]">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              Request History
            </h3>

            {loading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-450">
                  No leave requests found
                </p>
                <p className="text-[12px] text-slate-400 mt-1">
                  When you apply for leaves, they will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveRequests.map((leave: ApiLeaveRequest) => {
                  const config = statusConfigs[leave.status] || {
                    label: leave.status,
                    bg: "bg-slate-50",
                    text: "text-slate-600",
                    border: "border-slate-100",
                    icon: Clock,
                  };
                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={leave._id}
                      className="border border-slate-150 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Leave Type and Dates */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[14px] font-extrabold text-slate-900 dark:text-white capitalize">
                              {leave.leave_type} Leave
                            </span>
                            <span
                              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${config.bg} ${config.text} ${config.border}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </div>
                          <p className="text-[12px] text-indigo-500 font-semibold mt-1">
                            {new Date(leave.from_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                            {" — "}
                            {new Date(leave.to_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </p>
                        </div>

                        {/* Days Counter & Actions */}
                        <div className="flex items-center gap-3 self-end sm:self-start">
                          <span className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[12px] font-bold text-slate-600 dark:text-slate-300">
                            {leave.total_days} {leave.total_days === 1 ? "Day" : "Days"}
                          </span>
                          {leave.status === "pending" && (
                            <button
                              onClick={() => handleDelete(leave._id)}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20 active:scale-95 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reason Description */}
                      {leave.reason && (
                        <div className="mt-4 p-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            My Reason
                          </p>
                          <p className="text-[13px] text-slate-600 dark:text-slate-350 mt-1 font-medium leading-relaxed">
                            {leave.reason}
                          </p>
                        </div>
                      )}

                      {/* Admin Note if exist */}
                      {leave.admin_note && (
                        <div className="mt-3 p-3 bg-amber-50/30 dark:bg-amber-500/5 rounded-xl border border-amber-100/40 dark:border-amber-500/10">
                          <p className="text-[11px] font-bold text-amber-500/80 uppercase tracking-wider">
                            Admin Response
                          </p>
                          <p className="text-[12px] text-slate-650 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                            {leave.admin_note}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
