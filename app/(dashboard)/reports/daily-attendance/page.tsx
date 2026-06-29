"use client";

import React, { useState, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2
} from "lucide-react";
import { useClasses } from "../../../hooks/useClasses";
import { useStudents } from "../../../hooks/useStudents";
import ReportTabs from "../ReportTabs";

export default function DailyAttendanceReportPage() {
  const { classes, isLoading: classesLoading } = useClasses();
  const { students } = useStudents();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const filteredClasses = useMemo(() => {
    return classes.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classes, searchTerm]);

  const getStudentsInClass = (classId: string) =>
    students.filter(s => {
      const cid = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      return cid === classId;
    });

  // Mock today's attendance metrics per class based on date and classId
  const generateDailyStats = (classId: string, date: string) => {
    const studentCount = getStudentsInClass(classId).length;
    const base = classId.charCodeAt(classId.length - 1) + new Date(date).getDate();

    // Distribute students among P, A, L, HD
    const presentRate = 75 + (base % 20); // 75-94%
    const presentCount = Math.round((presentRate / 100) * studentCount);
    let remaining = studentCount - presentCount;

    const absentCount = Math.floor(remaining * 0.6);
    remaining -= absentCount;
    const lateCount = Math.floor(remaining * 0.8);
    const halfDayCount = remaining - lateCount;

    return {
      total: studentCount,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      halfDay: halfDayCount,
      rate: studentCount ? Math.round((presentCount / studentCount) * 100) : 0
    };
  };

  const totalStats = filteredClasses.reduce((acc, c) => {
    const s = generateDailyStats(c._id, selectedDate);
    acc.total += s.total;
    acc.present += s.present;
    acc.absent += s.absent;
    acc.late += s.late;
    return acc;
  }, { total: 0, present: 0, absent: 0, late: 0 });

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <ReportTabs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Daily Attendance Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-primary cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Daily Attendance</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Students", value: totalStats.total, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Present", value: totalStats.present, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Absent", value: totalStats.absent, color: "text-rose-600 bg-rose-50 border-rose-100" },
          { label: "Late", value: totalStats.late, color: "text-amber-600 bg-amber-50 border-amber-100" },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm">
            <p className={`text-xl font-bold border rounded-lg px-3 py-1.5 inline-block mb-2 ${card.color}`}>{card.value}</p>
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Daily Class Stats</h2>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredClasses.length}</span> classes</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search class…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total Students</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Present</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Absent</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Late</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Half Day</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">% Present</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classesLoading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredClasses.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No classes found.</td></tr>
              ) : filteredClasses.map(c => {
                const stats = generateDailyStats(c._id, selectedDate);
                return (
                  <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground dark:text-slate-100">{c.name} {c.section}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{stats.total}</td>
                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/30 dark:bg-emerald-500/5">{stats.present}</td>
                    <td className="px-6 py-4 text-rose-600 dark:text-rose-400 font-bold bg-rose-50/30 dark:bg-rose-500/5">{stats.absent}</td>
                    <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-bold bg-amber-50/30 dark:bg-amber-500/5">{stats.late}</td>
                    <td className="px-6 py-4 text-sky-600 dark:text-sky-400 font-bold bg-sky-50/30 dark:bg-sky-500/5">{stats.halfDay}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[12px] font-bold ${stats.rate >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {stats.rate}%
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
