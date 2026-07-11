"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search, RefreshCw, Printer, Download, FileText, Loader2, BookOpen, Award, BarChart3, Percent, CheckCircle2, XCircle
} from "lucide-react";
import { useExams } from "../../../hooks/useExams";
import { useClasses } from "../../../hooks/useClasses";
import { useSubjects } from "../../../hooks/useSubjects";
import { useStudents } from "../../../hooks/useStudents";
import { getAuthHeaders } from "@/lib/utils/session";
import ReportTabs from "../ReportTabs";
import { ChevronDown } from "lucide-react";

function resolveId(field: { _id: string } | string | undefined): string {
  if (!field) return "";
  return typeof field === "object" ? field._id : field;
}

export default function ExaminationReportPage() {
  const { exams } = useExams();
  const { classes } = useClasses();
  const { students } = useStudents();

  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [results, setResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Filter exams by selected year and class
  const filteredExamsForSelect = useMemo(() => {
    return exams.filter(e => {
      const matchYear = !selectedYear || e.academic_year === selectedYear;
      const matchClass = !selectedClassId || (typeof e.class_id === "object" ? e.class_id?._id === selectedClassId : e.class_id === selectedClassId);
      return matchYear && matchClass;
    });
  }, [exams, selectedYear, selectedClassId]);

  // Load subjects for the selected class
  const { subjects, loading: loadingSubjects } = useSubjects(selectedClassId || undefined);

  // Fetch results when filters change
  const fetchAllResults = async () => {
    if (!selectedExamId) {
      setResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      const params = new URLSearchParams();
      params.set("exam_id", selectedExamId);
      params.set("limit", "1000"); // fetch all for report details
      if (selectedClassId) params.set("class_id", selectedClassId);
      
      const res = await fetch(`/api/results?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setResults(data.data.results || []);
      }
    } catch (e) {
      console.error("fetch exam results error", e);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    fetchAllResults();
  }, [selectedExamId, selectedClassId]);

  // Dynamic filter for students
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => {
      const cId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      return cId === selectedClassId && s.is_active !== false;
    });
  }, [students, selectedClassId]);

  const searchedStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.roll_no || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classStudents, searchTerm]);

  // Calculate Pass/Fail Summary, Top Performers, Marks Distribution
  const analytics = useMemo(() => {
    if (!selectedExamId || results.length === 0) {
      return {
        totalPassed: 0,
        totalFailed: 0,
        passPercentage: 0,
        topPerformers: [],
        distribution: { "90%+ (A+)": 0, "80-89% (A)": 0, "70-79% (B)": 0, "60-69% (C)": 0, "50-59% (D)": 0, "Below 50% (F)": 0 }
      };
    }

    const studentTotalMap: Record<string, { name: string, roll: string, obtained: number, total: number, subjectsCount: number, failedSubjects: number }> = {};

    results.forEach(r => {
      const studentId = typeof r.student_id === "object" ? r.student_id?._id : r.student_id;
      const studentName = typeof r.student_id === "object" ? r.student_id?.name : "Student";
      const studentRoll = typeof r.student_id === "object" ? r.student_id?.roll_no : "";
      
      const obtained = r.marks_obtained ?? r.obtained_marks ?? 0;
      const total = r.total_marks || 100;
      const isPass = r.is_pass !== false;

      if (!studentTotalMap[studentId]) {
        studentTotalMap[studentId] = {
          name: studentName,
          roll: studentRoll,
          obtained: 0,
          total: 0,
          subjectsCount: 0,
          failedSubjects: 0
        };
      }

      studentTotalMap[studentId].obtained += obtained;
      studentTotalMap[studentId].total += total;
      studentTotalMap[studentId].subjectsCount += 1;
      if (!isPass) {
        studentTotalMap[studentId].failedSubjects += 1;
      }
    });

    const studentList = Object.keys(studentTotalMap).map(id => ({
      id,
      ...studentTotalMap[id],
      percentage: studentTotalMap[id].total > 0 ? (studentTotalMap[id].obtained / studentTotalMap[id].total) * 100 : 0
    }));

    // Top Performers (sorted by total obtained marks or percentage)
    const topPerformers = [...studentList]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    // Distribution
    const distribution = {
      "90%+ (A+)": 0,
      "80-89% (A)": 0,
      "70-79% (B)": 0,
      "60-69% (C)": 0,
      "50-59% (D)": 0,
      "Below 50% (F)": 0
    };

    let totalPassed = 0;
    let totalFailed = 0;

    studentList.forEach(s => {
      const pct = s.percentage;
      if (pct >= 90) distribution["90%+ (A+)"]++;
      else if (pct >= 80) distribution["80-89% (A)"]++;
      else if (pct >= 70) distribution["70-79% (B)"]++;
      else if (pct >= 60) distribution["60-69% (C)"]++;
      else if (pct >= 50) distribution["50-59% (D)"]++;
      else distribution["Below 50% (F)"]++;

      if (s.failedSubjects === 0) {
        totalPassed++;
      } else {
        totalFailed++;
      }
    });

    const totalStudents = studentList.length;
    const passPercentage = totalStudents > 0 ? (totalPassed / totalStudents) * 100 : 0;

    return {
      totalPassed,
      totalFailed,
      passPercentage,
      topPerformers,
      distribution
    };
  }, [results, selectedExamId]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Report</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-primary cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Exam Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchAllResults} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"><RefreshCw className="w-4 h-4" /></button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"><Printer className="w-4 h-4" /></button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button onClick={() => { alert("Exporting report as PDF..."); setIsExportOpen(false); }} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF</button>
                  <button onClick={() => { alert("Exporting report as Excel..."); setIsExportOpen(false); }} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ReportTabs />

      {/* Interactive Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm text-left">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Academic Year Filter */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-800 dark:text-slate-100">Academic Year</label>
            <div className="relative">
              <select 
                value={selectedYear} 
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedExamId("");
                }}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-200 cursor-pointer appearance-none"
              >
                <option value="2024">2024 / 2025</option>
                <option value="2025">2025 / 2026</option>
                <option value="2026">2026 / 2027</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Class Filter */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-800 dark:text-slate-100">Class</label>
            <div className="relative">
              <select 
                value={selectedClassId} 
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedExamId("");
                  setSelectedSubjectId("");
                }}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-200 cursor-pointer appearance-none"
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name} - {c.section}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Exam Filter */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-800 dark:text-slate-100">Exam</label>
            <div className="relative">
              <select 
                value={selectedExamId} 
                onChange={(e) => setSelectedExamId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-200 cursor-pointer appearance-none disabled:opacity-50"
              >
                <option value="">Select Exam</option>
                {filteredExamsForSelect.map(e => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Subject Filter */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-800 dark:text-slate-100">Subject (optional)</label>
            <div className="relative">
              <select 
                value={selectedSubjectId} 
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassId || loadingSubjects}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-200 cursor-pointer appearance-none disabled:opacity-50"
              >
                <option value="">All Subjects (Class-wise)</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {!selectedExamId ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-16 shadow-sm text-center text-slate-500 dark:text-slate-400">
          <BookOpen className="w-12 h-12 text-slate-350 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-1">Select Filters to Generate Report</h3>
          <p className="text-[13px]">Choose Class and Exam to display results, pass/fail analytics, and top performers.</p>
        </div>
      ) : loadingResults ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-16 shadow-sm text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-slate-500 mt-3 text-[13px]">Compiling exam statistics...</p>
        </div>
      ) : (
        <>
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Pass Percentage</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{analytics.passPercentage.toFixed(1)}%</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Passed</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{analytics.totalPassed} students</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Failed</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{analytics.totalFailed} students</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Top Performers */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-5 flex flex-col gap-4">
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-border pb-3">
                <Award className="w-5 h-5 text-amber-500" />
                Top Performers
              </h3>
              {analytics.topPerformers.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-6">No records available.</p>
              ) : (
                <div className="space-y-3.5">
                  {analytics.topPerformers.map((student: any, i: number) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-border hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-extrabold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-700" : "bg-orange-100 text-orange-700"}`}>
                          #{i + 1}
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight">{student.name}</h4>
                          <span className="text-[11px] text-slate-400">Roll: {student.roll || "—"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-extrabold text-primary">{student.percentage.toFixed(1)}%</span>
                        <span className="block text-[11px] text-slate-400">{student.obtained} / {student.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Marks Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-5 flex flex-col gap-4 lg:col-span-2">
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-border pb-3">
                <BarChart3 className="w-5 h-5 text-primary" />
                Marks Distribution
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2">
                {Object.entries(analytics.distribution).map(([range, count]) => {
                  const total = analytics.totalPassed + analytics.totalFailed;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={range} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-border">
                      <span className="text-[11px] font-bold text-slate-400 block">{range}</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-black text-slate-800 dark:text-slate-100">{count}</span>
                        <span className="text-[12px] text-slate-400">({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Table (Class-wise / Subject-wise) */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                {selectedSubjectId ? "Subject-wise Student Performance" : "Class-wise Report Card Grid"}
              </h3>
              
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search students..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {selectedSubjectId ? (
                // Subject-wise Detailed Table
                <table className="erp-table text-[13px]">
                  <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-24">Roll No</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Marks Obtained</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Max Marks</th>
                      <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Grade</th>
                      <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Result</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {searchedStudents.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No students found.</td></tr>
                    ) : searchedStudents.map(student => {
                      const score = results.find(r => 
                        resolveId(r.student_id) === student._id && 
                        resolveId(r.subject_id) === selectedSubjectId
                      );
                      const obtained = score?.marks_obtained ?? score?.obtained_marks ?? "—";
                      const total = score?.total_marks ?? "—";
                      const grade = score?.grade ?? "—";
                      const isPass = score?.is_pass !== false;
                      const hasMarks = score !== undefined;

                      return (
                        <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-350">{student.roll_no || "—"}</td>
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{student.name}</td>
                          <td className="px-6 py-4 font-semibold text-primary">{obtained}</td>
                          <td className="px-6 py-4 text-slate-500">{total}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-slate-700 dark:text-slate-200">{grade}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {!hasMarks ? (
                              <span className="text-slate-400">—</span>
                            ) : isPass ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">Pass</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/20">Fail</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 italic">{score?.remarks || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                // Class-wise Report Card Grid (All Subjects as Columns)
                <table className="erp-table text-[13px]">
                  <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-24">Roll No</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                      {subjects.map(s => (
                        <th key={s._id} className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">{s.name}</th>
                      ))}
                      <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-32">Total Score</th>
                      <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200 w-24">Overall %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {searchedStudents.length === 0 ? (
                      <tr><td colSpan={subjects.length + 4} className="px-6 py-10 text-center text-slate-400">No students found.</td></tr>
                    ) : searchedStudents.map(student => {
                      let studentTotalObtained = 0;
                      let studentTotalMax = 0;
                      let subjectsGraded = 0;

                      return (
                        <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-350">{student.roll_no || "—"}</td>
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{student.name}</td>
                          
                          {subjects.map(s => {
                            const score = results.find(r => 
                              resolveId(r.student_id) === student._id && 
                              resolveId(r.subject_id) === s._id
                            );
                            const obtained = score?.marks_obtained ?? score?.obtained_marks;
                            const total = score?.total_marks || 100;

                            if (obtained !== undefined && obtained !== null) {
                              studentTotalObtained += obtained;
                              studentTotalMax += total;
                              subjectsGraded++;
                            }

                            return (
                              <td key={s._id} className="px-4 py-4">
                                {obtained !== undefined ? (
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                                    {obtained} <span className="text-[10px] text-slate-400">/ {total}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-6 py-4">
                            {subjectsGraded > 0 ? (
                              <span className="font-extrabold text-primary">
                                {studentTotalObtained} <span className="text-[11px] text-slate-400 font-normal">/ {studentTotalMax}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {studentTotalMax > 0 ? (
                              <span className={`px-2.5 py-1 rounded text-[11px] font-black ${((studentTotalObtained / studentTotalMax) * 100) >= 40 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {((studentTotalObtained / studentTotalMax) * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
