"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Calendar, Plus, Loader2, MoreVertical, Check, X, FileText } from "lucide-react";
import { useLeave, ApiLeaveRequest } from "@/app/hooks/useLeave";
import { Modal } from "@/app/components/ui/modal";

export default function ApplyLeavePage() {
  const { leaveRequests, loading, submitLeave } = useLeave();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState("sick");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!leaveType || !fromDate || !toDate) {
      setError("Please fill all required fields");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setError("To Date must be after From Date");
      return;
    }

    setSaving(true);
    const res = await submitLeave({
      leave_type: leaveType as any,
      from_date: fromDate,
      to_date: toDate,
      reason,
    });

    setSaving(false);
    if (res.success) {
      setIsModalOpen(false);
      // Reset form
      setLeaveType("sick");
      setFromDate("");
      setToDate("");
      setReason("");
    } else {
      setError(res.message || "Failed to submit leave request");
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  const formatDateRange = (from: string, to: string) => {
    return `${formatDate(from)} - ${formatDate(to)}`;
  };

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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Leave Applications</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Leave</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Apply Leave</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-white text-[13px] font-semibold rounded-lg hover:bg-[#4b58ce] transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        </div>
      </div>

      {/* Main Content - History */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
            Leave History
          </h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Leave Type</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Leave Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">No of Days</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Applied On</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Admin Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F] mx-auto" />
                    <p className="text-slate-500 dark:text-slate-400 mt-3 text-[13px]">Loading your leaves...</p>
                  </td>
                </tr>
              ) : leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 text-[13px]">
                    You haven't applied for any leaves yet.
                  </td>
                </tr>
              ) : leaveRequests.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
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
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={item.admin_note}>
                    {item.admin_note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply Leave"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {error && (
            <div className="p-3 text-[13px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Leave Type *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium"
              required
            >
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="emergency">Emergency Leave</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">From Date *</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">To Date *</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Reason</label>
            <textarea
              placeholder="Why are you taking leave?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-24 p-3 border border-border rounded-lg outline-none bg-white dark:bg-slate-800 text-[13px] text-slate-700 dark:text-slate-200 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#1E3A5F] text-white text-[13px] font-bold rounded-lg hover:bg-[#4b58ce] transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
