"use client";

import React, { useEffect, useMemo } from "react";
import { useParent } from "@/app/hooks/useParent";
import { ChildSelector } from "@/app/components/parent/ChildSelector";
import { useResults, ApiResult } from "@/app/hooks/useResults";
import {
  ClipboardList, Trophy, Medal, BookOpen, TrendingUp,
  CheckCircle2, XCircle, Award, BarChart3, Star
} from "lucide-react";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";


// ── Grade color helper ────────────────────────────────────────────
function gradeColor(grade?: string) {
  if (!grade) return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  const g = grade.toUpperCase();
  if (g === "A+" || g === "A") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (g === "B+" || g === "B") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (g === "C+" || g === "C") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  if (g === "D") return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

// ── Percentage bar color ──────────────────────────────────────────
function barColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

// ── Overall grade from percentage ────────────────────────────────
function gradeFromPct(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 33) return "D";
  return "F";
}

export default function ParentResultsPage() {
  const { children, selectedChild, selectedChildId, setSelectedChildId, isLoading: isParentLoading } = useParent();
  const { results, fetchResults, isLoading: isResultsLoading } = useResults({ skip: true });

  useEffect(() => {
    if (selectedChildId) fetchResults({ student_id: selectedChildId });
  }, [selectedChildId, fetchResults]);

  const isLoading = isParentLoading || isResultsLoading;

  // ── Group by exam ─────────────────────────────────────────────────
  const groupedResults = useMemo(() => {
    return results.reduce((acc: Record<string, ApiResult[]>, curr) => {
      const examName = curr.exam_id && typeof curr.exam_id === "object"
        ? curr.exam_id.name
        : "Unknown Exam";
      if (!acc[examName]) acc[examName] = [];
      acc[examName].push(curr);
      return acc;
    }, {});
  }, [results]);

  // ── Overall stats across all exams ────────────────────────────────
  const overallStats = useMemo(() => {
    if (!results.length) return null;
    const totalObtained = results.reduce((s, r) => s + r.marks_obtained, 0);
    const totalMax = results.reduce((s, r) => s + r.total_marks, 0);
    const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const passed = results.filter(r => r.is_pass !== false).length;
    const failed = results.filter(r => r.is_pass === false).length;
    return { totalObtained, totalMax, pct, passed, failed, grade: gradeFromPct(pct) };
  }, [results]);

  const examEntries = Object.entries(groupedResults);
  const { paged: pagedExams, page: examPage, setPage: setExamPage, totalPages: examTotalPages, totalItems: examTotal } = usePagination(examEntries, 3);

  return (
    <div className="space-y-6 max-w-full sm:w-[1200px] mx-auto">

      {/* ── Header ── */}
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border card-shadow">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" />
            Exam Results
          </h1>
          <p className="text-sm text-slate-500 mt-1">Academic performance and grade report</p>
        </div>
        <div className="min-w-full sm:w-[250px]">
          <ChildSelector
            childrenList={children}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            isLoading={isParentLoading}
          />
        </div>
      </div>

      {/* ── Student Identity Banner ── */}
      {selectedChild && (
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-border rounded-xl px-5 py-4 card-shadow">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 shrink-0 bg-primary/10 flex items-center justify-center">
            {selectedChild.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedChild.photo_url} alt={selectedChild.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-black text-lg">
                {selectedChild.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Info */}
          <div className="flex-1">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Viewing Results For</p>
            <h2 className="text-[16px] font-black text-slate-900 dark:text-white leading-tight">{selectedChild.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {selectedChild.class_id && (
                <span className="text-[12px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  Class {selectedChild.class_id?.name}
                  {selectedChild.class_id?.section ? ` — ${selectedChild.class_id?.section}` : ""}
                </span>
              )}
              {selectedChild.roll_no && (
                <span className="text-[12px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                  Roll No: <strong className="text-slate-700 dark:text-slate-300">{selectedChild.roll_no}</strong>
                </span>
              )}
              {selectedChild.gender && (
                <span className="text-[12px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {selectedChild.gender}
                </span>
              )}
            </div>
          </div>
          {/* Exam count */}
          <div className="text-right shrink-0">
            <p className="text-[11px] text-slate-400 font-bold uppercase">Exams</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{Object.keys(groupedResults).length}</p>
          </div>
        </div>
      )}

      {/* ── States ── */}
      {!selectedChild ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-xl border border-border text-center text-slate-500">
          <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-medium">Select a child to view their results</p>
        </div>
      ) : isLoading && results.length === 0 ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-xl border border-border text-center flex flex-col items-center">
          <Trophy className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Results Yet</h3>
          <p className="text-slate-500 text-sm mt-1">
            No exam results found for <strong>{selectedChild?.name}</strong>. Exams might not have been graded yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Overall Summary Card ── */}
          {overallStats && (
            <div className="bg-gradient-to-br from-primary/90 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">
                    {selectedChild.name} — Overall Performance
                  </p>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-black">{overallStats.pct.toFixed(1)}%</span>
                    <span className="text-2xl font-bold text-white/80 mb-1">
                      {overallStats.totalObtained}/{overallStats.totalMax}
                    </span>
                  </div>
                  <div className="mt-3 w-64 bg-white/20 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-white/90 transition-all"
                      style={{ width: `${Math.min(overallStats.pct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  {/* Grade badge */}
                  <div className="bg-white/20 backdrop-blur rounded-xl px-5 py-4 text-center min-w-full sm:w-[90px]">
                    <Star className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
                    <p className="text-3xl font-black">{overallStats.grade}</p>
                    <p className="text-white/70 text-[11px] uppercase font-semibold">Grade</p>
                  </div>
                  {/* Pass count */}
                  <div className="bg-emerald-500/30 backdrop-blur rounded-xl px-5 py-4 text-center min-w-full sm:w-[90px]">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-300" />
                    <p className="text-3xl font-black">{overallStats.passed}</p>
                    <p className="text-white/70 text-[11px] uppercase font-semibold">Passed</p>
                  </div>
                  {/* Fail count */}
                  <div className={`${overallStats.failed > 0 ? 'bg-red-500/30' : 'bg-white/10'} backdrop-blur rounded-xl px-5 py-4 text-center min-w-full sm:w-[90px]`}>
                    <XCircle className={`w-5 h-5 mx-auto mb-1 ${overallStats.failed > 0 ? 'text-red-300' : 'text-white/40'}`} />
                    <p className="text-3xl font-black">{overallStats.failed}</p>
                    <p className="text-white/70 text-[11px] uppercase font-semibold">Failed</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Per Exam Results ── */}
          {pagedExams.map(([examName, examResults]) => {
            const totalMax = examResults.reduce((s, r) => s + r.total_marks, 0);
            const totalObt = examResults.reduce((s, r) => s + r.marks_obtained, 0);
            const pct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
            const isPass = examResults.every(r => r.is_pass !== false);
            const examType = examResults[0]?.exam_id && typeof examResults[0].exam_id === "object"
              ? examResults[0].exam_id.type : "";

            return (
              <div key={examName} className="bg-white dark:bg-slate-900 border border-border rounded-2xl overflow-hidden card-shadow">

                {/* Exam header */}
                <div className="p-5 border-b border-border bg-slate-50/60 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                      <Medal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{examName}</h3>
                      <p className="text-[12px] text-slate-500">
                        Class {selectedChild.class_id?.name || ""} {selectedChild.class_id?.section || ""}
                        {examType && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase">{examType}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Overall percentage */}
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500 font-bold uppercase">Score</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        {totalObt} <span className="text-sm text-slate-400 font-medium">/ {totalMax}</span>
                      </p>
                    </div>
                    {/* Percentage badge */}
                    <div className={`px-4 py-2 rounded-xl text-center min-w-full sm:w-[72px] ${isPass ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40'}`}>
                      <p className={`text-[10px] font-bold uppercase ${isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPass ? "PASS" : "FAIL"}
                      </p>
                      <p className={`text-xl font-black ${isPass ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                        {pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress bars (visual) */}
                <div className="px-5 pt-4 pb-2 space-y-3">
                  {examResults.map((result) => {
                    const subjectName = result.subject_id && typeof result.subject_id === "object"
                      ? result.subject_id.name : "Subject";
                    const subjectCode = result.subject_id && typeof result.subject_id === "object"
                      ? result.subject_id.code : "";
                    const subPct = result.total_marks > 0
                      ? (result.marks_obtained / result.total_marks) * 100 : 0;

                    return (
                      <div key={result._id} className="flex flex-wrap items-center gap-3">
                        {/* Subject name */}
                        <div className="w-36 shrink-0">
                          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{subjectName}</p>
                          {subjectCode && <p className="text-[10px] text-slate-400">{subjectCode}</p>}
                        </div>
                        {/* Progress bar */}
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor(subPct)}`}
                            style={{ width: `${Math.min(subPct, 100)}%` }}
                          />
                        </div>
                        {/* Marks */}
                        <div className="text-right w-20 shrink-0">
                          <span className="text-[13px] font-bold text-slate-900 dark:text-white">{result.marks_obtained}</span>
                          <span className="text-[12px] text-slate-400">/{result.total_marks}</span>
                        </div>
                        {/* Grade */}
                        {result.grade && (
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-md w-10 text-center shrink-0 ${gradeColor(result.grade)}`}>
                            {result.grade}
                          </span>
                        )}
                        {/* Pass/Fail */}
                        {result.is_pass === false
                          ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        }
                      </div>
                    );
                  })}
                </div>

                {/* Table */}
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-[13px] text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-border">
                      <tr>
                        <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-300">Subject</th>
                        <th className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">Obtained</th>
                        <th className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">Total</th>
                        <th className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">Passing</th>
                        <th className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">%</th>
                        <th className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">Grade</th>
                        <th className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examResults.map((result) => {
                        const subjectName = result.subject_id && typeof result.subject_id === "object"
                          ? result.subject_id.name : "Subject";
                        const subPct = result.total_marks > 0
                          ? ((result.marks_obtained / result.total_marks) * 100).toFixed(1) : "—";

                        return (
                          <tr
                            key={result._id}
                            className="border-b border-slate-100 dark:border-slate-800/40 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                          >
                            <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {subjectName}
                            </td>
                            <td className="px-5 py-3 text-center font-bold text-slate-900 dark:text-white">{result.marks_obtained}</td>
                            <td className="px-5 py-3 text-center text-slate-500">{result.total_marks}</td>
                            <td className="px-5 py-3 text-center text-slate-500">{result.passing_marks ?? "—"}</td>
                            <td className="px-5 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">{subPct}%</td>
                            <td className="px-5 py-3 text-center">
                              {result.grade ? (
                                <span className={`px-2.5 py-0.5 text-xs font-black rounded-lg ${gradeColor(result.grade)}`}>
                                  {result.grade}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {result.is_pass === false ? (
                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-bold">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Fail
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pass
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Footer total row */}
                    <tfoot className="bg-slate-50 dark:bg-slate-800/40 border-t-2 border-border">
                      <tr>
                        <td className="px-5 py-3 font-black text-slate-900 dark:text-white">Total</td>
                        <td className="px-5 py-3 text-center font-black text-primary">{totalObt}</td>
                        <td className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{totalMax}</td>
                        <td colSpan={2} className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2.5 py-0.5 text-xs font-black rounded-lg ${gradeColor(gradeFromPct(pct))}`}>
                            {gradeFromPct(pct)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {isPass ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Fail
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Exam Pagination */}
          <PaginationBar
            currentPage={examPage}
            totalPages={examTotalPages}
            totalItems={examTotal}
            pageSize={3}
            onPageChange={setExamPage}
            className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow"
          />
        </div>
      )}
    </div>
  );
}
