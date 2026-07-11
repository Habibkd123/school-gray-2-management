"use client";

import React, { useState } from "react";
import { useStudentAuth } from "../../context/studentAuth";
import { useHomework } from "../../../hooks/useHomework";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function StudentHomeworkPage() {
  const { studentProfile } = useStudentAuth();
  const classId =
    studentProfile?.class_id && typeof studentProfile.class_id === "object"
      ? studentProfile.class_id._id
      : (studentProfile?.class_id as string);

  const { homework, isLoading, submitHomework } = useHomework(classId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "overdue">("all");

  const today = new Date();

  const getStatus = (hw: any) => {
    if (hw.status === "completed") return "completed";
    const hasSubmitted = hw.submissions?.some((s: any) => {
      const sid = typeof s.student_id === "object" ? s.student_id._id : s.student_id;
      return sid === studentProfile?._id;
    });
    if (hasSubmitted) return "submitted";
    if (new Date(hw.due_date) < today) return "overdue";
    return "pending";
  };

  const filtered = homework
    .filter((hw) => hw.status !== "draft")
    .filter((hw) => {
      if (filter === "all") return true;
      return getStatus(hw) === filter;
    });

  const handleSubmit = async (homeworkId: string) => {
    if (!submissionContent.trim() || !studentProfile?._id) return;
    setSubmitting(true);
    await submitHomework(homeworkId, studentProfile._id, submissionContent.trim());
    setSubmitting(false);
    setSubmissionContent("");
    setExpandedId(null);
  };

  const statusConfig = {
    submitted: { label: "Submitted", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20" },
    overdue: { label: "Overdue", icon: XCircle, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/20" },
    pending: { label: "Pending", icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20" },
    completed: { label: "Completed", icon: CheckCircle2, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-200 dark:border-indigo-500/20" },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Homework</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">View and submit your homework</p>
        </div>
        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "pending", "submitted", "overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-indigo-500 text-white shadow-md"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[13px] text-slate-400">Loading homework...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">No homework found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((hw) => {
            const status = getStatus(hw);
            const cfg = statusConfig[status];
            const StatusIcon = cfg.icon;
            const subject = typeof hw.subject_id === "object" ? hw.subject_id.name : "";
            const teacher = typeof hw.teacher_id === "object" ? hw.teacher_id.name : "";
            const isExpanded = expandedId === hw._id;

            const mySubmission = hw.submissions?.find((s: any) => {
              const sid = typeof s.student_id === "object" ? s.student_id._id : s.student_id;
              return sid === studentProfile?._id;
            });

            return (
              <div
                key={hw._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : hw._id)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                    >
                      <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{hw.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {subject && (
                              <span className="text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> {subject}
                              </span>
                            )}
                            {teacher && (
                              <span className="text-[12px] text-slate-500 dark:text-slate-400">by {teacher}</span>
                            )}
                            <span className="text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              Due: {new Date(hw.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                    {hw.description && (
                      <div>
                        <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mb-1">Description</p>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{hw.description}</p>
                      </div>
                    )}

                    {mySubmission && (
                      <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
                        <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">Your Submission</p>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300">{mySubmission.content}</p>
                        {mySubmission.grade && (
                          <p className="text-[12px] mt-2 font-semibold text-emerald-700 dark:text-emerald-400">
                            Grade: {mySubmission.grade}
                          </p>
                        )}
                        {(mySubmission.remarks || mySubmission.feedback) && (
                          <p className="text-[12px] mt-1 text-slate-600 dark:text-slate-400">
                            Remarks: {mySubmission.remarks || mySubmission.feedback}
                          </p>
                        )}
                      </div>
                    )}

                    {status === "pending" && (
                      <div className="space-y-3">
                        <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400">Submit Your Work</p>
                        <textarea
                          value={submissionContent}
                          onChange={(e) => setSubmissionContent(e.target.value)}
                          placeholder="Write your answer or describe your work..."
                          rows={4}
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 resize-none"
                        />
                        <button
                          onClick={() => handleSubmit(hw._id)}
                          disabled={submitting || !submissionContent.trim()}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            boxShadow: "0 4px 15px rgba(99,102,241,0.3)",
                          }}
                        >
                          {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                          ) : (
                            <><Send className="w-4 h-4" /> Submit</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
