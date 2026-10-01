"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart2, FileText, Loader2, RefreshCw, PieChart, TrendingUp,
  BookOpen, Download, Printer, Search, ArrowUpDown, CheckCircle,
  Clock, AlertTriangle, XCircle, ArrowRight
} from "lucide-react";
import { useAdmissionsReports, ClassReport } from "@/app/hooks/useAdmissionsReports";

type SortOption = "total-desc" | "rate-desc" | "approved-desc" | "name-asc";

const STATUS_COLOR_CONFIG: Record<string, { bg: string; text: string; bar: string }> = {
  "New": { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" },
  "Approved": { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  "Admission Completed": { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  "Under Review": { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  "Documents Pending": { bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500" },
  "Interview Scheduled": { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400", bar: "bg-indigo-500" },
  "Rejected": { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500" },
  "Cancelled": { bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", bar: "bg-slate-400" },
};

export default function AdmissionsReportsPage() {
  const {
    totalApps,
    statusCounts,
    classReports,
    conversionRate,
    isLoading,
    isRefreshing,
    refetch,
  } = useAdmissionsReports();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("total-desc");

  // Approved count calculation
  const approvedTotal = (statusCounts["Approved"] || 0) + (statusCounts["Admission Completed"] || 0);
  const pendingTotal = (statusCounts["Under Review"] || 0) + (statusCounts["Documents Pending"] || 0) + (statusCounts["Interview Scheduled"] || 0);
  const rejectedTotal = (statusCounts["Rejected"] || 0) + (statusCounts["Cancelled"] || 0);

  // Filtered & Sorted class reports (memoized for fast client-side responsiveness)
  const filteredAndSortedReports = useMemo(() => {
    let result = [...classReports];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r => r.className.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortBy === "total-desc") return b.total - a.total;
      if (sortBy === "rate-desc") return b.conversionRate - a.conversionRate;
      if (sortBy === "approved-desc") return b.approved - a.approved;
      if (sortBy === "name-asc") return a.className.localeCompare(b.className);
      return 0;
    });

    return result;
  }, [classReports, searchTerm, sortBy]);

  // Export to CSV
  const handleExportCSV = () => {
    if (classReports.length === 0) return;

    const headers = ["Class Name", "Total Applications", "New", "Approved", "Rejected", "Pending", "Conversion Rate (%)"];
    const rows = filteredAndSortedReports.map(r => [
      `"${r.className.replace(/"/g, '""')}"`,
      r.total,
      r.newApps,
      r.approved,
      r.rejected,
      r.pending,
      `${r.conversionRate}%`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admissions_class_workloads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left print:bg-white print:m-0 print:p-0">
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-primary" />
            Admissions Conversion Reports
          </h1>
          <p className="text-[12px] text-slate-500 mt-1 font-normal">
            Analyze online admissions funnels, conversion rates, and class workloads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch(true)}
            disabled={isRefreshing}
            className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center relative hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={classReports.length === 0}
            className="btn btn-outline flex items-center gap-1.5 text-xs py-2 px-3 text-slate-700 dark:text-slate-200"
            title="Export as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn btn-outline flex items-center gap-1.5 text-xs py-2 px-3 text-slate-700 dark:text-slate-200"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Printable Heading only visible in print view */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Admissions Conversion Report</h1>
        <p className="text-sm text-slate-600">Generated on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading admissions reports...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Panel (Left) */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-6 lg:col-span-1 print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" /> Conversion Funnel Summary
              </h2>
              {isRefreshing && (
                <span className="text-[11px] font-medium text-primary flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
                </span>
              )}
            </div>

            {/* KPI Cards */}
            <div className="space-y-3.5">
              <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-border rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Submissions</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{totalApps}</span>
                  <Link
                    href="/admissions-admin/applications"
                    className="text-[11.5px] font-semibold text-primary hover:underline flex items-center gap-0.5 print:hidden"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Approved Enrollments</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {approvedTotal}
                  </span>
                  <span className="text-[11.5px] font-bold text-emerald-600/80 dark:text-emerald-400/80">
                    {totalApps > 0 ? Math.round((approvedTotal / totalApps) * 100) : 0}% of total
                  </span>
                </div>
              </div>

              <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Conversion Rate</span>
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                    {conversionRate}%
                  </span>
                  <span className="text-[11px] text-slate-500">Overall lead conversion</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, conversionRate))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Status Breakdown Section */}
            <div className="space-y-3.5 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Distribution</h3>
                <span className="text-[11px] text-slate-400 font-semibold">{Object.keys(statusCounts).length} stages</span>
              </div>

              {Object.keys(statusCounts).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No status data available</div>
              ) : (
                <div className="space-y-2.5 text-[13px]">
                  {Object.entries(statusCounts).map(([status, count]) => {
                    const cfg = STATUS_COLOR_CONFIG[status] || { bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", bar: "bg-slate-400" };
                    const pct = totalApps > 0 ? Math.round((count / totalApps) * 100) : 0;
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between items-center text-[12.5px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${cfg.bar}`} />
                            {status}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-medium">{pct}%</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 min-w-[24px] text-right">{count}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${cfg.bar}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Class breakdown report (Right) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
            {/* Top bar with Search and Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Class-wise Applications Workloads
                <span className="text-xs font-normal text-slate-400">({filteredAndSortedReports.length})</span>
              </h2>

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search class..."
                    className="w-36 sm:w-44 pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort class reports"
                    className="py-1.5 px-2 text-xs rounded-lg border border-border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="total-desc">Most Applications</option>
                    <option value="rate-desc">Highest Conversion</option>
                    <option value="approved-desc">Most Approved</option>
                    <option value="name-asc">Class Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredAndSortedReports.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {searchTerm ? "No classes match your search query." : "No admissions workload data recorded."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table w-full">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Class Name</th>
                      <th className="py-3 px-2 text-center">Total</th>
                      <th className="py-3 px-2 text-center">New</th>
                      <th className="py-3 px-2 text-center">Approved</th>
                      <th className="py-3 px-2 text-center">Rejected</th>
                      <th className="py-3 px-2 text-center">Pending</th>
                      <th className="py-3 px-2 text-center">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-[13px]">
                    {filteredAndSortedReports.map((r) => {
                      const rate = r.conversionRate;
                      const rateBadgeClass =
                        rate >= 60
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : rate >= 30
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20";

                      return (
                        <tr key={r.className} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {r.className}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-900 dark:text-white">
                            {r.total}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-blue-600 dark:text-blue-400">
                            {r.newApps}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {r.approved}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-rose-500 dark:text-rose-400">
                            {r.rejected}
                          </td>
                          <td className="py-3 px-2 text-center font-semibold text-slate-500 dark:text-slate-400">
                            {r.pending}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${rateBadgeClass}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
