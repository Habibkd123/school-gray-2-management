"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, RefreshCw, Printer, Download, FileText, ChevronDown, Loader2
} from "lucide-react";
import { useClasses } from "../../../hooks/useClasses";
import { getAuthHeaders } from "@/lib/utils/session";
import ReportTabs from "../ReportTabs";
import { PrintService } from "@/app/lib/print-service";

interface MonthlyClassStat {
  classId: string;
  className: string;
  section: string;
  studentCount: number;
  workingDays: number;
  averagePresent: number;
  averageAbsent: number;
  rate: number;
}

export default function AttendanceReportPage() {
  const { classes } = useClasses();
  const [stats, setStats] = useState<MonthlyClassStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterClass, setFilterClass] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/attendance?type=monthly&month=${filterMonth}`,
        { headers: getAuthHeaders() }
      );
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [filterMonth]);

  const filteredStats = useMemo(() => {
    return stats.filter((s) => {
      const matchSearch =
        s.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.section.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = !filterClass || s.classId === filterClass;
      return matchSearch && matchClass;
    });
  }, [stats, searchTerm, filterClass]);

  const paginatedStats = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredStats.slice(start, start + PAGE_SIZE);
  }, [filteredStats, page]);

  const totalPages = Math.ceil(filteredStats.length / PAGE_SIZE);

  const handleExport = (format: "csv" | "excel") => {
    if (filteredStats.length === 0) {
      alert("No data available to export");
      return;
    }
    const headers = [
      "Class",
      "Section",
      "Total Students",
      "Working Days",
      "Avg Present",
      "Avg Absent",
      "Overall Rate"
    ];
    const rows = filteredStats.map((s) => [
      s.className,
      s.section,
      s.studentCount,
      s.workingDays,
      s.averagePresent,
      s.averageAbsent,
      `${s.rate}%`
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
      `monthly_attendance_report_${filterMonth}.${format === "csv" ? "csv" : "xls"}`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <ReportTabs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Monthly Attendance Report</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Monthly Attendance</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchStats}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* <button
            onClick={() => PrintService.print('printable-area', { pageSize: 'A4' })}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"
          >
            <Printer className="w-4 h-4" />
          </button> */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
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
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF/CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
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
            <select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}{c.section ? ` - ${c.section}` : ""}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            />
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="card-subtitle text-[13px]">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredStats.length}</span> classes
          </span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search class..."
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
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                {/* <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Section</th> */}
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total Students</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Working Days</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Avg Present</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Avg Absent</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Overall Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : paginatedStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No stats found.
                  </td>
                </tr>
              ) : (
                paginatedStats.map((s) => (
                  <tr
                    key={s.classId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-foreground dark:text-slate-100">
                      {s.className}{s.section ? ` - ${s.section}` : ""}
                    </td>
                    {/* <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.section}</td> */}
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.studentCount}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.workingDays}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">{s.averagePresent}</td>
                    <td className="px-6 py-4 text-rose-600 font-medium">{s.averageAbsent}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${s.rate}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{s.rate}%</span>
                      </div>
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
    </div>
  );
}
