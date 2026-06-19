"use client";

import React, { useState, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Loader2
} from "lucide-react";
import { useTeachers } from "../../../hooks/useTeachers";
import { useAuth } from "@/app/context/auth";
import ReportTabs from "../ReportTabs";

export default function TeacherDayWiseReportPage() {
  const { teachers, isLoading } = useTeachers();
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teachers, searchTerm]);

  const generateDayWiseAttendance = (id: string) => {
    const base = id.charCodeAt(id.length - 1);
    const result = [];
    for (let i = 1; i <= 31; i++) {
      if (i % 7 === 0 || i % 7 === 6) {
        result.push("H"); // Holiday
        continue;
      }
      const val = (base + i) % 20;
      if (val < 16) result.push("P");
      else if (val < 17) result.push("A");
      else if (val < 19) result.push("L");
      else result.push("HD");
    }
    return result;
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      <ReportTabs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Day Wise Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-[#F59E0B] cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Teacher Day Wise</span>
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
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Monthly Attendance Grid</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {!isAdmin && (
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer" />
            )}
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredTeachers.length}</span> teachers</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search teacher…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B] transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 sticky left-0 bg-[#F8FAFC] dark:bg-[#0F172A] z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b]">Teacher</th>
                {Array.from({ length: 31 }).map((_, i) => (
                  <th key={i} className="px-2 py-4 text-center font-bold text-slate-700 dark:text-slate-200 min-w-full sm:w-[36px]">{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={32} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredTeachers.length === 0 ? (
                <tr><td colSpan={32} className="px-6 py-10 text-center text-slate-400">No teachers found.</td></tr>
              ) : filteredTeachers.map(t => {
                const dayWise = generateDayWiseAttendance(t._id);
                return (
                  <tr key={t._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b]">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] flex-shrink-0">{t.name.charAt(0)}</div>
                        <div>
                          <div className="font-semibold text-[#0F172A] dark:text-slate-100">{t.name}</div>
                          <div className="text-[11px] text-slate-500">{t.employee_id || t._id.slice(-6).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    {dayWise.map((status, i) => (
                      <td key={i} className="px-2 py-4 text-center">
                        <div className={`w-7 h-7 rounded mx-auto flex items-center justify-center text-[11px] font-bold ${
                          status === "P" ? "bg-emerald-100 text-emerald-700" :
                          status === "A" ? "bg-rose-100 text-rose-700" :
                          status === "L" ? "bg-amber-100 text-amber-700" :
                          status === "HD" ? "bg-sky-100 text-sky-700" :
                          "bg-slate-100 text-slate-400"
                        }`}>
                          {status}
                        </div>
                      </td>
                    ))}
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
