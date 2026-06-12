"use client";

import React, { useState, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2
} from "lucide-react";
import { useClasses } from "../../../hooks/useClasses";
import { useStudents } from "../../../hooks/useStudents";
import ReportTabs from "../ReportTabs";

export default function AttendanceReportPage() {
  const { classes, isLoading } = useClasses();
  const { students } = useStudents();

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");

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

  // Mock aggregated attendance for the class report since we don't have a bulk API yet
  const generateClassStats = (classId: string) => {
    const studentCount = getStudentsInClass(classId).length;
    const base = classId.charCodeAt(classId.length - 1);
    const presentRate = 75 + (base % 20); // 75-94%
    const totalWorkingDays = 22;
    return {
      studentCount,
      presentRate,
      averagePresent: Math.round((presentRate / 100) * studentCount),
      averageAbsent: studentCount - Math.round((presentRate / 100) * studentCount),
      totalWorkingDays
    };
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      <ReportTabs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Attendance Report (Class-wise)</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-[#F59E0B] cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Attendance Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-[#F59E0B] transition-colors shadow-sm cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-[#F59E0B] transition-colors shadow-sm cursor-pointer"><Printer className="w-4 h-4" /></button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500" /> Export as PDF</button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500" /> Export as Excel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Class Attendance Summary</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300" />
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredClasses.length}</span> classes</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search class…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B] transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Section</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total Students</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Working Days</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Avg Present</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Avg Absent</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Overall Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredClasses.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No classes found.</td></tr>
              ) : filteredClasses.map(c => {
                const stats = generateClassStats(c._id);
                return (
                  <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#0F172A] dark:text-slate-100">{c.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{c.section}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{stats.studentCount}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{stats.totalWorkingDays}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">{stats.averagePresent}</td>
                    <td className="px-6 py-4 text-rose-600 font-medium">{stats.averageAbsent}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.presentRate}%` }} />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{stats.presentRate}%</span>
                      </div>
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
