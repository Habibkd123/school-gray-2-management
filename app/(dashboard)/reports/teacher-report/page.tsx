"use client";

import React, { useState, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2
} from "lucide-react";
import { useTeachers } from "../../../hooks/useTeachers";
import ReportTabs from "../ReportTabs";

export default function TeacherReportPage() {
  const { teachers, isLoading } = useTeachers();

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState("");

  const departments = useMemo(() => {
    const deps = new Set(teachers.map(t => t.department).filter(Boolean));
    return Array.from(deps) as string[];
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.employee_id || t._id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = !filterDepartment || t.department === filterDepartment;
      return matchSearch && matchDept;
    });
  }, [teachers, searchTerm, filterDepartment]);

  const generateMockAttendance = (id: string) => {
    // Generate deterministic mock attendance based on teacher ID length and char codes
    const base = id.charCodeAt(id.length - 1);
    const result = [];
    for (let i = 0; i < 7; i++) {
      const val = (base + i) % 10;
      if (val < 7) result.push("present");
      else if (val < 8) result.push("late");
      else if (val < 9) result.push("half_day");
      else result.push("absent");
    }
    return result;
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <ReportTabs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-primary cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Teacher Report</span>
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
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Teacher Report List</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter */}
            <div className="relative">
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
                <Filter className="w-4 h-4 text-slate-400" /> Filter <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl z-50 text-left">
                    <div className="p-4 border-b border-border"><h3 className="text-[15px] font-bold text-foreground dark:text-slate-100">Filter</h3></div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Department</label>
                        <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 cursor-pointer dark:text-slate-300">
                          <option value="">All Departments</option>
                          {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 border-t border-border">
                      <button onClick={() => setFilterDepartment("")} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground text-[13px] font-bold rounded-lg cursor-pointer">Reset</button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-5 py-2.5 bg-primary text-white text-[13px] font-bold rounded-lg cursor-pointer">Apply</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500 dark:text-slate-400">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredTeachers.length}</span> teachers</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search teacher…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Teacher</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Department</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Qualification</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Recent Attendance (7 Days)</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredTeachers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No teachers found.</td></tr>
              ) : filteredTeachers.map(t => {
                const recentAtt = generateMockAttendance(t._id);
                return (
                  <tr key={t._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[12px] flex-shrink-0">{t.name.charAt(0)}</div>
                        <div>
                          <div className="font-semibold text-foreground dark:text-slate-100">{t.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.employee_id || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.department || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.qualification || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {recentAtt.map((status, i) => (
                          <div
                            key={i}
                            title={status}
                            className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                              status === "present" ? "bg-emerald-100 text-emerald-700" :
                              status === "absent" ? "bg-rose-100 text-rose-700" :
                              status === "late" ? "bg-amber-100 text-amber-700" :
                              "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {status === "present" ? "P" : status === "absent" ? "A" : status === "late" ? "L" : "H"}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Inactive</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400">Prev</button>
          <button className="w-7 h-7 rounded-lg bg-primary text-white text-[13px] font-medium flex items-center justify-center">1</button>
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400">Next</button>
        </div>
      </div>
    </div>
  );
}
