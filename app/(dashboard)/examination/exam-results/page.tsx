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
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Result</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/examination" className="hover:text-[#1E3A5F]">Examination</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Exam Result</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchResults()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#1E3A5F] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#1E3A5F] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
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
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
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
                className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg outline-none focus:border-[#1E3A5F] transition-colors appearance-none shadow-sm cursor-pointer"
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
                    ? "border-[#1E3A5F] bg-[#FFF9E6] dark:bg-amber-900/20 text-[#162C47] dark:text-amber-500 font-bold"
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
                          ${selectedRange === range ? "bg-[#FFF3CD] dark:bg-amber-900/20 text-[#92400E] dark:text-amber-500 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
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
                            className="w-full py-1.5 mt-1 text-[12px] font-bold text-white bg-[#1E3A5F] hover:bg-[#162C47] rounded transition-colors disabled:opacity-50 cursor-pointer">
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
                  selectedSort !== "A-Z by Name" ? "border-[#1E3A5F] bg-[#FFF9E6] dark:bg-[#1E3A5F]/10" : ""
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
                        className={`w-full px-4 py-2 text-[13px] text-left transition-colors cursor-pointer ${item === selectedSort ? "bg-[#1E3A5F] text-white font-semibold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
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
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#1E3A5F] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-12">
                  <input type="checkbox" className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer" />
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
                      <input type="checkbox" className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer" />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/students/${row.studentId}`} className="font-semibold text-[#1E3A5F] hover:text-[#162C47] transition-colors cursor-pointer">
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
          <button className="w-7 h-7 rounded-lg bg-[#1E3A5F] text-white text-[13px] font-medium flex items-center justify-center">1</button>
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors">Next</button>
        </div>
      </div>

      {/* Report Card Modal */}
      {reportCardData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header (Not Printed) */}
            <div className="flex items-center justify-between p-4 border-b border-border print:hidden">
              <h2 className="text-lg font-bold text-slate-800">Report Card</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#162C47] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button 
                  onClick={() => setReportCardData(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible print:w-full print:absolute print:left-0 print:top-0" id="printable-report-card">
              
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * { visibility: hidden; }
                  #printable-report-card, #printable-report-card * { visibility: visible; }
                  #printable-report-card { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
                }
              `}} />

              {/* School Header */}
              <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-wider mb-2">MySchoolLife Academy</h1>
                <p className="text-slate-600 text-[14px]">123 Education Lane, Learning City, 10001</p>
                <p className="text-slate-600 text-[14px]">Email: contact@myschoollife.edu | Phone: +1 234 567 8900</p>
                <div className="mt-6 inline-block bg-slate-800 text-white px-6 py-2 rounded-full font-bold text-[15px] uppercase tracking-widest shadow-sm">
                  Academic Report Card
                </div>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-[14px]">
                <div className="flex border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold text-slate-700 w-32">Student Name:</span>
                  <span className="font-semibold text-slate-900">{reportCardData.studentName}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold text-slate-700 w-32">Roll Number:</span>
                  <span className="font-semibold text-slate-900">{reportCardData.rollNo || "N/A"}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold text-slate-700 w-32">Examination:</span>
                  <span className="font-semibold text-slate-900">{exams.find(e => e._id === selectedExamId)?.name || "All Exams"}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-300 pb-1">
                  <span className="font-bold text-slate-700 w-32">Date:</span>
                  <span className="font-semibold text-slate-900">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              {/* Marks Table */}
              <table className="w-full text-left border-collapse mb-8">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 px-4 py-3 font-bold uppercase text-[12px] tracking-wider">Subject</th>
                    <th className="border border-slate-300 px-4 py-3 font-bold uppercase text-[12px] tracking-wider text-center">Total Marks</th>
                    <th className="border border-slate-300 px-4 py-3 font-bold uppercase text-[12px] tracking-wider text-center">Marks Obtained</th>
                    <th className="border border-slate-300 px-4 py-3 font-bold uppercase text-[12px] tracking-wider text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCardData.subjects.map((sub: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-4 py-3 font-semibold text-slate-800">{sub.name}</td>
                      <td className="border border-slate-300 px-4 py-3 text-center text-slate-600">{sub.total}</td>
                      <td className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">{sub.marks}</td>
                      <td className="border border-slate-300 px-4 py-3 text-center">
                        <span className={`font-bold ${sub.pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {sub.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-300 px-4 py-3 text-right uppercase text-[13px] text-slate-800">Grand Total</td>
                    <td className="border border-slate-300 px-4 py-3 text-center text-slate-800">{reportCardData.totalMax}</td>
                    <td className="border border-slate-300 px-4 py-3 text-center text-slate-900 text-[15px]">{reportCardData.totalObtained}</td>
                    <td className="border border-slate-300 px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>

              {/* Summary Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between mb-12">
                <div className="text-center">
                  <div className="text-[12px] uppercase font-bold text-slate-500 mb-1">Percentage</div>
                  <div className="text-2xl font-black text-[#1E3A5F]">{reportCardData.percent}%</div>
                </div>
                <div className="w-px h-12 bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-[12px] uppercase font-bold text-slate-500 mb-1">Grade</div>
                  <div className="text-2xl font-black text-indigo-600">{reportCardData.grade}</div>
                </div>
                <div className="w-px h-12 bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-[12px] uppercase font-bold text-slate-500 mb-1">Final Result</div>
                  <div className={`text-2xl font-black uppercase ${reportCardData.failed ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {reportCardData.failed ? 'Fail' : 'Pass'}
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-end mt-16 pt-8 text-[14px] font-bold text-slate-800">
                <div className="text-center w-40">
                  <div className="border-t-2 border-slate-800 pt-2">Class Teacher</div>
                </div>
                <div className="text-center w-40">
                  <div className="border-t-2 border-slate-800 pt-2">Principal</div>
                </div>
                <div className="text-center w-40">
                  <div className="border-t-2 border-slate-800 pt-2">Parent / Guardian</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
