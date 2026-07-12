"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Printer, Download, RefreshCw, Trophy, FileText, ChevronDown } from "lucide-react";
import { useExams } from "@/app/hooks/useExams";
import { useClasses } from "@/app/hooks/useClasses";
import { useResults } from "@/app/hooks/useResults";
import { useStudents } from "@/app/hooks/useStudents";
import { PrintService } from "@/app/lib/print-service";

function resolveId(field: { _id: string } | string | undefined): string {
  if (!field) return "";
  return typeof field === "object" ? field._id : field;
}

function resolveName(field: { name: string } | string | undefined, fallback = ""): string {
  if (!field) return fallback;
  return typeof field === "object" ? field.name : fallback;
}

export default function MeritListPage() {
  const { exams } = useExams();
  const { classes } = useClasses();
  const { results, fetchResults, isLoading } = useResults({ skip: true });
  const { students, isLoading: studentsLoading, fetchStudents } = useStudents({ skip: true });

  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Lazy load data when both exam and class are selected
  React.useEffect(() => {
    if (selectedExamId && selectedClassId) {
      fetchStudents({ classId: selectedClassId, limit: 500 });
      fetchResults({ exam_id: selectedExamId, class_id: selectedClassId }, 1, 500);
    }
  }, [selectedExamId, selectedClassId, fetchStudents, fetchResults]);

  const isLoadingAll = isLoading || studentsLoading;

  // Group and rank students based on selected Exam and Class
  const rankedStudents = useMemo(() => {
    if (!selectedExamId || !selectedClassId || students.length === 0) return [];

    // Filter results for this exam and class
    // Some result objects may not have class_id populated if they were saved before we added it to the UI, 
    // but we can infer class from the student object if student is populated.
    const relevantResults = results.filter(r => {
      if (resolveId(r.exam_id) !== selectedExamId) return false;
      const sId = resolveId(r.student_id);
      const studentObj = students.find(s => s._id === sId);
      if (!studentObj) return false;
      const sClassId = typeof studentObj.class_id === "object" ? studentObj.class_id?._id : studentObj.class_id;
      return sClassId === selectedClassId;
    });

    // Group by student
    const map = new Map<string, { 
      studentId: string; 
      studentName: string; 
      rollNo: string; 
      totalObtained: number; 
      totalMax: number; 
      subjectsFailed: number;
    }>();

    for (const r of relevantResults) {
      const sid = resolveId(r.student_id);
      const sName = resolveName(r.student_id, "Unknown Student");
      const roll = typeof r.student_id === "object" ? (r.student_id as any).roll_no || "" : "";
      
      if (!map.has(sid)) {
        map.set(sid, { studentId: sid, studentName: sName, rollNo: roll, totalObtained: 0, totalMax: 0, subjectsFailed: 0 });
      }
      
      const st = map.get(sid)!;
      st.totalObtained += r.marks_obtained;
      st.totalMax += r.total_marks;
      const isPass = r.is_pass ?? (r.marks_obtained >= (r.passing_marks ?? 35));
      if (!isPass) st.subjectsFailed += 1;
    }

    // Convert to array and calculate percentage
    let arr = Array.from(map.values()).map(s => {
      const percent = s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0;
      return { ...s, percent };
    });

    // Sort descending by percentage, then by total marks, then by name
    arr.sort((a, b) => {
      // Students with failed subjects go to the bottom of the merit list
      if (a.subjectsFailed === 0 && b.subjectsFailed > 0) return -1;
      if (a.subjectsFailed > 0 && b.subjectsFailed === 0) return 1;

      if (b.percent !== a.percent) return b.percent - a.percent;
      if (b.totalObtained !== a.totalObtained) return b.totalObtained - a.totalObtained;
      return a.studentName.localeCompare(b.studentName);
    });

    // Assign ranks
    let currentRank = 1;
    return arr.map((s, idx) => {
      // If same marks as previous, same rank. Otherwise, rank = index + 1
      if (idx > 0) {
        const prev = arr[idx - 1];
        if (s.percent < prev.percent) {
          currentRank = idx + 1;
        }
      }
      return { ...s, rank: currentRank };
    });

  }, [results, selectedExamId, selectedClassId, students]);

  const filteredData = useMemo(() => {
    return rankedStudents.filter(s => 
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rankedStudents, searchTerm]);

  const getRankBadge = (rank: number, hasFailed: boolean) => {
    if (hasFailed) return <span className="text-slate-400 font-medium">—</span>;
    if (rank === 1) return <div className="flex items-center gap-1.5 font-black text-amber-500 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200"><Trophy className="w-4 h-4" /> 1st</div>;
    if (rank === 2) return <div className="flex items-center gap-1.5 font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300 dark:bg-slate-800 dark:text-slate-400"><Trophy className="w-4 h-4" /> 2nd</div>;
    if (rank === 3) return <div className="flex items-center gap-1.5 font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200"><Trophy className="w-4 h-4" /> 3rd</div>;
    return <span className="font-bold text-slate-600 dark:text-slate-300 px-2">{rank}th</span>;
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Merit List</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/reports" className="hover:text-primary">Reports</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Merit List</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => fetchResults()} 
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => PrintService.print('printable-area', { pageSize: 'A4' })}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
          >
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

      {/* Filter Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-5 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary transition-colors ${
                selectedExamId ? "border-primary bg-primary/10 dark:bg-primary/10" : "border-border"
              }`}
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Exam</option>
              {exams.map(e => (
                <option key={e._id} value={e._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary transition-colors ${
                selectedClassId ? "border-primary bg-primary/10 dark:bg-primary/10" : "border-border"
              }`}
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Class</option>
              {classes.map(c => (
                <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.name} {c.section ? `— ${c.section}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Print Header (Only visible when printing) */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-wider mb-2 dark:text-white">MySchoolLife Academy</h1>
        <div className="mt-4 inline-block bg-slate-800 text-white px-6 py-2 rounded-full font-bold text-[15px] uppercase tracking-widest shadow-sm">
          Merit List
        </div>
        <div className="mt-4 text-slate-700 font-bold text-lg dark:text-slate-200">
          {exams.find(e => e._id === selectedExamId)?.name} - {classes.find(c => c._id === selectedClassId)?.name}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left" id="printable-area" data-print-zone="true">
        
        {/* Controls Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50 print:hidden">
          <div className="card-subtitle flex items-center gap-2 text-[13px]">
            <span>Showing</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredData.length}</span>
            <span>ranked students</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or roll no..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="erp-table text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-24">Rank</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Marks Obtained</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total Marks</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Percentage</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(!selectedExamId || !selectedClassId) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 print:hidden">
                    Please select an Exam and Class to generate the merit list.
                  </td>
                </tr>
              ) : isLoadingAll ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 print:hidden">
                    Generating merit list...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    No results found for this exam and class.
                  </td>
                </tr>
              ) : filteredData.map((student) => (
                <tr key={student.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    {getRankBadge(student.rank, student.subjectsFailed > 0)}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{student.rollNo || "—"}</td>
                  <td className="px-6 py-4">
                    <Link href={`/students/${student.studentId}`} className="font-bold text-primary hover:text-[var(--primary-hover)] transition-colors cursor-pointer">
                      {student.studentName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{student.totalObtained}</td>
                  <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{student.totalMax}</td>
                  <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{student.percent.toFixed(2)}%</td>
                  <td className="px-6 py-4">
                    {student.subjectsFailed > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                        Failed {student.subjectsFailed} Subject(s)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Pass
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
