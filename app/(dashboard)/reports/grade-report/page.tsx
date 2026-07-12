"use client";

import React, { useState, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Loader2, Award
} from "lucide-react";
import { useResults } from "../../../hooks/useResults";
import { useExams } from "../../../hooks/useExams";
import { useStudents } from "../../../hooks/useStudents";
import { useClasses } from "../../../hooks/useClasses";

export default function GradeReportPage() {
  const { results, isLoading: resultsLoading, fetchResults } = useResults({ skip: true });
  const { exams } = useExams();
  const { students } = useStudents({ skip: true });
  const { classes } = useClasses();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Reset page to 1 on filters or search change
  React.useEffect(() => {
    setPage(1);
  }, [selectedClass, selectedExam, searchTerm]);

  // Fetch filtered results from the server when class or exam filters change
  React.useEffect(() => {
    fetchResults({
      class_id: selectedClass || undefined,
      exam_id: selectedExam || undefined
    });
  }, [selectedClass, selectedExam, fetchResults]);

  const getStudentName = (sid: any) => {
    if (sid && typeof sid === "object" && sid.name) {
      return sid.name;
    }
    const id = typeof sid === "object" ? sid?._id : sid;
    const s = students.find(s => s._id === id);
    return s?.name || "—";
  };

  const getExamName = (eid: any) => {
    if (eid && typeof eid === "object") {
      if (eid.name) return eid.name;
      if (eid.title) return eid.title;
    }
    const id = typeof eid === "object" ? eid?._id : eid;
    const e = exams.find(x => x._id === id);
    return e?.name || e?.title || "—";
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const studentObj = r.student_id && typeof r.student_id === "object" ? r.student_id : null;
      const studentName = studentObj?.name || "";
      const rollNo = studentObj?.roll_no || "";

      const matchSearch =
        studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rollNo.toLowerCase().includes(searchTerm.toLowerCase());

      return matchSearch;
    });
  }, [results, searchTerm]);

  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);

  const paginatedResults = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredResults.slice(start, start + PAGE_SIZE);
  }, [filteredResults, page]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Grade Report</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-primary cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Grade Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"><RefreshCw className="w-4 h-4" /></button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"><Printer className="w-4 h-4" /></button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF</button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Student Results & Grades</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer max-w-full sm:w-[200px]">
              <option value="">All Exams</option>
              {exams.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
            </select>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer max-w-full sm:w-[200px]">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
            </select>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="card-subtitle text-[13px]">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredResults.length}</span> results</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search student…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Exam</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total Marks</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Obtained</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">% Rate</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Grade</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resultsLoading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : paginatedResults.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No results found.</td></tr>
              ) : paginatedResults.map(r => {
                const total = r.total_marks || 0;
                const obtained = r.marks_obtained || 0;
                const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;
                const passed = percentage >= 40; // Assuming 40% passing criteria

                return (
                  <tr key={r._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] flex-shrink-0">{getStudentName(r.student_id).charAt(0)}</div>
                        <span className="font-semibold text-foreground dark:text-slate-100">{getStudentName(r.student_id)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getExamName(r.exam_id)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{total}</td>
                    <td className="px-6 py-4 text-foreground dark:text-slate-100 font-bold">{obtained}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">{percentage}%</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 font-bold ${
                        r.grade === "A" || r.grade === "A+" ? "text-emerald-600" :
                        r.grade === "B" ? "text-sky-600" :
                        r.grade === "C" ? "text-amber-600" :
                        "text-rose-600"
                      }`}>
                        {r.grade === "A" || r.grade === "A+" ? <Award className="w-4 h-4" /> : null}
                        {r.grade || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {passed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Pass</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Fail</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-[13px] text-slate-500">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredResults.length)} to {Math.min(page * PAGE_SIZE, filteredResults.length)} of {filteredResults.length} entries
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="card-subtitle px-3 py-1.5 text-[13px] hover:text-slate-700 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-[13px] font-medium flex items-center justify-center ${
                    page === p
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="card-subtitle px-3 py-1.5 text-[13px] hover:text-slate-700 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
