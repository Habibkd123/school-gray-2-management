"use client";

import React from "react";
import { useStudentAuth } from "../../context/studentAuth";
import { useResults } from "../../../hooks/useResults";
import { Award, TrendingUp, BookOpen, CheckCircle2, XCircle } from "lucide-react";

export default function StudentResultsPage() {
  const { studentProfile } = useStudentAuth();
  const { results, isLoading } = useResults();

  const myResults = results.filter((r) => {
    const sid = typeof r.student_id === "object" ? r.student_id._id : r.student_id;
    return sid === studentProfile?._id;
  });

  // Group by exam
  const examGroups = new Map<string, { examName: string; examType: string; results: typeof myResults }>();
  myResults.forEach((r) => {
    const examId = typeof r.exam_id === "object" ? r.exam_id._id : r.exam_id;
    const examName = typeof r.exam_id === "object" ? ((r.exam_id as any).name || (r.exam_id as any).title || "Exam") : "Exam";
    const examType = typeof r.exam_id === "object" ? (r.exam_id as any).type || "" : "";
    if (!examGroups.has(examId)) {
      examGroups.set(examId, { examName, examType, results: [] });
    }
    examGroups.get(examId)!.results.push(r);
  });

  // Overall stats
  const totalMarks = myResults.reduce((sum, r) => sum + r.total_marks, 0);
  const obtainedMarks = myResults.reduce((sum, r) => sum + r.marks_obtained, 0);
  const overallPercent = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  const passCount = myResults.filter((r) => r.is_pass !== false && r.total_marks > 0 && r.marks_obtained >= (r.passing_marks || r.total_marks * 0.33)).length;

  const colors = ["#6366f1", "var(--primary)", "#10b981", "#f43f5e", "#8b5cf6", "#0ea5e9"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Results</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Your exam grades & performance</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[13px] text-slate-400">Loading results...</div>
      ) : myResults.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">No results available yet</p>
        </div>
      ) : (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{overallPercent}%</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Overall Average</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{passCount}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Subjects Passed</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{myResults.length}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Total Subjects</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-3">
                <Award className="w-5 h-5 text-violet-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{obtainedMarks}/{totalMarks}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Total Marks</p>
            </div>
          </div>

          {/* Results by Exam */}
          {Array.from(examGroups.entries()).map(([examId, group], gIdx) => (
            <div
              key={examId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{group.examName}</h3>
                  {group.examType && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{group.examType.replace("_", " ")}</span>
                  )}
                </div>
                <span className="text-[12px] font-semibold text-indigo-500">
                  {group.results.length} subject{group.results.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.results.map((r, idx) => {
                  const subject = typeof r.subject_id === "object" ? (r.subject_id as any).name : "Subject";
                  const percent = r.total_marks > 0 ? Math.round((r.marks_obtained / r.total_marks) * 100) : 0;
                  const isPassed = r.is_pass !== false && r.marks_obtained >= (r.passing_marks || r.total_marks * 0.33);
                  const color = colors[idx % colors.length];

                  return (
                    <div key={r._id} className="px-6 py-4 flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                      >
                        {subject.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{subject}</p>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%`, background: color }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {r.marks_obtained}/{r.total_marks}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-semibold" style={{ color }}>{percent}%</span>
                          {isPassed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
