"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, RefreshCw, Printer, Download, FileText, Calendar, Loader2, ChevronDown
} from "lucide-react";
import { useClasses } from "../../../hooks/useClasses";
import { getAuthHeaders } from "@/lib/utils/session";
import ReportTabs from "../ReportTabs";
import { PrintService } from "@/app/lib/print-service";

interface DailyClassStat {
  classId: string;
  className: string;
  section: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  halfDay: number;
  isMarked: boolean;
  rate: number;
}

export default function DailyAttendanceReportPage() {
  const { classes } = useClasses();
  const [stats, setStats] = useState<DailyClassStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/attendance?type=daily&date=${selectedDate}`,
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
  }, [selectedDate]);

  const filteredStats = useMemo(() => {
    return stats.filter((s) => {
      const matchSearch =
        s.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.section.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = !filterClass || s.classId === filterClass;
      return matchSearch && matchClass;
    });
  }, [stats, searchTerm, filterClass]);

  const totalStats = useMemo(() => {
    return filteredStats.reduce(
      (acc, s) => {
        acc.total += s.total;
        acc.present += s.present;
        acc.absent += s.absent;
        acc.late += s.late;
        acc.leave += s.leave;
        acc.halfDay += s.halfDay;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0, leave: 0, halfDay: 0 }
    );
  }, [filteredStats]);

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
      "Present",
      "Absent",
      "Late",
      "Leave",
      "Half Day",
      "Present Rate"
    ];
    const rows = filteredStats.map((s) => [
      s.className,
      s.section,
      s.total,
      s.present,
      s.absent,
      s.late,
      s.leave,
      s.halfDay,
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
      `daily_attendance_report_${selectedDate}.${format === "csv" ? "csv" : "xls"}`
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Daily Attendance Report</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Daily Attendance</span>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
        {[
          { label: "Total Students", value: totalStats.total, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Present", value: totalStats.present, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Absent", value: totalStats.absent, color: "text-rose-600 bg-rose-50 border-rose-100" },
          { label: "Leave", value: totalStats.leave, color: "text-violet-600 bg-violet-50 border-violet-100" }
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm">
            <p className={`text-xl font-bold border rounded-lg px-3 py-1.5 inline-block mb-2 ${card.color}`}>
              {card.value}
            </p>
            <p className="card-subtitle text-[13px] font-semibold">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Daily Class Stats</h2>
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
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total Students</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Present</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Absent</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Late</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Leave</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Half Day</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">% Present</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : paginatedStats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
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
                      {s.className} {s.section}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.total}</td>
                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/30 dark:bg-emerald-500/5">
                      {s.present}
                    </td>
                    <td className="px-6 py-4 text-rose-600 dark:text-rose-400 font-bold bg-rose-50/30 dark:bg-rose-500/5">
                      {s.absent}
                    </td>
                    <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-bold bg-amber-50/30 dark:bg-amber-500/5">
                      {s.late}
                    </td>
                    <td className="px-6 py-4 text-violet-600 dark:text-violet-400 font-bold bg-violet-50/30 dark:bg-violet-500/5">
                      {s.leave}
                    </td>
                    <td className="px-6 py-4 text-sky-600 dark:text-sky-400 font-bold bg-sky-50/30 dark:bg-sky-500/5">
                      {s.halfDay}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-[12px] font-bold ${s.rate >= 75
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                          }`}
                      >
                        {s.rate}%
                      </span>
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
