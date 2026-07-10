"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, List,
  Calendar, ChevronDown, RefreshCw, Printer, Download, FileText, Loader2, X
} from "lucide-react";
import { useResults } from "../../../hooks/useResults";
import { useExams } from "../../../hooks/useExams";
import { useStudents } from "../../../hooks/useStudents";
import { PrintService } from "@/app/lib/print-service";

const PASS_MARK = 35;

const DATE_RANGES = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year", "All Time", "Custom Range"] as const;

function getDateRangeDates(range: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (range) {
    case "Today": 
      from.setHours(0, 0, 0, 0); 
      to.setHours(23, 59, 59, 999);
      break;
    case "Yesterday":
      from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1); to.setHours(23, 59, 59, 999);
      break;
    case "Last 7 Days": 
      from.setDate(from.getDate() - 7); 
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "Last 30 Days": 
      from.setDate(from.getDate() - 30); 
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "This Year": 
      from.setMonth(0, 1); 
      from.setHours(0, 0, 0, 0); 
      to.setHours(23, 59, 59, 999);
      break;
    case "All Time":
      return { from: null, to: null };
    default: 
      return { from: null, to: null };
  }
  return { from, to };
}

// Resolve populated or plain id from a result field
function resolveId(field: any): string {
  if (!field) return "";
  return typeof field === "object" ? (field._id || "") : field;
}
function resolveName(field: any, fallback = ""): string {
  if (!field) return fallback;
  return typeof field === "object" ? (field.name || fallback) : fallback;
}

