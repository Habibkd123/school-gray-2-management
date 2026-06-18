"use client";

import React from "react";
import { useExams } from "../../../hooks/useExams";
import { ClipboardList, CalendarDays, Clock } from "lucide-react";

export default function StudentExamsPage() {
  const { exams, loading: isLoading } = useExams();

  const today = new Date();
  const upcoming = exams
    .filter((e: any) => new Date(e.start_date || e.date) >= today)
    .sort((a: any, b: any) =>
      new Date(a.start_date || a.date).getTime() - new Date(b.start_date || b.date).getTime()
    );
  const past = exams
    .filter((e: any) => new Date(e.start_date || e.date) < today)
    .sort((a: any, b: any) =>
      new Date(b.start_date || b.date).getTime() - new Date(a.start_date || a.date).getTime()
    );

  const colors = ["#6366f1", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#0ea5e9"];

  const renderExamCard = (exam: any, idx: number) => {
    const color = colors[idx % colors.length];
    const examDate = new Date(exam.start_date || exam.date);
    const isPast = examDate < today;

    return (
      <div
        key={exam._id}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${isPast ? "opacity-70" : ""}`}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
          >
            <span className="text-[10px] font-bold leading-none uppercase">
              {examDate.toLocaleDateString("en-US", { month: "short" })}
            </span>
            <span className="text-[16px] font-bold leading-none">
              {examDate.getDate()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{exam.name}</h3>
            {exam.type && (
              <span
                className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${color}15`, color }}
              >
                {exam.type}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {examDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {exam.end_date && (
                <span className="text-[12px] text-slate-500 dark:text-slate-400">
                  — {new Date(exam.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
          {!isPast && (
            <div className="text-right flex-shrink-0">
              <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                {Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Schedule</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Upcoming and past examinations</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[13px] text-slate-400">Loading exams...</div>
      ) : exams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">No exams scheduled</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-[14px] font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Upcoming Exams
              </h2>
              <div className="space-y-3">{upcoming.map(renderExamCard)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-[14px] font-bold text-slate-700 dark:text-slate-200 mb-3">Past Exams</h2>
              <div className="space-y-3">{past.map(renderExamCard)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
