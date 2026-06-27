"use client";

import React, { useState, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2
} from "lucide-react";
import { useLeave } from "../../../hooks/useLeave";
import { useStudents } from "../../../hooks/useStudents";
import { useTeachers } from "../../../hooks/useTeachers";

export default function LeaveReportPage() {
  const { leaveRequests, loading } = useLeave();
  const { students } = useStudents();
  const { teachers } = useTeachers();

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const getUserDetails = (userId: string, populatedUser?: any) => {
    const student = students.find(s => {
      const sUid = typeof s.user_id === "object" && s.user_id ? s.user_id._id : s.user_id;
      return sUid === userId || s._id === userId;
    });
    if (student) return { name: student.name, role: "Student", id: student.admission_no || student._id.slice(-6).toUpperCase() };

    const teacher = teachers.find(t => {
      const tUid = typeof t.user_id === "object" && t.user_id ? t.user_id._id : t.user_id;
      return tUid === userId || t._id === userId;
    });
    if (teacher) return { name: teacher.name, role: "Teacher", id: teacher.employee_id || teacher._id.slice(-6).toUpperCase() };

    if (populatedUser && typeof populatedUser === "object") {
      const displayRole = populatedUser.role === "student" ? "Student" : populatedUser.role === "teacher" ? "Teacher" : populatedUser.role === "school_admin" ? "Admin" : populatedUser.role;
      return {
        name: populatedUser.name || "Unknown",
        role: displayRole || "—",
        id: userId.slice(-6).toUpperCase()
      };
    }
    return { name: "Unknown", role: "—", id: userId.slice(-6).toUpperCase() };
  };

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => {
      const uid = typeof l.user_id === "object" && l.user_id ? (l.user_id as any)._id : l.user_id;
      const user = getUserDetails(uid, l.user_id);
      const matchSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = !filterType || l.leave_type === filterType;
      const matchStatus = !filterStatus || l.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [leaveRequests, searchTerm, filterType, filterStatus, students, teachers]);

  const stats = {
    total: leaveRequests.length,
    approved: leaveRequests.filter(l => l.status === "approved").length,
    pending: leaveRequests.filter(l => l.status === "pending").length,
    rejected: leaveRequests.filter(l => l.status === "rejected").length,
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Leave Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-[#1E3A5F] cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Leave Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-[#1E3A5F] transition-colors shadow-sm cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-[#1E3A5F] transition-colors shadow-sm cursor-pointer"><Printer className="w-4 h-4" /></button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500" /> Export as PDF</button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500" /> Export as Excel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1  sm:grid-cols-4 gap-3">
        {[
          { label: "Total Requests", value: stats.total, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Approved", value: stats.approved, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Pending", value: stats.pending, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Rejected", value: stats.rejected, color: "text-rose-600 bg-rose-50 border-rose-100" },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm">
            <p className={`text-xl font-bold border rounded-lg px-3 py-1.5 inline-block mb-2 ${card.color}`}>{card.value}</p>
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Leave Report List</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter */}
            <div className="relative">
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
                <Filter className="w-4 h-4 text-slate-400" /> Filter <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl z-50 text-left">
                    <div className="p-4 border-b border-border"><h3 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-100">Filter</h3></div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Leave Type</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 cursor-pointer">
                          <option value="">All Types</option>
                          <option value="sick">Sick Leave</option>
                          <option value="casual">Casual Leave</option>
                          <option value="emergency">Emergency Leave</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 cursor-pointer">
                          <option value="">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 border-t border-border">
                      <button onClick={() => { setFilterType(""); setFilterStatus(""); }} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] text-[13px] font-bold rounded-lg cursor-pointer">Reset</button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-5 py-2.5 bg-[#1E3A5F] text-white text-[13px] font-bold rounded-lg cursor-pointer">Apply</button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Sort */}
            <div className="relative">
              <button onClick={() => setIsSortOpen(!isSortOpen)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
                <List className="w-4 h-4 text-slate-400" /> Sort <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                    {["Newest First", "Oldest First"].map(opt => (
                      <button key={opt} onClick={() => setIsSortOpen(false)} className="w-full px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 text-left font-medium cursor-pointer">{opt}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredLeaves.length}</span> requests</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search applicant…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#1E3A5F] transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Applicant</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Role</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Leave Type</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">From Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">To Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Total Days</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Reason</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredLeaves.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400">No leave requests found.</td></tr>
              ) : filteredLeaves.map(l => {
                const uid = typeof l.user_id === "object" && l.user_id ? (l.user_id as any)._id : l.user_id;
                const user = getUserDetails(uid, l.user_id);
                return (
                  <tr key={l._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] flex-shrink-0">{user.name.charAt(0)}</div>
                        <div>
                          <div className="font-semibold text-[#0F172A] dark:text-slate-100">{user.name}</div>
                          <div className="text-[11px] text-slate-500">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.role}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">{l.leave_type}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{new Date(l.from_date).toLocaleDateString("en-GB")}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{new Date(l.to_date).toLocaleDateString("en-GB")}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-semibold">{l.total_days || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-full sm:w-[200px] truncate" title={l.reason}>{l.reason || "—"}</td>
                    <td className="px-6 py-4">
                      {l.status === "approved" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Approved</span>}
                      {l.status === "pending" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-amber-50 text-amber-600 border border-amber-100"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Pending</span>}
                      {l.status === "rejected" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Rejected</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors">Prev</button>
          <button className="w-7 h-7 rounded-lg bg-[#1E3A5F] text-white text-[13px] font-medium flex items-center justify-center">1</button>
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
}
