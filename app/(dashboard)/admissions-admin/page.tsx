"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  ClipboardList, CheckCircle, XCircle, AlertCircle, Calendar, Users,
  TrendingUp, ArrowRight, Loader2, RefreshCw, BarChart2
} from "lucide-react";

interface Stats {
  total: number;
  newApps: number;
  approved: number;
  rejected: number;
  review: number;
  today: number;
  thisMonth: number;
  rate: number;
}

interface RecentApp {
  _id: string;
  application_no: string;
  student_name?: string;
  first_name: string;
  last_name: string;
  class_id?: { name: string; section?: string };
  guardian_name?: string;
  phone: string;
  submission_date: string;
  status: string;
}

export default function AdmissionsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recents, setRecents] = useState<RecentApp[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all admissions to compute stats dynamically
      const res = await fetch("/api/admissions?limit=1000", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        const apps: any[] = json.data;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const total = apps.length;
        const newApps = apps.filter(a => a.status === "New").length;
        const approved = apps.filter(a => a.status === "Approved" || a.status === "Admission Completed").length;
        const rejected = apps.filter(a => a.status === "Rejected").length;
        const review = apps.filter(a => a.status === "Under Review" || a.status === "Documents Pending" || a.status === "Interview Scheduled").length;

        const today = apps.filter(a => new Date(a.submission_date).getTime() >= startOfToday).length;
        const thisMonth = apps.filter(a => new Date(a.submission_date).getTime() >= startOfMonth).length;
        const rate = total > 0 ? Math.round((approved / total) * 100) : 0;

        setStats({ total, newApps, approved, rejected, review, today, thisMonth, rate });
        setRecents(apps.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const cardStyle = "bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 text-left";

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admissions Dashboard</h1>
          <p className="text-[12px] text-slate-500 mt-1 font-normal">Manage and track student admissions enquiries and applications</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="btn btn-outline flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span>Loading admissions dashboard...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className={cardStyle}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h3 className="section-title leading-none">{stats?.total}</h3>
                <p className="card-subtitle text-[13px] mt-1.5">Total Applications</p>
              </div>
            </div>

            <div className={cardStyle}>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="section-title leading-none">{stats?.newApps}</h3>
                <p className="card-subtitle text-[13px] mt-1.5">New Applications</p>
              </div>
            </div>

            <div className={cardStyle}>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="section-title leading-none">{stats?.approved}</h3>
                <p className="card-subtitle text-[13px] mt-1.5">Approved / Enrolled</p>
              </div>
            </div>

            <div className={cardStyle}>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="section-title leading-none">{stats?.rejected}</h3>
                <p className="card-subtitle text-[13px] mt-1.5">Rejected</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className={cardStyle}>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="section-title leading-none">{stats?.today}</h3>
                <p className="card-subtitle text-[13px] mt-1.5">Today&apos;s Applications</p>
              </div>
            </div>

            <div className={cardStyle}>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="section-title leading-none">{stats?.thisMonth}</h3>
                <p className="card-subtitle text-[13px] mt-1.5">Submitted This Month</p>
              </div>
            </div>

            <div className={cardStyle}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="section-title leading-none">{stats?.rate}%</h3>
                <p className="card-subtitle text-[13px] mt-1.5">Admission Rate</p>
              </div>
            </div>

            <div className={cardStyle}>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="section-title leading-none">{stats?.review}</h3>
                <p className="card-subtitle text-[13px] mt-1.5">Pending Review</p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recents */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Recent Applications</h2>
                <Link href="/admissions-admin/applications" className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No applications registered yet.</div>
              ) : (
                <div className="erp-table-wrap overflow-x-auto">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>App No</th>
                        <th>Student</th>
                        <th>Applying Class</th>
                        <th>Guardian Phone</th>
                        <th className="col-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recents.map(r => (
                        <tr key={r._id}>
                          <td className="font-mono font-bold text-primary">
                            <Link href={`/admissions-admin/applications/${r._id}`} className="hover:underline">
                              {r.application_no}
                            </Link>
                          </td>
                          <td className="font-bold text-slate-800 dark:text-slate-250">
                            {r.student_name || `${r.first_name} ${r.last_name}`.trim()}
                          </td>
                          <td className="text-slate-600 dark:text-slate-350">
                            {r.class_id?.name || "Unassigned"}
                          </td>
                          <td className="text-slate-600 dark:text-slate-400">
                            {r.phone}
                          </td>
                          <td className="col-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase ${
                              r.status === "New" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              r.status === "Approved" || r.status === "Admission Completed" ? "bg-emerald-50 text-emerald-705 border-emerald-205" :
                              r.status === "Rejected" ? "bg-rose-50 text-rose-705 border-rose-205" :
                              "bg-slate-50 text-slate-705 border-slate-205"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-border">
                Quick Shortcuts
              </h2>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: "View Applications list", href: "/admissions-admin/applications", color: "hover:bg-primary/5 border-primary/20 text-primary" },
                  { label: "Verify Uploaded Documents", href: "/admissions-admin/documents", color: "hover:bg-indigo-505/5 border-indigo-500/20 text-indigo-500" },
                  { label: "Configure Admissions Settings", href: "/admissions-admin/settings", color: "hover:bg-amber-500/5 border-amber-500/20 text-amber-500" },
                  { label: "Admission Conversion Reports", href: "/admissions-admin/reports", color: "hover:bg-teal-500/5 border-teal-500/20 text-teal-500" },
                  { label: "Apply Online (Public Form)", href: "/admissions/apply", color: "hover:bg-blue-500/5 border-blue-500/20 text-blue-500" },
                ].map((s, idx) => (
                  <Link
                    key={idx}
                    href={s.href}
                    className={`p-3.5 border rounded-xl text-[13px] font-bold transition-all text-center block ${s.color}`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
