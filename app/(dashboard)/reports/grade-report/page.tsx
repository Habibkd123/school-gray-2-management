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
  const { results, isLoading: resultsLoading } = useResults();
  const { exams } = useExams();
  const { students } = useStudents();
  const { classes } = useClasses();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);

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
      const sid = typeof r.student_id === "object" ? r.student_id._id : r.student_id;
      const student = students.find(s => s._id === sid);
      const studentName = student?.name || (r.student_id && typeof r.student_id === "object" ? r.student_id.name : "") || "";
      const adminNo = student?.admission_no || "";
      const classId = student ? (typeof student.class_id === "object" ? student.class_id?._id : student.class_id) : undefined;
      const examId = typeof r.exam_id === "object" ? r.exam_id._id : r.exam_id;

      const matchSearch =
        studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adminNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = !selectedClass || classId === selectedClass;
      const matchExam = !selectedExam || examId === selectedExam;

      return matchSearch && matchClass && matchExam;
    });
  }, [results, searchTerm, selectedClass, selectedExam, students]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Grade Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-primary cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Grade Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer"><Printer className="w-4 h-4" /></button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500" /> Export as PDF</button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500" /> Export as Excel</button>
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
              {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
            </select>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredResults.length}</span> results</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search student…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
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
              ) : filteredResults.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No results found.</td></tr>
              ) : filteredResults.map(r => {
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
      </div>
    </div>
  );
}
