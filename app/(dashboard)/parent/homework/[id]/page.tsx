"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHomework, ApiHomework } from "@/app/hooks/useHomework";
import { useParent } from "@/app/hooks/useParent";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  BookOpen, Calendar, Clock, CheckCircle2, XCircle, ArrowLeft, User,
  Paperclip, FileText, Send, ChevronRight, Loader2, AlertCircle
} from "lucide-react";
import Link from "next/link";

function cleanAttachmentUrl(url?: string): string {
  if (!url) return "";
  const match = url.match(/https?:\/\/res\.cloudinary\.com\/.*/);
  if (match) {
    return match[0];
  }
  return url;
}

export default function ParentHomeworkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const hwId = params.id as string;

  const { selectedChild, selectedChildId, isLoading: isParentLoading } = useParent();
  const { homework, isLoading: isHomeworkLoading, submitHomework } = useHomework();

  const [hw, setHw] = useState<ApiHomework | null>(null);
  const [submitText, setSubmitText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch this specific homework
  useEffect(() => {
    if (!hwId) return;
    fetch(`/api/homework/${hwId}`, {
      headers: getAuthHeaders()
    })
      .then(r => r.json())
      .then(data => { if (data.success) setHw(data.data); })
      .catch(() => { });
  }, [hwId]);

  if (isHomeworkLoading || isParentLoading || !hw) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Helpers
  const subjectName = hw.subject_id && typeof hw.subject_id === 'object' ? hw.subject_id.name : 'Subject';
  const teacherName = hw.teacher_id && typeof hw.teacher_id === 'object' ? hw.teacher_id.name : 'Teacher';
  const className = hw.class_id && typeof hw.class_id === 'object'
    ? `${hw.class_id?.name}${hw.class_id?.section ? ' — ' + hw.class_id?.section : ''}`
    : 'Class';

  const submission = hw.submissions.find(sub =>
    (typeof sub.student_id === 'object' ? sub.student_id._id : sub.student_id) === selectedChildId
  );
  const isSubmitted = !!submission;
  const isOverdue = new Date(hw.due_date) < new Date() && !isSubmitted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitText.trim() || !selectedChildId) return;
    setIsSubmitting(true);
    setSubmitError("");
    const result = await submitHomework(hwId, selectedChildId, submitText.trim());
    if (result.success) {
      setSubmitSuccess(true);
      setSubmitText("");
      // Refresh homework data
      fetch(`/api/homework/${hwId}`, {
        headers: getAuthHeaders()
      }).then(r => r.json()).then(data => { if (data.success) setHw(data.data); });
    } else {
      setSubmitError(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-full sm:w-[860px] mx-auto space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/parent/homework" className="flex items-center gap-1 hover:text-primary transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Homework
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 dark:text-slate-100 font-semibold truncate">{hw.title}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border card-shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div className="flex-1">
            {/* Subject + Status */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-lg">
                {subjectName}
              </span>
              {isSubmitted ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                </span>
              ) : isOverdue ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-lg">
                  <XCircle className="w-3.5 h-3.5" /> Overdue
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5" /> Pending
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{hw.title}</h1>

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-400" />
                <span className="font-medium">{teacherName}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="font-medium">{className}</span>
              </span>
            </div>
          </div>

          {/* Date box */}
          <div className="flex flex-col gap-2 text-right w-full sm:w-[160px]">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Assigned
              </p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {new Date(hw.assigned_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className={`rounded-xl p-3 text-left ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className={`text-[10px] font-bold uppercase mb-1 flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                <Clock className="w-3 h-3" /> Due Date
              </p>
              <p className={`text-sm font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {new Date(hw.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {hw.description && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
            <p className="text-[11px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Description
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {hw.description}
            </p>
          </div>
        )}

        {/* Attachment */}
        {hw.attachment_url && (
          <a
            href={cleanAttachmentUrl(hw.attachment_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-fit"
          >
            <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">View Attachment</span>
          </a>
        )}
      </div>

      {/* Submission Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border card-shadow p-6">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          {isSubmitted ? 'Your Submission' : 'Submit Answer'}
        </h2>

        {isSubmitted ? (
          <div className="space-y-4">
            {/* Submitted answer */}
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Submitted</span>
                {submission?.submitted_at && (
                  <span className="text-xs text-slate-400 ml-auto">
                    {new Date(submission.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {submission?.content || '—'}
              </p>
            </div>

            {/* Grade / Feedback */}
            {submission?.grade && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
                <p className="text-[11px] font-bold text-blue-400 uppercase mb-1">Grade</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{submission.grade}</p>
                {submission.feedback && (
                  <>
                    <p className="text-[11px] font-bold text-blue-400 uppercase mt-3 mb-1">Teacher Feedback</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{submission.feedback}</p>
                  </>
                )}
              </div>
            )}

            {!submission?.grade && (
              <p className="text-sm text-slate-400 italic">Awaiting teacher review…</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Homework submitted successfully!
              </div>
            )}
            {submitError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                <AlertCircle className="w-4 h-4" /> {submitError}
              </div>
            )}
            <textarea
              value={submitText}
              onChange={e => { setSubmitText(e.target.value); setSubmitError(""); }}
              rows={5}
              placeholder="Write your answer here…"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !submitText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSubmitting ? 'Submitting…' : 'Submit Homework'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
