"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, List, ChevronDown, RefreshCw, Printer, Download, FileText, X, Loader2, Filter, Users, Calendar, Award
} from "lucide-react";
import { useClasses } from "../../../hooks/useClasses";
import { useStudents } from "../../../hooks/useStudents";
import { getAuthHeaders } from "@/lib/utils/session";
import ReportTabs from "../ReportTabs";
import { PrintService } from "@/app/lib/print-service";

export default function ClassReportPage() {
  const { classes, isLoading, fetchClasses } = useClasses();
  const { students, fetchStudents } = useStudents();

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<"A–Z" | "Most Students" | "Least Students">("A–Z");
  const [filterSection, setFilterSection] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Class Details Dashboard States
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetail, setClassDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "roster" | "tests">("overview");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const sections = useMemo(() => {
    const list = new Set(classes.map((c) => c.section).filter(Boolean));
    return Array.from(list) as string[];
  }, [classes]);

  const getStudentsInClass = (classId: string) =>
    students.filter((s) => {
      const cid = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      return cid === classId;
    });

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c._id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSection = !filterSection || c.section === filterSection;
      return matchSearch && matchSection;
    });
  }, [classes, searchTerm, filterSection]);

  const sortedClasses = useMemo(() => {
    const list = [...filteredClasses];
    if (selectedSort === "A–Z") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (selectedSort === "Most Students") {
      list.sort((a, b) => getStudentsInClass(b._id).length - getStudentsInClass(a._id).length);
    } else if (selectedSort === "Least Students") {
      list.sort((a, b) => getStudentsInClass(a._id).length - getStudentsInClass(b._id).length);
    }
    return list;
  }, [filteredClasses, selectedSort, students]);

  const totalPages = Math.ceil(sortedClasses.length / PAGE_SIZE);

  const paginatedClasses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedClasses.slice(start, start + PAGE_SIZE);
  }, [sortedClasses, page]);

  const selectedClass = classes.find((c) => c._id === selectedClassId);
  const modalStudents = selectedClassId ? getStudentsInClass(selectedClassId) : [];

  const handleRefresh = () => {
    fetchClasses();
    fetchStudents();
  };

  // Fetch detailed class statistics from database
  useEffect(() => {
    if (!selectedClassId) {
      setClassDetail(null);
      return;
    }

    const fetchClassStats = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/reports/class/${selectedClassId}?date=${selectedDate}`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          setClassDetail(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchClassStats();
  }, [selectedClassId, selectedDate]);

  const handleExport = (format: "csv" | "excel") => {
    if (sortedClasses.length === 0) {
      alert("No class records available to export.");
      return;
    }

    const headers = ["Class ID", "Class Name", "Section", "Number of Students"];
    const rows = sortedClasses.map((c) => [
      c._id.slice(-6).toUpperCase(),
      c.name,
      c.section,
      getStudentsInClass(c._id).length
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `class_report_${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "xls"}`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="print:hidden">
        <ReportTabs />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Class Report</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Class Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => PrintService.print('printable-area', { pageSize: 'A4' })}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export{" "}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF/CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left print:hidden">
        {[
          { label: "Total Classes", value: classes.length, color: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30" },
          { label: "Total Students", value: students.length, color: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" },
          { label: "Avg per Class", value: classes.length ? Math.round(students.length / classes.length) : 0, color: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" }
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-bold border rounded-lg px-3 py-1.5 inline-block mb-2 ${card.color}`}>
              {card.value}
            </p>
            <p className="card-subtitle text-[13px] font-semibold">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left print:hidden">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Class Report List</h2>
          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Filter className="w-4 h-4 text-slate-400" /> Filter{" "}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-foreground dark:text-slate-100">Filter</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Section</label>
                        <select
                          value={filterSection}
                          onChange={(e) => {
                            setFilterSection(e.target.value);
                            setPage(1);
                          }}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="">All Sections</option>
                          {sections.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 border-t border-border">
                      <button
                        onClick={() => {
                          setFilterSection("");
                          setPage(1);
                        }}
                        className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="px-5 py-2.5 bg-primary text-white text-[13px] font-bold rounded-lg cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <List className="w-4 h-4 text-slate-400" /> Sort: {selectedSort}{" "}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                    {(["A–Z", "Most Students", "Least Students"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSelectedSort(opt);
                          setPage(1);
                          setIsSortOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-[14px] hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left font-medium cursor-pointer ${selectedSort === opt ? "text-primary" : "text-slate-700 dark:text-slate-200"
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="card-subtitle text-[13px]">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{sortedClasses.length}</span> classes
          </span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search class or section..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">ID</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Section</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">No of Students</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : paginatedClasses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No classes found.
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((cls) => (
                  <tr
                    key={cls._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-primary">{cls._id.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-bold">{cls.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{cls.section}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-semibold">
                      {getStudentsInClass(cls._id).length}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedClassId(cls._id)}
                        className="px-4 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors shadow-sm border border-[#E2E8F0] dark:border-slate-700 cursor-pointer"
                      >
                        View Dashboard
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-5 border-t border-border flex items-center justify-end gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="card-subtitle px-3 py-1.5 text-[13px] hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-[13px] font-medium flex items-center justify-center ${page === p
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="card-subtitle px-3 py-1.5 text-[13px] hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Class Dashboard Modal */}
      {selectedClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:relative print:inset-auto print:bg-transparent print:p-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-left border border-border print:border-none print:shadow-none print:max-h-none print:overflow-visible">
            {/* Modal Header */}
            <div className="p-5 flex items-center justify-between border-b border-border bg-slate-50/50 dark:bg-slate-800/50 print:hidden">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
                  Class Performance Dashboard: {selectedClass?.name} {selectedClass?.section}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => PrintService.print('printable-area', { pageSize: 'A4' })}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-border text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setSelectedClassId(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer dark:text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0">
              {detailLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Fetching class records...</p>
                </div>
              ) : !classDetail ? (
                <div className="py-20 text-center text-slate-500">Failed to load class dashboard data.</div>
              ) : (
                <div className="space-y-6">
                  {/* Print Title Header */}
                  <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-4 mb-4">
                    <div>
                      <h2 className="section-title">Class Performance & Attendance Summary</h2>
                      <p className="text-xs text-slate-500">Class Room: {classDetail.profile.name} — Section: {classDetail.profile.section}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">Class Teacher: {classDetail.profile.classTeacherName}</p>
                      <p className="text-xs text-slate-500">Total Enrolled: {classDetail.profile.totalStudents} Students</p>
                    </div>
                  </div>

                  {/* 1. Profile banner */}
                  <div className="bg-slate-50 dark:bg-slate-800/30 border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-[13px]">
                    <div>
                      <h4 className="font-bold text-[15px] text-slate-800 dark:text-slate-100">Class {classDetail.profile.name}</h4>
                      <p className="text-slate-500 dark:text-slate-400">Section {classDetail.profile.section} (ID: {classDetail.profile.id.slice(-6).toUpperCase()})</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase font-bold">Class Teacher</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{classDetail.profile.classTeacherName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase font-bold">Enrolled Students</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{classDetail.profile.totalStudents} Active / Capacity {classDetail.profile.capacity}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase font-bold">Boys vs Girls Split</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Boys: {classDetail.demographics.boys} | Girls: {classDetail.demographics.girls}
                      </p>
                    </div>
                  </div>

                  {/* 2. Overall Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Monthly Attendance Rate</span>
                        <Calendar className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="page-title text-emerald-600">{classDetail.monthlyAttendance.rate}%</span>
                        <span className="text-xs text-slate-400 font-medium">({classDetail.monthlyAttendance.workingDays} days marked)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${classDetail.monthlyAttendance.rate}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">Calculated for the current month: {classDetail.monthlyAttendance.month}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Average Test Score</span>
                        <Award className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="page-title text-indigo-600">{classDetail.tests.overallAveragePercentage}%</span>
                        <span className="text-xs text-slate-400 font-medium">({classDetail.tests.totalCreated} scheduled tests)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${classDetail.tests.overallAveragePercentage}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">Cumulative average score across all classroom tests</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Daily Register ({classDetail.dailyAttendance.date})</span>
                        <Users className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="page-title">{classDetail.dailyAttendance.rate}%</span>
                        <span className="text-xs text-slate-400 font-medium">Present today</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>P: {classDetail.dailyAttendance.present}</span>
                        <span>A: {classDetail.dailyAttendance.absent}</span>
                        <span>L: {classDetail.dailyAttendance.late}</span>
                        <span>LV: {classDetail.dailyAttendance.leave}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Modal Menu selection */}
                  <div className="border-b border-border flex gap-1 print:hidden">
                    {[
                      { id: "overview", label: "Class Overview" },
                      { id: "roster", label: "Student Roster" },
                      { id: "tests", label: "Assessments Performance" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === t.id
                            ? "border-primary text-primary"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}

                  {/* T1. Class Overview & stats (Default page print content) */}
                  {(activeTab === "overview" || typeof window !== "undefined" && window.matchMedia && window.matchMedia("print").matches) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-1">
                      {/* Attendance Card */}
                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm text-left">
                        <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-2.5 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-500" /> Daily Attendance Settings
                        </h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Selected Date for Attendance Status Check:</span>
                            <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="px-2.5 py-1.5 border border-border rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-border">
                              <span className="text-[20px] font-bold text-slate-900 dark:text-white">{classDetail.dailyAttendance.present}</span>
                              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">Present Today</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-border">
                              <span className="text-[20px] font-bold text-rose-600">{classDetail.dailyAttendance.absent}</span>
                              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">Absent Today</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Class performance brief */}
                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm text-left">
                        <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-2.5 mb-3 flex items-center gap-2">
                          <Award className="w-4 h-4 text-indigo-500" /> Assessment Standings
                        </h4>
                        <div className="space-y-3.5">
                          {classDetail.tests.list.length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">No assessments found for this class.</p>
                          ) : (
                            classDetail.tests.list.slice(0, 4).map((t: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <div>
                                  <p className="font-bold text-slate-700 dark:text-slate-200">{t.title}</p>
                                  <span className="text-[10px] text-slate-400 font-medium">{t.subject} • {t.testDate ? new Date(t.testDate).toLocaleDateString("en-GB") : ""}</span>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">Avg: {t.averageScore} / {t.totalMarks} ({t.averagePercentage}%)</p>
                                  <p className="text-[10px] text-emerald-600 font-bold">Pass Rate: {t.passRate}%</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* T2. Student Roster list */}
                  {activeTab === "roster" && (
                    <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="erp-table text-[13px] whitespace-nowrap">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-border">
                            <tr>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Admission No</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Name</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Gender</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Guardian</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">DOB</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {modalStudents.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No students found.</td>
                              </tr>
                            ) : (
                              modalStudents.map((s) => (
                                <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-primary">{s.admission_no || s._id.slice(-6).toUpperCase()}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.roll_no || "—"}</td>
                                  <td className="px-5 py-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] flex-shrink-0">
                                        {s.name.charAt(0)}
                                      </div>
                                      <span className="font-semibold text-foreground dark:text-slate-100">{s.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 capitalize">{s.gender || "—"}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.guardian_name || "—"}</td>
                                  <td className="px-5 py-3 text-slate-500">
                                    {s.dob ? new Date(s.dob).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-5 py-3">
                                    {s.is_active ? (
                                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">Active</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700">Inactive</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* T3. Class Test Performance list */}
                  {activeTab === "tests" && (
                    <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="erp-table text-[13px] whitespace-nowrap">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-border">
                            <tr>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Assessment Name</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Subject</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Date Scheduled</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Total Marks</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Class Average</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Pass Rate (%)</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {classDetail.tests.list.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No scheduled tests found.</td>
                              </tr>
                            ) : (
                              classDetail.tests.list.map((t: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{t.title}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{t.subject}</td>
                                  <td className="px-5 py-3 text-slate-500 font-sans">
                                    {t.testDate ? new Date(t.testDate).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-bold">{t.totalMarks}</td>
                                  <td className="px-5 py-3 text-slate-800 dark:text-slate-100 font-bold font-sans">
                                    {t.averageScore} ({t.averagePercentage}%)
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${t.passRate >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                      }`}>
                                      {t.passRate}% Pass
                                    </span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 capitalize">
                                      {t.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-800/50 flex justify-end print:hidden">
              <button
                onClick={() => setSelectedClassId(null)}
                className="px-5 py-2.5 bg-primary text-white text-[13px] font-bold rounded-lg cursor-pointer hover:bg-primary/95 transition-colors"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
