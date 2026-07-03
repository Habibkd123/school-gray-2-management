"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCcw, Building2, CheckCircle2, X, ArrowRight, Plus, Loader2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface SuperAdminDashboardProps {
  user: any;
}

export default function SuperAdminDashboard({ user }: SuperAdminDashboardProps) {
  const [superAdminSchools, setSuperAdminSchools] = useState<any[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  useEffect(() => {
    setLoadingSchools(true);
    fetch("/api/schools", { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuperAdminSchools(data.data || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingSchools(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="relative overflow-hidden rounded-xl text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-left card-shadow"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="relative z-10">
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            Welcome Back, {user?.name || "Super Admin"}
            <span className="bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              Super Admin
            </span>
          </h2>
          <p className="text-[13px] text-slate-300 mt-2">
            Manage all registered school institutions and access system configurations.
          </p>
        </div>
        <div className="relative z-10 mt-4 md:mt-0 flex items-center gap-1.5 text-[12px] text-slate-300 bg-black/20 px-4 py-2 rounded-lg border border-white/5">
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>System Status: Online</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {loadingSchools ? "..." : superAdminSchools.length}
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Total Schools</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {loadingSchools ? "..." : superAdminSchools.filter((s) => s.is_active).length}
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Active Institutions</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <X className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {loadingSchools ? "..." : superAdminSchools.filter((s) => !s.is_active).length}
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Inactive / Suspended</p>
          </div>
        </div>
      </div>

      {/* Grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Recent Schools list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Recent Schools</h3>
            <Link
              href="/schools"
              className="text-[12px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingSchools ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Loading schools list...</span>
            </div>
          ) : superAdminSchools.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <p className="text-sm font-medium">No registered schools found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">School</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Slug</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {superAdminSchools.slice(0, 5).map((school: any) => (
                    <tr key={school._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3 text-[13.5px] font-bold text-slate-900 dark:text-white">{school.name}</td>
                      <td className="px-5 py-3 text-[12.5px] font-semibold text-amber-600 dark:text-amber-400">{school.slug}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            school.is_active ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
                          }`}
                        >
                          {school.is_active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href="/schools"
                          className="text-[12px] font-semibold text-slate-500 hover:text-amber-500 underline dark:text-slate-400"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick action card */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-3">Quick Controls</h3>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Use the management panel to add new schools, update details, or temporarily suspend access for any school in the network.
            </p>

            <div className="space-y-3">
              <Link
                href="/schools"
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer text-slate-700 dark:text-slate-200 text-sm font-semibold"
              >
                <span>Add New Campus</span>
                <Plus className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/schools"
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer text-slate-700 dark:text-slate-200 text-sm font-semibold"
              >
                <span>Manage Institutions</span>
                <Building2 className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-border/50 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Database Server: Connected
          </div>
        </div>
      </div>
    </div>
  );
}
