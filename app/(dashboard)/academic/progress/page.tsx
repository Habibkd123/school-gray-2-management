"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  TrendingUp, TrendingDown, Award, BookOpen, Search, Filter, Loader2, ArrowLeft, ArrowRight,
  ChevronRight, Calendar, User, CheckCircle2, AlertTriangle, HelpCircle, BarChart3, LineChart,
  List, ChevronDown
} from "lucide-react";
import { useClasses } from "../../../hooks/useClasses";
import { useStudents } from "../../../hooks/useStudents";
import { useResults } from "../../../hooks/useResults";
import { useExams } from "../../../hooks/useExams";
import { Modal } from "../../../components/ui/modal";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";

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

export default function StudentProgressPage() {
  const { classes, isLoading: classesLoading } = useClasses();
  const { students, isLoading: studentsLoading, fetchStudents } = useStudents({ skip: true });
  const { results, isLoading: resultsLoading, fetchResults } = useResults({ skip: true });
  const { exams, loading: examsLoading } = useExams();

  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Date range state
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState("All Time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [activeFrom, setActiveFrom] = useState<Date | null>(null);
  const [activeTo, setActiveTo] = useState<Date | null>(null);

  const applyDateRange = (range: string) => {
    if (range === "Custom Range") { setIsCustom(true); return; }
    setIsCustom(false);
    const { from, to } = getDateRangeDates(range);
    setActiveFrom(from); setActiveTo(to);
    setSelectedRange(range); setIsDateRangeOpen(false);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    setActiveFrom(new Date(customFrom)); setActiveTo(new Date(customTo));
    setSelectedRange(`${customFrom} — ${customTo}`);
    setIsCustom(false); setIsDateRangeOpen(false);
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Ascending");

  // Set default class when classes are loaded
  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes, selectedClassId]);

  // Fetch students and results when class changes
  React.useEffect(() => {
    if (selectedClassId) {
      fetchStudents({ classId: selectedClassId });
      fetchResults({ class_id: selectedClassId });
    }
  }, [selectedClassId, fetchStudents, fetchResults]);

  const isLoading = classesLoading || studentsLoading || resultsLoading || examsLoading;

  // Filter students by selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => {
      const cId = typeof s.class_id === "object" && s.class_id !== null ? s.class_id._id : s.class_id;
      return cId === selectedClassId;
    });
  }, [students, selectedClassId]);

  // Filter class results
  const classResults = useMemo(() => {
    if (!selectedClassId) return [];
    const studentIds = classStudents.map(s => s._id);
    return results.filter(r => {
      const sId = typeof r.student_id === "object" && r.student_id !== null ? r.student_id._id : r.student_id;
      const matchesStudent = studentIds.includes(sId);
      
      let matchesDate = true;
      if (activeFrom && activeTo) {
        if (r.createdAt) {
          const d = new Date(r.createdAt);
          matchesDate = d >= activeFrom && d <= activeTo;
        } else {
          matchesDate = false;
        }
      }
      return matchesStudent && matchesDate;
    });
  }, [results, classStudents, selectedClassId, activeFrom, activeTo]);

  // Calculate student performance details
  const studentMetrics = useMemo(() => {
    return classStudents.map(student => {
      const studentResults = classResults.filter(r => {
        const sId = typeof r.student_id === "object" && r.student_id !== null ? r.student_id._id : r.student_id;
        return sId === student._id;
      });

      const totalMarks = studentResults.reduce((sum, r) => sum + (r.total_marks || 0), 0);
      const obtainedMarks = studentResults.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);
      const averagePercentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

      // Grade calculation based on percentage
      let grade = "F";
      if (averagePercentage >= 90) grade = "A+";
      else if (averagePercentage >= 80) grade = "A";
      else if (averagePercentage >= 70) grade = "B";
      else if (averagePercentage >= 60) grade = "C";
      else if (averagePercentage >= 50) grade = "D";
      else if (averagePercentage >= 40) grade = "E";

      // GPA mapping (4.0 scale)
      let gpa = 0.0;
      if (averagePercentage >= 90) gpa = 4.0;
      else if (averagePercentage >= 80) gpa = 3.7;
      else if (averagePercentage >= 70) gpa = 3.0;
      else if (averagePercentage >= 60) gpa = 2.5;
      else if (averagePercentage >= 50) gpa = 2.0;
      else if (averagePercentage >= 40) gpa = 1.0;

      const hasPassed = averagePercentage >= 40;
      const subjectsCount = studentResults.length;

      return {
        student,
        totalMarks,
        obtainedMarks,
        averagePercentage,
        grade,
        gpa,
        hasPassed,
        subjectsCount,
        results: studentResults
      };
    });
  }, [classStudents, classResults]);

  const formatDate = (d: string | Date) => {
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return String(d); }
  };

  const dateRangeLabel = (activeFrom && activeTo && !isCustom)
    ? `${formatDate(activeFrom)} — ${formatDate(activeTo)}`
    : selectedRange;

  const triggerCls = (open: boolean) =>
    `flex items-center gap-2 px-3 py-2 border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors cursor-pointer
     ${open
      ? "border-[#F59E0B] text-[#F59E0B]"
      : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  // Filter student metrics by search term, status, grade, and sorting
  const filteredStudentMetrics = useMemo(() => {
    let list = studentMetrics.filter(m => {
      const matchesSearch = m.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (m.student.admission_no || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "All"
        ? true
        : filterStatus === "Pass" ? m.hasPassed : !m.hasPassed;

      const matchesGrade = filterGrade === "All"
        ? true
        : m.grade === filterGrade;

      return matchesSearch && matchesStatus && matchesGrade;
    });

    if (selectedSort === "Ascending") {
      list = [...list].sort((a, b) => a.student.name.localeCompare(b.student.name));
    } else if (selectedSort === "Descending") {
      list = [...list].sort((a, b) => b.student.name.localeCompare(a.student.name));
    } else if (selectedSort === "GPA: High to Low") {
      list = [...list].sort((a, b) => b.gpa - a.gpa);
    } else if (selectedSort === "GPA: Low to High") {
      list = [...list].sort((a, b) => a.gpa - b.gpa);
    }

    return list;
  }, [studentMetrics, searchTerm, filterStatus, filterGrade, selectedSort]);

  const pag = usePagination(filteredStudentMetrics, 10);

  // Summary Metrics
  const classSummary = useMemo(() => {
    if (studentMetrics.length === 0) return { avgGpa: 0, passRate: 0, topPerformer: "N/A" };
    const totalGpa = studentMetrics.reduce((sum, m) => sum + m.gpa, 0);
    const avgGpa = Math.round((totalGpa / studentMetrics.length) * 100) / 100;
    
    const passedCount = studentMetrics.filter(m => m.hasPassed).length;
    const passRate = Math.round((passedCount / studentMetrics.length) * 100);

    let topMetrics = studentMetrics[0];
    studentMetrics.forEach(m => {
      if (m.averagePercentage > (topMetrics?.averagePercentage || 0)) {
        topMetrics = m;
      }
    });

    return {
      avgGpa,
      passRate,
      topPerformer: topMetrics?.student?.name || "N/A"
    };
  }, [studentMetrics]);

  // Grade distributions for chart
  const gradeDistribution = useMemo(() => {
    const counts = { "A+": 0, "A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0 };
    studentMetrics.forEach(m => {
      const g = m.grade as keyof typeof counts;
      if (counts[g] !== undefined) {
        counts[g]++;
      }
    });
    return counts;
  }, [studentMetrics]);

  const maxDistributionCount = useMemo(() => {
    const vals = Object.values(gradeDistribution);
    return Math.max(...vals, 1);
  }, [gradeDistribution]);

  const selectedStudentMetric = useMemo(() => {
    return studentMetrics.find(m => m.student._id === selectedStudentId);
  }, [studentMetrics, selectedStudentId]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Progress Desk</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/academic" className="hover:text-[#F59E0B]">Academic</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Progress & Grading</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-border rounded-xl px-3.5 py-2 text-[13px] shadow-sm">
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wider">Class Filter:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white outline-none cursor-pointer font-bold"
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.name} - {c.section}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
          <span>Analyzing progress ledger reports...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 dark:bg-slate-800 dark:border-slate-700 text-[#5D6BEE] flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Class Average GPA</span>
                  <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">{classSummary.avgGpa} / 4.0</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Optimal
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-slate-800 dark:border-slate-700 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Passing Rate</span>
                  <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">{classSummary.passRate}%</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                Target Met
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 dark:bg-slate-800 dark:border-slate-700 text-amber-600 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Class Valedictorian</span>
                  <span className="text-xl font-bold block text-slate-900 dark:text-white mt-0.5 truncate max-w-full sm:w-[150px]">{classSummary.topPerformer}</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
                Top Rank
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Distribution Chart */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 text-left lg:col-span-1 flex flex-col justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">Grade Distribution</h3>
                <p className="text-[12px] text-slate-500 mb-6">Distribution count of grades in selected class.</p>
              </div>

              <div className="space-y-4">
                {Object.entries(gradeDistribution).map(([grade, count]) => {
                  const percent = Math.round((count / maxDistributionCount) * 100);
                  return (
                    <div key={grade} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px] font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{grade} Grade</span>
                        <span className="text-slate-500">{count} {count === 1 ? "student" : "students"}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            grade === "A+" || grade === "A" ? "bg-emerald-500" :
                            grade === "B" || grade === "C" ? "bg-indigo-500" :
                            grade === "D" ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Ledger Table */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left lg:col-span-2">
              <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Student Academic Ledger</h3>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap">
                  {/* ── Date Range ── */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setIsDateRangeOpen(!isDateRangeOpen)} className={triggerCls(isDateRangeOpen)}>
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
                                  className="w-full py-1.5 mt-1 text-[12px] font-bold text-white bg-[#F59E0B] hover:bg-[#D97706] rounded transition-colors disabled:opacity-50 cursor-pointer">
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

                  {/* ── Filter ── */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={triggerCls(isFilterOpen)}>
                      <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="whitespace-nowrap">Filter</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isFilterOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 text-left">
                          <div className="p-4 border-b border-border">
                            <h3 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-100">Filter</h3>
                          </div>
                          <div className="p-4 space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Passing Status</label>
                              <div className="relative">
                                <select 
                                  value={filterStatus} 
                                  onChange={(e) => setFilterStatus(e.target.value)}
                                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                                >
                                  <option value="All" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white">All Statuses</option>
                                  <option value="Pass" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white">Pass</option>
                                  <option value="Fail" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white">Fail</option>
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Overall Grade</label>
                              <div className="relative">
                                <select 
                                  value={filterGrade} 
                                  onChange={(e) => setFilterGrade(e.target.value)}
                                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                                >
                                  <option value="All" className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white">All Grades</option>
                                  {["A+", "A", "B", "C", "D", "E", "F"].map(g => (
                                    <option key={g} value={g} className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white">{g}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                          <div className="p-4 flex justify-end gap-3 bg-white dark:bg-slate-900 rounded-b-lg border-t border-border mt-2">
                            <button onClick={() => { setFilterStatus("All"); setFilterGrade("All"); setIsFilterOpen(false); }} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-[#0F172A] dark:text-slate-100 text-[13px] font-bold rounded-lg transition-colors cursor-pointer">Reset</button>
                            <button onClick={() => setIsFilterOpen(false)} className="px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer">Apply</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Sort by ── */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setIsSortOpen(!isSortOpen)} className={triggerCls(isSortOpen)}>
                      <List className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span>Sort: {selectedSort}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isSortOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                          {["Ascending", "Descending", "GPA: High to Low", "GPA: Low to High"].map((item) => (
                            <button 
                              key={item} 
                              onClick={() => { setSelectedSort(item); setIsSortOpen(false); }}
                              className={`w-full px-4 py-2.5 text-[14px] hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors font-medium cursor-pointer ${item === selectedSort ? "text-[#F59E0B] font-bold" : "text-slate-700 dark:text-slate-200"}`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student ledger..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full sm:w-[200px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B] transition-colors text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px] whitespace-nowrap">
                  <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                      <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Subjects Graded</th>
                      <th className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">Average Score</th>
                      <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">CGPA</th>
                      <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Status</th>
                      <th className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pag.paged.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                          No students matching selection criteria found.
                        </td>
                      </tr>
                    ) : (
                      pag.paged.map(({ student, averagePercentage, grade, gpa, hasPassed, subjectsCount }) => (
                        <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-slate-800 text-[#5D6BEE] flex items-center justify-center font-bold text-[12px]">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold block text-slate-900 dark:text-white">{student.name}</span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">Adm No: {student.admission_no}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-semibold text-slate-500">{subjectsCount}</td>
                          <td className="px-6 py-4 text-right font-bold font-mono text-slate-800 dark:text-slate-100">{averagePercentage}%</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              gpa >= 3.5 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                              gpa >= 2.5 ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400" :
                              gpa >= 1.5 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                              "bg-rose-50 text-rose-700 dark:bg-rose-955/30 dark:text-rose-400"
                            }`}>
                              {gpa.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {hasPassed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Fail
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedStudentId(student._id)}
                              className="px-3.5 py-1.5 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] rounded-lg transition-colors cursor-pointer text-[12px] font-bold"
                            >
                              Report Card
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                currentPage={pag.page}
                totalPages={pag.totalPages}
                totalItems={pag.totalItems}
                pageSize={pag.pageSize}
                onPageChange={pag.setPage}
              />
            </div>
          </div>
        </>
      )}

      {/* Student Report Card Modal */}
      <Modal isOpen={!!selectedStudentId} onClose={() => setSelectedStudentId(null)} title="Academic Report Card">
        {selectedStudentMetric && (
          <div className="p-6 space-y-6 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-border gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5D6BEE] flex items-center justify-center font-bold text-lg">
                  {selectedStudentMetric.student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">{selectedStudentMetric.student.name}</h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">Roll Number: {selectedStudentMetric.student.roll_no || "—"}</p>
                </div>
              </div>

              <div className="text-right flex sm:flex-col gap-2 sm:gap-1.5 items-center sm:items-end">
                <span className="text-[11px] uppercase font-bold text-slate-400">Ledger GPA</span>
                <span className="text-3xl font-black font-mono text-[#F59E0B]">{selectedStudentMetric.gpa.toFixed(2)}</span>
              </div>
            </div>

            {/* Performance Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-border">
                <span className="text-[11px] uppercase font-bold text-slate-500">Cumulative Score</span>
                <span className="text-2xl font-black block mt-1 font-mono text-slate-900 dark:text-white">{selectedStudentMetric.averagePercentage}%</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-border">
                <span className="text-[11px] uppercase font-bold text-slate-500">Letter Grade</span>
                <span className="text-2xl font-black block mt-1 text-slate-900 dark:text-white">{selectedStudentMetric.grade}</span>
              </div>
            </div>

            {/* Subject-wise Score Ledger */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Subject Analysis</h4>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-border">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Subject Name</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 dark:text-slate-200">Full Marks</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 dark:text-slate-200">Obtained</th>
                      <th className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-200">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedStudentMetric.results.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-6 text-center text-slate-500">No grades registered for this student.</td>
                      </tr>
                    ) : (
                      selectedStudentMetric.results.map((r) => {
                        const sName = typeof r.subject_id === "object" && r.subject_id !== null ? r.subject_id.name : "Subject";
                        return (
                          <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="px-5 py-3 text-slate-800 dark:text-slate-100 font-semibold">{sName}</td>
                            <td className="px-5 py-3 text-right text-slate-500 font-mono">{r.total_marks}</td>
                            <td className="px-5 py-3 text-right text-slate-900 dark:text-white font-bold font-mono">{r.marks_obtained}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                r.grade === "A" || r.grade === "A+" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20" :
                                r.grade === "B" || r.grade === "C" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20" :
                                "bg-rose-50 text-rose-700 dark:bg-rose-955/20"
                              }`}>
                                {r.grade || "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={() => setSelectedStudentId(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
