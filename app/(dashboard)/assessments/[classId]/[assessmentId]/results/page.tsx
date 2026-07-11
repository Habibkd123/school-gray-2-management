"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  ArrowLeft, Search, Filter, Download, Printer, Loader2,
  CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Trophy,
} from "lucide-react";
import { PrintService } from "@/app/lib/print-service";
interface ResultRow {
  mark_id: string;
  student_id: string;
  name: string;
  roll_no: string;
  admission_no: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  is_pass: boolean;
  rank: number | null;
  remarks: string;
}

export default function ResultsPage({ params }: { params: Promise<{ classId: string; assessmentId: string }> }) {
  const { classId, assessmentId } = React.use(params);
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin";
  const isTeacher = user?.role === "teacher";

  const [test, setTest] = useState<any>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const params_ = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params_.set("search", search);
      if (filter !== "all") params_.set("filter", filter);

      const res = await fetch(`/api/assessments/${assessmentId}/results?${params_}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setTest(data.data.test);
        setRows(data.data.rows);
        setTotalPages(data.data.pagination.pages || 1);
        setTotalCount(data.data.pagination.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId, page, search, filter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);
  useEffect(() => { setPage(1); }, [search, filter]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/export`, { headers: getAuthHeaders() });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${test?.title || "results"}_results.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => PrintService.print('printable-area', { pageSize: 'A4' });

  const passCount = rows.filter((r) => r.is_pass).length;
  const failCount = rows.filter((r) => !r.is_pass).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:max-w-none">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Test Results
          </h1>
          {test && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {test.title} · {new Date(test.test_date).toLocaleDateString("en-IN")}
              {test.is_published ? (
                <span className="ml-2 text-emerald-500 font-medium">✓ Published</span>
              ) : (
                <span className="ml-2 text-amber-500 font-medium">⚠ Not Published</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || isTeacher) && (
            <button onClick={handleExport} disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60">
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export Excel
            </button>
          )}
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-lg font-bold">{test?.title} — Results</h2>
        <p className="text-sm text-gray-500">Date: {test ? new Date(test.test_date).toLocaleDateString("en-IN") : ""} | Total Marks: {test?.total_marks}</p>
      </div>

      {/* Summary */}
      {test && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-4 shadow-sm text-center">
            <p className="text-[24px] font-bold text-slate-900 dark:text-slate-100">{totalCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Total Appeared</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-[24px] font-bold text-emerald-600 dark:text-emerald-400">{passCount}</p>
            <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Passed</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 text-center">
            <p className="text-[24px] font-bold text-rose-600 dark:text-rose-400">{failCount}</p>
            <p className="text-[11px] text-rose-600/70 dark:text-rose-400/70 mt-0.5">Failed</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center print:hidden">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or roll no..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-[13px] outline-none focus:border-primary transition-colors"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-[13px] outline-none cursor-pointer">
          <option value="all">All Students</option>
          <option value="pass">Pass Only</option>
          <option value="fail">Fail Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl overflow-hidden shadow-sm print:shadow-none print:border-gray-300">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">
              {search || filter !== "all" ? "No results match your filters" : "No results entered yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/30 print:bg-gray-50">
                  {["Rank", "Roll No", "Student Name", "Marks Obtained", "Total", "Percentage", "Result", "Remarks"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.mark_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      {r.rank ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold ${
                          r.rank === 1 ? "bg-amber-100 text-amber-600" :
                          r.rank === 2 ? "bg-slate-100 text-slate-600" :
                          r.rank === 3 ? "bg-orange-100 text-orange-600" :
                          "bg-slate-50 text-slate-500"
                        }`}>{r.rank}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500 dark:text-slate-400">{r.roll_no}</td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{r.name}</p>
                      <p className="text-[11px] text-slate-400">{r.admission_no}</p>
                    </td>
                    <td className="px-4 py-3 text-[14px] font-bold text-slate-900 dark:text-slate-100">{r.marks_obtained}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">{r.total_marks}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[13px] font-semibold ${r.percentage >= 75 ? "text-emerald-600" : r.percentage >= 35 ? "text-amber-600" : "text-rose-600"}`}>
                        {r.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        r.is_pass
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}>
                        {r.is_pass ? "✓ Pass" : "✗ Fail"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-400">{r.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-slate-50/30 dark:bg-slate-800/20 print:hidden">
            <p className="text-[12px] text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
