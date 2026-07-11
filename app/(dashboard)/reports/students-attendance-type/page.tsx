"use client";

import React, { useState, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2
} from "lucide-react";
import { useClasses } from "../../../hooks/useClasses";
import { useStudents } from "../../../hooks/useStudents";
import ReportTabs from "../ReportTabs";

export default function StudentsAttendanceTypePage() {
  const { classes, isLoading: classesLoading } = useClasses();
  const { students } = useStudents();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.admission_no || "").toLowerCase().includes(searchTerm.toLowerCase());
      const classId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      const matchClass = !selectedClass || classId === selectedClass;
      return matchSearch && matchClass;
    });
  }, [students, searchTerm, selectedClass]);

  const generateAttendanceTypes = (id: string) => {
    const base = id.charCodeAt(id.length - 1);
    const totalDays = 120;
    const present = 80 + (base % 30);
    const late = (base % 5);
    const halfDay = (base % 3);
    const absent = totalDays - present - late - halfDay;
    return { totalDays, present, absent, late, halfDay };
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <ReportTabs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Students Attendance by Type</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-primary cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Students Attendance Type</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"><RefreshCw className="w-4 h-4" /></button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"><Printer className="w-4 h-4" /></button>
          <button className="px-4 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Cumulative Attendance Types</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
            </select>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="card-subtitle text-[13px]">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredStudents.length}</span> students</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search student…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Admission No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total Days</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Present</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Absent</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Late</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Half Day</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">% Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classesLoading ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-slate-400">No students found.</td></tr>
              ) : filteredStudents.map(s => {
                const stats = generateAttendanceTypes(s._id);
                const classId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
                const cls = classes.find(c => c._id === classId);
                const rate = Math.round((stats.present / stats.totalDays) * 100);
                return (
                  <tr key={s._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] flex-shrink-0">{s.name.charAt(0)}</div>
                        <span className="font-semibold text-foreground dark:text-slate-100">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{s.admission_no || s._id.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{cls ? `${cls.name} ${cls.section}` : "—"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{stats.totalDays}</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold bg-emerald-50/30">{stats.present}</td>
                    <td className="px-6 py-4 text-rose-600 font-bold bg-rose-50/30">{stats.absent}</td>
                    <td className="px-6 py-4 text-amber-600 font-bold bg-amber-50/30">{stats.late}</td>
                    <td className="px-6 py-4 text-sky-600 font-bold bg-sky-50/30">{stats.halfDay}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[12px] font-bold ${rate >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {rate}%
                      </span>
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
