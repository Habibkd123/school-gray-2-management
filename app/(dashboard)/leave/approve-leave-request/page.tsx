"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, MoreVertical, Check, X, Loader2
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { useLeave, ApiLeaveRequest } from "@/app/hooks/useLeave";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";

// ─── Date range presets ───────────────────────────────────────────────────
const DATE_RANGES = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "This Year", "All Time", "Custom Range"] as const;

function getDateRangeDates(range: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (range) {
    case "Today": 
      from.setHours(0, 0, 0, 0); 
      to.setHours(23, 59, 59, 999);
      break;
    case "Yesterday":
      from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1); to.setHours(23, 59, 59, 999);
      break;
    case "Last 7 Days": 
      from.setDate(from.getDate() - 7); 
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "Last 30 Days": 
      from.setDate(from.getDate() - 30); 
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "This Month": 
      from.setDate(1); 
      from.setHours(0, 0, 0, 0); 
      to.setHours(23, 59, 59, 999);
      break;
    case "This Year": 
      from.setMonth(0, 1); 
      from.setHours(0, 0, 0, 0); 
      to.setHours(23, 59, 59, 999);
      break;
    case "All Time":
      return { from: null, to: null };
    default: 
      return { from: null, to: null };
  }
  return { from, to };
}

export default function ApproveLeaveRequestPage() {
  const { leaveRequests, loading, approveLeave, rejectLeave } = useLeave();
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  
  // Date range state
  const [selectedRange, setSelectedRange] = useState("All Time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [activeFrom, setActiveFrom] = useState<Date | null>(null);
  const [activeTo, setActiveTo] = useState<Date | null>(null);

  const applyDateRange = (range: string) => {
    if (range === "Custom Range") { setIsCustom(true); return; }
    setIsCustom(false);
    const { from, to } = getDateRangeDates(range);
    setActiveFrom(from); setActiveTo(to);
    setSelectedRange(range); setIsDateRangeOpen(false);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    setActiveFrom(new Date(customFrom)); setActiveTo(new Date(customTo));
    setSelectedRange(`${customFrom} — ${customTo}`);
    setIsCustom(false); setIsDateRangeOpen(false);
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Ascending");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Filter States
  const [filterLeaveType, setFilterLeaveType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApiLeaveRequest | null>(null);
  const [formStatus, setFormStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  const openApprovalModal = (item: ApiLeaveRequest) => {
    setSelectedRequest(item);
    setFormStatus(item.status);
    setFormNote(item.admin_note || "");
    setIsModalOpen(true);
    setActionMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSaving(true);
    if (formStatus === "approved") {
      await approveLeave(selectedRequest._id, formNote);
    } else if (formStatus === "rejected") {
      await rejectLeave(selectedRequest._id, formNote);
    }
    setSaving(false);
    setIsModalOpen(false);
  };

  const getUserName = (item: ApiLeaveRequest) => {
    if (typeof item.user_id === "object" && item.user_id?.name) return item.user_id.name;
    return "Staff Member";
  };

  const getUserRole = (item: ApiLeaveRequest) => {
    if (typeof item.user_id === "object" && item.user_id?.role) return item.user_id.role;
    return "—";
  };

  const formatDate = (d: string | Date) => {
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return String(d); }
  };

  const formatDateRange = (from: string, to: string) => {
    return `${formatDate(from)} - ${formatDate(to)}`;
  };

  const dateRangeLabel = (activeFrom && activeTo && !isCustom)
    ? `${formatDate(activeFrom)} — ${formatDate(activeTo)}`
    : selectedRange;

  const triggerCls = (open: boolean) =>
    `flex items-center gap-2 px-3 py-2 border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors cursor-pointer
     ${open
      ? "border-[#1E3A5F] text-[#1E3A5F]"
      : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  const filteredData = useMemo(() => {
    let list = leaveRequests.filter(item => {
      const name = getUserName(item);
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.leave_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLeaveType = filterLeaveType ? item.leave_type === filterLeaveType : true;
      const matchesStatus = filterStatus ? item.status === filterStatus.toLowerCase() : true;
      
      let matchesDate = true;
      if (activeFrom && activeTo) {
        const fromDate = new Date(item.from_date);
        const toDate = new Date(item.to_date);
        matchesDate = (fromDate <= activeTo && toDate >= activeFrom);
      }
      
      return matchesSearch && matchesLeaveType && matchesStatus && matchesDate;
    });

    if (selectedSort === "Ascending") {
      list = [...list].sort((a, b) => getUserName(a).localeCompare(getUserName(b)));
    } else if (selectedSort === "Descending") {
      list = [...list].sort((a, b) => getUserName(b).localeCompare(getUserName(a)));
    } else if (selectedSort === "Recently Added") {
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [leaveRequests, searchTerm, filterLeaveType, filterStatus, activeFrom, activeTo, selectedSort]);

  const pag = usePagination(filteredData, 10);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Approved
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-sky-50 text-sky-600 border border-sky-100">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Pending
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Leave Requests</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/leave" className="hover:text-[#1E3A5F]">HRM</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Leave Requests</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => window.location.reload()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#1E3A5F] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#1E3A5F] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-t-xl">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
            Leave Request List
          </h2>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* ── Date Range ── */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsDateRangeOpen(!isDateRangeOpen)} className={triggerCls(isDateRangeOpen)}>
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="max-w-full sm:w-[120px] truncate">{dateRangeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDateRangeOpen ? "rotate-180" : ""}`} />
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1">
                    {DATE_RANGES.map((range) => (
                      <button key={range} onClick={() => applyDateRange(range)}
                        className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer
                          ${selectedRange === range ? "bg-[#FFF3CD] dark:bg-amber-900/20 text-[#92400E] dark:text-amber-500 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                        {range}
                      </button>
                    ))}
                    {isCustom && (
                      <div className="px-4 py-3 border-t border-border bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="space-y-2">
                          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                            className="w-full text-[12px] px-2 py-1.5 border border-border rounded outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200" />
                          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                            className="w-full text-[12px] px-2 py-1.5 border border-border rounded outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200" />
                          <button onClick={applyCustomRange} disabled={!customFrom || !customTo}
                            className="w-full py-1.5 mt-1 text-[12px] font-bold text-white bg-[#1E3A5F] hover:bg-[#162C47] rounded transition-colors disabled:opacity-50 cursor-pointer">
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                    {(activeFrom || activeTo) && !isCustom && (
                      <div className="px-4 pt-2 pb-1 border-t border-border mt-1">
                        <button onClick={() => { setActiveFrom(null); setActiveTo(null); setSelectedRange("All Time"); setIsDateRangeOpen(false); }}
                          className="w-full text-[12px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer">
                          Clear Filter
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Filter ── */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={triggerCls(isFilterOpen)}>
                <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="whitespace-nowrap">Filter</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-100">Filter</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Leave Type</label>
                        <div className="relative">
                          <select 
                            value={filterLeaveType}
                            onChange={(e) => setFilterLeaveType(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                          >
                            <option value="">All</option>
                            <option value="sick">Sick</option>
                            <option value="casual">Casual</option>
                            <option value="emergency">Emergency</option>
                            <option value="other">Other</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Status</label>
                        <div className="relative">
                          <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                          >
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 bg-white dark:bg-slate-900 rounded-b-lg border-t border-border mt-2">
                      <button 
                        onClick={() => { setFilterLeaveType(""); setFilterStatus(""); }}
                        className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-[#0F172A] dark:text-slate-100 text-[13px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={() => setIsFilterOpen(false)}
                        className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#162C47] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Sort ── */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsSortOpen(!isSortOpen)} className={triggerCls(isSortOpen)}>
                <List className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Sort by: {selectedSort}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Ascending", "Descending", "Recently Added"].map((item) => (
                      <button 
                        key={item} 
                        onClick={() => { setSelectedSort(item); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[13px] text-left transition-colors cursor-pointer
                          ${selectedSort === item ? "bg-[#FFF3CD] dark:bg-amber-900/20 text-[#92400E] dark:text-amber-500 font-semibold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            <span>Total</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{filteredData.length}</span>
            <span>Requests</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#1E3A5F] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className={`overflow-x-auto ${actionMenuId ? 'pb-28' : ''}`}>
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-12">
                  <input type="checkbox" className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Submitted By</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Leave Type</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Leave Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">No of Days</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Applied On</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200 w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F] mx-auto" />
                    <p className="text-slate-500 dark:text-slate-400 mt-3 text-[13px]">Loading leave requests...</p>
                  </td>
                </tr>
              ) : pag.paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 text-[13px]">
                    No leave requests found.
                  </td>
                </tr>
              ) : pag.paged.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer" />
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                    {getUserName(item)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 capitalize">
                      {item.leave_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {formatDateRange(item.from_date, item.to_date)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {item.total_days || 1}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setActionMenuId(actionMenuId === item._id ? null : item._id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === item._id ? "bg-[#1E3A5F] text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuId === item._id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                        <div className="absolute right-10 top-10 w-36 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                          <button onClick={() => openApprovalModal(item)} className="w-full px-4 py-2 text-[13px] text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                            <Check className="w-4 h-4 text-[#0F172A] dark:text-slate-100" /> Review
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <PaginationBar
          currentPage={pag.page}
          totalPages={pag.totalPages}
          totalItems={pag.totalItems}
          pageSize={pag.pageSize}
          onPageChange={pag.setPage}
          className="rounded-b-xl"
        />
      </div>

      {/* Leave Request Approval Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Leave Request"
      >
        {selectedRequest && (
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            
            <div className="bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
              <div className="space-y-1">
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Submitted By</p>
                <p className="text-[14px] font-semibold text-[#0F172A] dark:text-slate-100">{getUserName(selectedRequest)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Role</p>
                <p className="text-[14px] font-semibold text-[#0F172A] dark:text-slate-100 capitalize">{getUserRole(selectedRequest)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Leave Type</p>
                <p className="text-[14px] font-semibold text-[#0F172A] dark:text-slate-100 capitalize">{selectedRequest.leave_type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[13px] text-slate-500 dark:text-slate-400">No of Days</p>
                <p className="text-[14px] font-semibold text-[#0F172A] dark:text-slate-100">{selectedRequest.total_days || 1}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Applied On</p>
                <p className="text-[14px] font-semibold text-[#0F172A] dark:text-slate-100">{formatDate(selectedRequest.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Leave</p>
                <p className="text-[14px] font-semibold text-[#0F172A] dark:text-slate-100">{formatDateRange(selectedRequest.from_date, selectedRequest.to_date)}</p>
              </div>
            </div>

            {selectedRequest.reason && (
              <div className="space-y-2">
                <h4 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-100">Reason</h4>
                <p className="text-[14px] text-slate-600 dark:text-slate-300">{selectedRequest.reason}</p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-100">Approval Status</h4>
              <div className="flex items-center gap-6">
                {(["pending", "approved", "rejected"] as const).map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formStatus === status ? "border-[#1E3A5F]" : "border-slate-300 group-hover:border-[#1E3A5F]/50"}`}>
                      {formStatus === status && <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />}
                    </div>
                    <span className="text-[14px] text-slate-700 dark:text-slate-200 capitalize">{status}</span>
                    <input 
                      type="radio" 
                      className="hidden" 
                      checked={formStatus === status} 
                      onChange={() => setFormStatus(status)} 
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-100">Note</h4>
              <textarea 
                placeholder="Add Comment"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="w-full h-24 p-3 border border-border rounded-lg outline-none focus:border-[#1E3A5F] bg-white dark:bg-slate-800 text-[14px] text-slate-700 dark:text-slate-200 resize-none transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="px-6 py-2.5 bg-[#1E3A5F] text-white text-[14px] font-bold rounded-lg hover:bg-[#162C47] transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit
              </button>
            </div>

          </form>
        )}
      </Modal>

    </div>
  );
}
