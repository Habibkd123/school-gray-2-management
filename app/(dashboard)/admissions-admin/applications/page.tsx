"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils/session";
import { useClasses } from "@/app/hooks/useClasses";
import { PaginationBar } from "@/app/components/ui/pagination-bar";
import {
  Search, Filter, Eye, Trash2, Calendar, ClipboardList, Loader2,
  RefreshCw, ChevronDown, CheckCircle, XCircle, AlertCircle
} from "lucide-react";

interface Application {
  _id: string;
  application_no: string;
  student_name?: string;
  first_name: string;
  last_name: string;
  class_id?: { _id: string; name: string; section?: string };
  guardian_name?: string;
  phone: string;
  email?: string;
  submission_date: string;
  status: string;
  academic_year: string;
}

const STATUSES = [
  "New", "Under Review", "Documents Pending", "Interview Scheduled", "Approved", "Rejected", "Admission Completed", "Cancelled"
];

export default function ApplicationsListPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const isInitialLoad = React.useRef(true);
  useEffect(() => {
    if (!loading && isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [loading]);

  const { classes } = useClasses();

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        search: search.trim(),
        status: statusFilter,
        class_id: classFilter,
        academic_year: academicYearFilter,
      });

      const res = await fetch(`/api/admissions?${params}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setApps(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.pages || 1);
          setTotalItems(json.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, classFilter, academicYearFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admissions/${deleteId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Application deleted successfully", "success");
        fetchApplications();
      } else {
        showToast(json.message || "Failed to delete", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const selectClass = "px-3 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] font-medium outline-none appearance-none pr-8 cursor-pointer text-slate-700 dark:text-slate-200 w-full sm:w-44";

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-[80] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold transition-all ${
          toast.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Delete dialog */}
      {deleteId && (
        <>
          <div className="fixed inset-0 bg-slate-950/60 z-[60] backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[70] p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Delete Admission Application?</h2>
            <p className="card-subtitle text-[13px] mb-6">This will delete all application notes and uploaded document records.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2.5 bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-2">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete Application
              </button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admission Applications</h1>
          <p className="text-[12px] text-slate-500 mt-1 font-normal">Review and process student online submissions</p>
        </div>
        <button
          onClick={fetchApplications}
          className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm text-left">
        {/* Filters */}
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Academic Year */}
            <div className="relative">
              <select value={academicYearFilter} onChange={handleFilterChange(setAcademicYearFilter)} className={selectClass}>
                <option value="all">All Academic Years</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-450 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            {/* Class */}
            <div className="relative">
              <select value={classFilter} onChange={handleFilterChange(setClassFilter)} className={selectClass}>
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-450 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            {/* Status */}
            <div className="relative">
              <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} className={selectClass}>
                <option value="all">All Statuses</option>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-450 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search applications..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Data list */}
        <div className={`relative transition-opacity duration-200 ${loading && !isInitialLoad.current ? "opacity-60 pointer-events-none" : ""}`}>
          {loading && !isInitialLoad.current && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-border shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Syncing...</span>
            </div>
          )}

          {loading && isInitialLoad.current ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span>Loading applications list...</span>
            </div>
          ) : apps.length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-border rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <ClipboardList className="w-8 h-8" />
              </div>
              <p className="text-[14px] font-bold text-slate-700 dark:text-slate-350">No applications registered</p>
              <p className="text-[12px] text-slate-400 max-w-[260px] mx-auto">Please adjust your search queries or select another status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">App Number</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Applied Class</th>
                  <th className="px-5 py-3.5">Guardian Details</th>
                  <th className="px-5 py-3.5">Submission Date</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[13.5px]">
                {apps.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-5 py-4 font-mono font-bold text-primary">
                      {r.application_no}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-100">
                      {r.student_name || `${r.first_name} ${r.last_name}`.trim()}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      {r.class_id ? `${r.class_id.name}${r.class_id.section ? ` - ${r.class_id.section}` : ""}` : "Unassigned"}
                    </td>
                    <td className="px-5 py-4 text-slate-655 dark:text-slate-400">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">{r.guardian_name || "—"}</div>
                      <div className="text-[11px] mt-0.5">{r.phone}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(r.submission_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        r.status === "New" ? "bg-blue-500/10 text-blue-500" :
                        r.status === "Approved" || r.status === "Admission Completed" ? "bg-emerald-500/10 text-emerald-500" :
                        r.status === "Rejected" ? "bg-rose-500/10 text-rose-500" :
                        "bg-slate-500/10 text-slate-500"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admissions-admin/applications/${r._id}`}
                          className="p-1.5 border border-border bg-white dark:bg-slate-900 rounded-lg hover:text-primary transition-colors cursor-pointer text-slate-500"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteId(r._id)}
                          className="p-1.5 border border-border bg-white dark:bg-slate-900 rounded-lg hover:text-rose-600 transition-colors cursor-pointer text-slate-550"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            className="rounded-b-2xl border-t border-border"
          />
        )}
      </div>
    </div>
  );
}
