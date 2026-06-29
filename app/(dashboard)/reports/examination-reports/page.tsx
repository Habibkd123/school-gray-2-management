"use client";

import React, { useState, useMemo } from "react";
import {
  Search, RefreshCw, Printer, Download, FileText, Loader2, BookOpen
} from "lucide-react";
import { useExams } from "../../../hooks/useExams";
import { useClasses } from "../../../hooks/useClasses";
import { ChevronDown } from "lucide-react";

export default function ExaminationReportPage() {
  const { exams, loading: examsLoading } = useExams();
  const { classes } = useClasses();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);

  const getClassName = (classId: any) => {
    if (!classId) return "—";
    const id = typeof classId === "object" ? classId._id : classId;
    const c = classes.find(x => x._id === id);
    return c ? `${c.name} - ${c.section}` : "—";
  };

  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const matchSearch = e.title?.toLowerCase().includes(searchTerm.toLowerCase()) || e.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const classId = e.class_id ? (typeof e.class_id === "object" ? e.class_id._id : e.class_id) : null;
      const matchClass = !selectedClass || classId === selectedClass;
      const matchType = !selectedType || e.type === selectedType;

      return matchSearch && matchClass && matchType;
    });
  }, [exams, searchTerm, selectedClass, selectedType]);

  const examTypes = [
    { value: "unit_test", label: "Unit Test" },
    { value: "mid_term", label: "Mid Term" },
    { value: "pre_board", label: "Pre-Board" },
    { value: "annual", label: "Annual" },
    { value: "other", label: "Other" },
  ];

  const formatExamType = (type: string) => {
    return examTypes.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Examination Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-primary cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Examination Report</span>
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
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Examinations Overview
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer min-w-full sm:w-[150px]">
              <option value="">All Exam Types</option>
              {examTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer min-w-full sm:w-[150px]">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
            </select>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500 dark:text-slate-400">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredExams.length}</span> exams</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search exam…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Exam Title</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Type</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Academic Year</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Start Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">End Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {examsLoading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredExams.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No examinations found.</td></tr>
              ) : filteredExams.map(e => {
                return (
                  <tr key={e._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">{e.title || e.name || "Untitled Exam"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      {formatExamType(e.type)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getClassName(e.class_id)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{e.academic_year}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {e.start_date ? new Date(e.start_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {e.end_date ? new Date(e.end_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {e.is_published ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Draft
                        </span>
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
