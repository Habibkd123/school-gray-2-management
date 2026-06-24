"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2
} from "lucide-react";
import { useStudents } from "../../../hooks/useStudents";
import { useClasses } from "../../../hooks/useClasses";

export default function StudentReportPage() {
  const { students, isLoading } = useStudents();
  const { classes } = useClasses();

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const getClassName = (class_id: { _id: string; name: string; section: string } | string) => {
    if (typeof class_id === "object") return `${class_id?.name} ${class_id?.section}`;
    const cls = classes.find((c) => c._id === class_id);
    return cls ? `${cls.name} ${cls.section}` : "—";
  };

  const filteredData = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.admission_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.roll_no || "").toLowerCase().includes(searchTerm.toLowerCase());

      const classId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      const matchClass = !filterClass || classId === filterClass;
      const matchGender = !filterGender || (s.gender || "").toLowerCase() === filterGender.toLowerCase();
      const matchStatus = !filterStatus || (filterStatus === "active" ? s.is_active : !s.is_active);

      return matchSearch && matchClass && matchGender && matchStatus;
    });
  }, [students, searchTerm, filterClass, filterGender, filterStatus]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-[#F59E0B] cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Student Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#F59E0B] transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#F59E0B] transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Students", value: students.length, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Active", value: students.filter(s => s.is_active).length, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Inactive", value: students.filter(s => !s.is_active).length, color: "text-rose-600 bg-rose-50 border-rose-100" },
          { label: "Classes", value: classes.length, color: "text-amber-600 bg-amber-50 border-amber-100" },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-bold border rounded-lg px-3 py-1.5 inline-block mb-2 ${card.color}`}>{card.value}</p>
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Student Report List</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter */}
            <div className="relative">
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
                <Filter className="w-4 h-4 text-slate-400" /> Filter <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-100">Filter</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
                          <div className="relative">
                            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer">
                              <option value="">All</option>
                              {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Gender</label>
                          <div className="relative">
                            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer">
                              <option value="">All</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Status</label>
                        <div className="relative">
                          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer">
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 border-t border-border">
                      <button onClick={() => { setFilterClass(""); setFilterGender(""); setFilterStatus(""); }} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer">Reset</button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-5 py-2.5 bg-[#F59E0B] text-white text-[13px] font-bold rounded-lg cursor-pointer">Apply</button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Sort */}
            <div className="relative">
              <button onClick={() => setIsSortOpen(!isSortOpen)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
                <List className="w-4 h-4 text-slate-400" /> Sort <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                    {["A–Z Name", "Admission No", "Date of Join"].map(opt => (
                      <button key={opt} onClick={() => setIsSortOpen(false)} className="w-full px-4 py-2.5 text-[14px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left font-medium cursor-pointer">{opt}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500 dark:text-slate-400">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredData.length}</span> of {students.length}</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search name, admission no, roll no…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[280px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B] transition-colors" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Admission No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Gender</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Guardian</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Date of Join</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">DOB</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-slate-400">No students found.</td></tr>
              ) : filteredData.map(s => (
                <tr key={s._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/students/${s._id}`} className="font-semibold text-[#F59E0B] hover:text-[#D97706] cursor-pointer">
                      {s.admission_no || s._id.slice(-6).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.roll_no || "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] flex-shrink-0">{s.name.charAt(0)}</div>
                      <span className="font-semibold text-[#0F172A] dark:text-slate-100">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getClassName(s.class_id)}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">{s.gender || "—"}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.guardian_name || "—"}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {s.admission_date ? new Date(s.admission_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {s.dob ? new Date(s.dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {s.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors">Prev</button>
          <button className="w-7 h-7 rounded-lg bg-[#F59E0B] text-white text-[13px] font-medium flex items-center justify-center">1</button>
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
}
