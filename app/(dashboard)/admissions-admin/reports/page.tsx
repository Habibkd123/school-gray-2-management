"use client";

import React, { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  BarChart2, FileText, Loader2, RefreshCw, PieChart, TrendingUp, Calendar, BookOpen
} from "lucide-react";

interface ClassReport {
  className: string;
  total: number;
  newApps: number;
  approved: number;
  rejected: number;
  pending: number;
}

export default function AdmissionsReportsPage() {
  const [loading, setLoading] = useState(true);
  const [classReports, setClassReports] = useState<ClassReport[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admissions?limit=1000", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        const apps: any[] = json.data;
        setTotalApps(apps.length);

        // Group by Status
        const statusMap: Record<string, number> = {};
        apps.forEach(a => {
          statusMap[a.status] = (statusMap[a.status] || 0) + 1;
        });
        setStatusCounts(statusMap);

        // Group by Class
        const classMap: Record<string, ClassReport> = {};
        apps.forEach(a => {
          const className = a.class_id?.name || "Unassigned Class";
          if (!classMap[className]) {
            classMap[className] = {
              className,
              total: 0,
              newApps: 0,
              approved: 0,
              rejected: 0,
              pending: 0,
            };
          }

          classMap[className].total++;
          if (a.status === "New") classMap[className].newApps++;
          else if (a.status === "Approved" || a.status === "Admission Completed") classMap[className].approved++;
          else if (a.status === "Rejected") classMap[className].rejected++;
          else classMap[className].pending++;
        });

        setClassReports(Object.values(classMap).sort((a, b) => b.total - a.total));

        const approvedCount = apps.filter(a => a.status === "Approved" || a.status === "Admission Completed").length;
        setConversionRate(apps.length > 0 ? Math.round((approvedCount / apps.length) * 100) : 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admissions Conversion Reports</h1>
          <p className="text-[12px] text-slate-500 mt-1 font-normal">Analyze online admissions funnels, conversion rates, and class workloads</p>
        </div>
        <button
          onClick={fetchReportData}
          className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span>Loading admissions reports...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Panel */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-6 lg:col-span-1">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-border flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" /> Conversion Funnel Summary
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-border rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Submissions</span>
                <span className="section-title block mt-1">{totalApps}</span>
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <span className="text-[11px] font-bold text-emerald-600/70 dark:text-emerald-500 uppercase tracking-wide">Approved Enrollments</span>
                <span className="section-title text-emerald-500 block mt-1">
                  {(statusCounts["Approved"] || 0) + (statusCounts["Admission Completed"] || 0)}
                </span>
              </div>

              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-500/70 uppercase tracking-wide">Conversion Rate</span>
                <span className="section-title text-indigo-500 block mt-1 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" /> {conversionRate}%
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Distribution</h3>
              <div className="space-y-2 text-[13px]">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center py-1">
                    <span className="text-slate-655 dark:text-slate-400 font-semibold">{status}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Class breakdown report */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-border flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Class-wise Applications Workloads
            </h2>

            {classReports.length === 0 ? (
              <div className="py-16 text-center text-slate-400">No data found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-2">Class Name</th>
                      <th className="py-3 px-2 text-center">Total</th>
                      <th className="py-3 px-2 text-center">New</th>
                      <th className="py-3 px-2 text-center">Approved</th>
                      <th className="py-3 px-2 text-center">Rejected</th>
                      <th className="py-3 px-2 text-center">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-[13px]">
                    {classReports.map(r => (
                      <tr key={r.className} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="py-3.5 px-2 font-bold text-slate-800 dark:text-slate-250">
                          {r.className}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-slate-900 dark:text-white">
                          {r.total}
                        </td>
                        <td className="py-3.5 px-2 text-center text-blue-500 font-bold">
                          {r.newApps}
                        </td>
                        <td className="py-3.5 px-2 text-center text-emerald-505 font-bold">
                          {r.approved}
                        </td>
                        <td className="py-3.5 px-2 text-center text-rose-500 font-bold">
                          {r.rejected}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-500 font-semibold">
                          {r.pending}
                        </td>
                      </tr>
                    ))}
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