export default function ExamResultsPage() {
  const { results, isLoading, fetchResults } = useResults();
  const { exams } = useExams();
  const { students } = useStudents();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  
  const [selectedRange, setSelectedRange] = useState("All Time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [activeFrom, setActiveFrom] = useState<Date | null>(null);
  const [activeTo, setActiveTo] = useState<Date | null>(null);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("A-Z by Name");

  const applyDateRange = (range: string) => {
    if (range === "Custom Range") { setIsCustom(true); return; }
    setIsCustom(false);
    const { from, to } = getDateRangeDates(range);
    setActiveFrom(from); setActiveTo(to);
    setSelectedRange(range); setIsDateRangeOpen(false);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    const fromDate = new Date(customFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(customTo);
    toDate.setHours(23, 59, 59, 999);
    setActiveFrom(fromDate); 
    setActiveTo(toDate);
    setSelectedRange(`${customFrom} — ${customTo}`);
    setIsCustom(false); setIsDateRangeOpen(false);
  };

  const formatDateLabel = (d: string | Date) => {
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
    catch { return String(d); }
  };

  const dateRangeLabel = (activeFrom && activeTo && !isCustom)
    ? `${formatDateLabel(activeFrom)} — ${formatDateLabel(activeTo)}`
    : selectedRange;
  
  // State for Report Card Modal
  const [reportCardData, setReportCardData] = useState<any | null>(null);

  // Filter results by selected exam
  const examResults = useMemo(() => {
    if (!selectedExamId) return results;
    return results.filter((r) => resolveId(r.exam_id) === selectedExamId);
  }, [results, selectedExamId]);

  // Apply Date Range Filter on results
  const dateFilteredResults = useMemo(() => {
    if (!activeFrom || !activeTo) return examResults;
    const fromCompare = new Date(activeFrom);
    fromCompare.setHours(0, 0, 0, 0);
    const toCompare = new Date(activeTo);
    toCompare.setHours(23, 59, 59, 999);

    return examResults.filter((r) => {
      if (!r.createdAt) return false;
      const rDate = new Date(r.createdAt);
      return rDate >= fromCompare && rDate <= toCompare;
    });
  }, [examResults, activeFrom, activeTo]);

  // Group by student
  const grouped = useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string; rollNo: string; subjects: { name: string; marks: number; total: number; pass: boolean }[] }>();
    for (const r of dateFilteredResults) {
      const sid = resolveId(r.student_id);
      if (!sid) continue;
      const sName = resolveName(r.student_id, sid);
      const roll = typeof r.student_id === "object" && r.student_id ? (r.student_id as { roll_no?: string }).roll_no || "" : "";
      const subjectName = resolveName(r.subject_id, "Unknown");
      if (!map.has(sid)) map.set(sid, { studentId: sid, studentName: sName, rollNo: roll, subjects: [] });
      map.get(sid)!.subjects.push({
        name: subjectName,
        marks: r.marks_obtained,
        total: r.total_marks,
        pass: r.is_pass ?? r.marks_obtained >= (r.passing_marks ?? PASS_MARK),
      });
    }
    return Array.from(map.values());
  }, [dateFilteredResults]);

  // Collect unique subject names across all students
  const subjectNames = useMemo(() => {
    const set = new Set<string>();
    for (const g of grouped) g.subjects.forEach((s) => set.add(s.name));
    return Array.from(set);
  }, [grouped]);

  // Apply search
  const filteredData = grouped.filter((g) =>
    g.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply Sort
  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      const getPct = (row: typeof a) => {
        const totalObtained = row.subjects.reduce((sum, s) => sum + s.marks, 0);
        const totalMax = row.subjects.reduce((sum, s) => sum + s.total, 0);
        return totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      };

      if (selectedSort === "A-Z by Name" || selectedSort === "A–Z by Name") {
        return a.studentName.localeCompare(b.studentName);
      } else if (selectedSort === "Z-A by Name" || selectedSort === "Z–A by Name") {
        return b.studentName.localeCompare(a.studentName);
      } else if (selectedSort === "Roll No") {
        const rollA = parseInt(a.rollNo) || 0;
        const rollB = parseInt(b.rollNo) || 0;
        if (rollA && rollB) return rollA - rollB;
        return a.rollNo.localeCompare(b.rollNo);
      } else if (selectedSort === "Percentage: High to Low") {
        return getPct(b) - getPct(a);
      } else if (selectedSort === "Percentage: Low to High") {
        return getPct(a) - getPct(b);
      }
      return 0;
    });
    return data;
  }, [filteredData, selectedSort]);

  const getGrade = (pct: number) => {
    if (pct >= 90) return "O";
    if (pct >= 80) return "A+";
    if (pct >= 70) return "A";
    if (pct >= 60) return "B+";
    if (pct >= 50) return "B";
    if (pct >= 40) return "C+";
    if (pct >= 35) return "C";
    return "F";
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Result</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/examination" className="hover:text-primary">Examination</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Exam Result</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchResults()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Exam Results</h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Exam filter */}
            <div className="relative">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg outline-none focus:border-primary transition-colors appearance-none shadow-sm cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Exams</option>
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{ex.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date Range */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)} 
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-[13px] font-medium shadow-sm transition-colors cursor-pointer
                  ${(activeFrom && activeTo) || isDateRangeOpen
                    ? "border-primary bg-primary/10 dark:bg-primary/20 text-[var(--primary-hover)] dark:text-primary font-bold"
                    : "border-border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
              >
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="max-w-full sm:w-[120px] truncate">{dateRangeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDateRangeOpen ? "rotate-180" : ""}`} />
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1">
                    {DATE_RANGES.map((range) => (
                      <button key={range} onClick={() => applyDateRange(range)}
                        className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer
                          ${selectedRange === range ? "bg-primary/10 dark:bg-primary/20 text-[var(--primary-hover)] dark:text-primary font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                        {range}
                      </button>
                    ))}
                    {isCustom && (
                      <div className="px-4 py-3 border-t border-border bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="space-y-2">
                          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                            className="w-full text-[12px] px-2 py-1.5 border border-border rounded outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200" />
                          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                            className="w-full text-[12px] px-2 py-1.5 border border-border rounded outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200" />
                          <button onClick={applyCustomRange} disabled={!customFrom || !customTo}
                            className="w-full py-1.5 mt-1 text-[12px] font-bold text-white bg-primary hover:bg-[var(--primary-hover)] rounded transition-colors disabled:opacity-50 cursor-pointer">
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                    {(activeFrom || activeTo) && !isCustom && (
                      <div className="px-4 pt-2 pb-1 border-t border-border mt-1">
                        <button onClick={() => { setActiveFrom(null); setActiveTo(null); setSelectedRange("All Time"); setIsDateRangeOpen(false); }}
                          className="w-full text-[12px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer">
                          Clear Filter
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sort */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer ${
                  selectedSort !== "A-Z by Name" ? "border-primary bg-primary/10 dark:bg-primary/10" : ""
                }`}
              >
                <List className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Sort: {selectedSort} <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["A-Z by Name", "Z-A by Name", "Roll No", "Percentage: High to Low", "Percentage: Low to High"].map((item) => (
                      <button key={item} onClick={() => { setSelectedSort(item); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2 text-[13px] text-left transition-colors cursor-pointer ${item === selectedSort ? "bg-primary text-white font-semibold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            <span>Showing</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{sortedData.length}</span>
            <span>students</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or roll no…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-12">
                  <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                {subjectNames.map((sub) => (
                  <th key={sub} className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">{sub}</th>
                ))}
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Percent(%)</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Grade</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Result</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8 + subjectNames.length} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8 + subjectNames.length} className="px-6 py-10 text-center text-slate-400">
                    {selectedExamId ? "No results for this exam." : "No results found. Select an exam or add results."}
                  </td>
                </tr>
              ) : sortedData.map((row) => {
                const totalObtained = row.subjects.reduce((a, s) => a + s.marks, 0);
                const totalMax = row.subjects.reduce((a, s) => a + s.total, 0);
                const percent = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
                const grade = getGrade(percent);
                const failed = row.subjects.some((s) => !s.pass);

                return (
                  <tr key={row.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/students/${row.studentId}`} className="font-semibold text-primary hover:text-[var(--primary-hover)] transition-colors cursor-pointer">
                        {row.studentName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.rollNo || "—"}</td>
                    {subjectNames.map((sub) => {
                      const subData = row.subjects.find((s) => s.name === sub);
                      return (
                        <td key={sub} className={`px-6 py-4 font-medium ${subData && !subData.pass ? "text-rose-500" : "text-slate-600 dark:text-slate-300"}`}>
                          {subData ? subData.marks : "—"}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{totalObtained}/{totalMax}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{percent}%</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{grade}</td>
                    <td className="px-6 py-4">
                      {failed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Fail
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pass
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setReportCardData({ ...row, percent, grade, failed, totalObtained, totalMax })}
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        title="Print Report Card"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors">Prev</button>
          <button className="w-7 h-7 rounded-lg bg-primary text-white text-[13px] font-medium flex items-center justify-center">1</button>
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors">Next</button>
        </div>
      </div>

      {/* Report Card Modal */}
      {reportCardData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 dark:bg-slate-900">
            
            {/* Modal Header (Not Printed) */}
            <div className="flex items-center justify-between p-4 border-b border-border print:hidden">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Student Report Card</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => PrintService.print('printable-report-card', { pageSize: 'A4' })}
                  className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Report Card
                </button>
                <button 
                  onClick={() => setReportCardData(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto print:p-0 print:overflow-visible print:w-full print:absolute print:left-0 print:top-0 scrollbar-thin" id="printable-report-card" data-print-zone="true">
              
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  .print-border { border: 12px double #1e293b !important; }
                }
              `}} />

              {/* Certificate Border Frame */}
              <div className="border-[12px] border-double border-slate-800 dark:border-slate-700 p-6 md:p-10 relative overflow-hidden bg-white dark:bg-slate-900 print-border rounded-xl">
                
                {/* Subtle Guilloche Watermark Effect */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none select-none flex items-center justify-center">
                  <svg className="w-96 h-96 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="6" />
                    <path d="M12 2v20M2 12h20M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6" />
                  </svg>
                </div>

                {/* School Header */}
                <div className="text-center relative mb-8 border-b-2 border-slate-800 dark:border-slate-700 pb-5">
                  {/* SVG Premium School Crest */}
                  <div className="mb-3 flex justify-center">
                    <svg className="w-16 h-16 text-slate-800 dark:text-slate-200" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M32 4L12 12v16c0 14.5 20 28 20 28s20-13.5 20-28V12L32 4z" fill="currentColor" fillOpacity="0.05" />
                      <path d="M32 4L12 12v16c0 14.5 20 28 20 28s20-13.5 20-28V12L32 4z" strokeWidth="2" />
                      <path d="M32 18v16" strokeWidth="2" strokeLinecap="round" />
                      <path d="M22 26h20" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="32" cy="18" r="2" fill="currentColor" />
                      <path d="M24 40c4-4 12-4 16 0" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-[10px] tracking-[0.2em] font-extrabold text-slate-400 uppercase">Affiliated to National Education Board</span>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-wider mt-1.5">MySchoolLife Academy</h1>
                  <p className="text-slate-500 text-[12px] dark:text-slate-400 mt-1">UDISE School Code: 27230500123 | School Affiliation No: 1930245</p>
                  <p className="text-slate-500 text-[12px] dark:text-slate-400">123 Education Lane, Learning City, 10001 | Email: contact@myschoollife.edu</p>

                  <div className="mt-5 inline-block bg-slate-800 text-white dark:bg-slate-700 px-6 py-2 rounded-lg font-black text-[13px] uppercase tracking-[0.15em] shadow-sm">
                    Academic Achievement Report
                  </div>
                </div>

                {/* Student Details Grid */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-8 text-[13.5px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
                    <div className="flex border-b border-dashed border-slate-300 dark:border-slate-700 pb-1.5">
                      <span className="font-extrabold text-slate-500 w-32 uppercase text-[11px] self-end">Student Name:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 flex-1">{reportCardData.studentName}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-300 dark:border-slate-700 pb-1.5">
                      <span className="font-extrabold text-slate-500 w-32 uppercase text-[11px] self-end">Roll Number:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 flex-1">{reportCardData.rollNo || "—"}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-300 dark:border-slate-700 pb-1.5">
                      <span className="font-extrabold text-slate-500 w-32 uppercase text-[11px] self-end">Examination:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 flex-1">{exams.find(e => e._id === selectedExamId)?.name || "Annual Term Evaluation"}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-300 dark:border-slate-700 pb-1.5">
                      <span className="font-extrabold text-slate-500 w-32 uppercase text-[11px] self-end">Report Date:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 flex-1">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Marks Table */}
                <div className="overflow-hidden border border-slate-300 dark:border-slate-800 rounded-lg mb-8">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-800">
                        <th className="px-5 py-3 uppercase text-[11px] tracking-wider">Subject Title</th>
                        <th className="px-5 py-3 uppercase text-[11px] tracking-wider text-center w-32">Maximum Marks</th>
                        <th className="px-5 py-3 uppercase text-[11px] tracking-wider text-center w-32">Marks Obtained</th>
                        <th className="px-5 py-3 uppercase text-[11px] tracking-wider text-center w-32">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {reportCardData.subjects.map((sub: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-250">{sub.name}</td>
                          <td className="px-5 py-3 text-center text-slate-500 dark:text-slate-400 font-medium">{sub.total}</td>
                          <td className="px-5 py-3 text-center font-bold text-slate-900 dark:text-white text-[14px]">{sub.marks}</td>
                          <td className="px-5 py-3 text-center">
                            {sub.pass ? (
                              <span className="text-emerald-600 font-black text-[12px] uppercase">PASS</span>
                            ) : (
                              <span className="text-rose-600 font-black text-[12px] uppercase">FAIL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-slate-50 dark:bg-slate-800/30 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                        <td className="px-5 py-3.5 text-right uppercase text-[11px] tracking-wider text-slate-500">Aggregate Summary</td>
                        <td className="px-5 py-3.5 text-center text-slate-700 dark:text-slate-350">{reportCardData.totalMax}</td>
                        <td className="px-5 py-3.5 text-center text-slate-900 dark:text-white text-[15px]">{reportCardData.totalObtained}</td>
                        <td className="px-5 py-3.5 text-center">
                          {reportCardData.failed ? (
                            <span className="text-rose-600 font-black text-[12px]">FAILED</span>
                          ) : (
                            <span className="text-emerald-600 font-black text-[12px]">PASSED</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Score Summary Metrics */}
                <div className="grid grid-cols-3 gap-4 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-10 bg-slate-50/40 dark:bg-slate-800/20 relative">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Final Score</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{reportCardData.percent}%</div>
                  </div>
                  <div className="text-center border-x border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Assigned Grade</span>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{reportCardData.grade}</div>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Promotion Status</span>
                    <div className={`text-2xl font-black uppercase mt-1 ${reportCardData.failed ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {reportCardData.failed ? 'Retained' : 'Promoted'}
                    </div>
                  </div>

                  {/* Certified stamp Overlay */}
                  {!reportCardData.failed && (
                    <div className="absolute right-6 -bottom-1 rotate-[-12deg] opacity-[0.15] dark:opacity-[0.25] pointer-events-none select-none print:opacity-[0.2]">
                      <div className="border-4 border-emerald-600 text-emerald-650 text-[14px] font-black tracking-widest px-4 py-1.5 uppercase rounded">
                        {reportCardData.percent >= 75 ? "Distinction" : "Passed"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grading Scale Legend */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-10 text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 block mb-1 uppercase tracking-wider text-[9.5px]">Grading Scale System</span>
                  O (Outstanding): &gt;=90% | A+ (Excellent): 80-89% | A (Very Good): 70-79% | B+ (Good): 60-69% | B (Above Average): 50-59% | C (Pass): 35-49% | F (Failed): &lt;35%
                </div>

                {/* Signatures Footer */}
                <div className="flex justify-between items-end mt-16 pt-8 text-[13px] font-extrabold text-slate-700 dark:text-slate-300">
                  <div className="text-center w-36">
                    <div className="border-t border-slate-800 dark:border-slate-700 pt-2 uppercase text-[10px] tracking-wider text-slate-500">Class Teacher</div>
                  </div>
                  <div className="text-center w-36 relative flex flex-col items-center">
                    {/* SVG Subtle Principal Seal */}
                    <div className="absolute -top-10 opacity-[0.08] text-slate-900 pointer-events-none print:opacity-[0.1]">
                      <svg className="w-16 h-16 animate-spin-slow" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="50" cy="50" r="40" strokeDasharray="6,4" />
                        <path d="M50 20v60M20 50h60" />
                      </svg>
                    </div>
                    <div className="border-t border-slate-800 dark:border-slate-700 pt-2 uppercase text-[10px] tracking-wider text-slate-500">Principal</div>
                  </div>
                  <div className="text-center w-36">
                    <div className="border-t border-slate-800 dark:border-slate-700 pt-2 uppercase text-[10px] tracking-wider text-slate-500">Parent Signature</div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
