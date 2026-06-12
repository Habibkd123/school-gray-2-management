"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Printer, TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { useFeeAllocations, useFeeMasters, useFeePayments } from "@/app/hooks/useFees";

export default function FeesReportPage() {
  const { allocations, loading: allocLoading } = useFeeAllocations();
  const { masters, loading: mastersLoading } = useFeeMasters();
  const { payments, loading: paymentsLoading } = useFeePayments();

  const [dateRange, setDateRange] = useState("all");

  const loading = allocLoading || mastersLoading || paymentsLoading;

  // Filter payments by date range
  const filteredPayments = payments.filter(p => {
    if (dateRange === "all") return true;
    const tDate = p.transaction_date || p.createdAt || p.payment_date;
    if (!tDate) return true;
    const pDate = new Date(tDate);
    if (isNaN(pDate.getTime())) return true;
    const now = new Date();
    if (dateRange === "today") return pDate.toDateString() === now.toDateString();
    if (dateRange === "month") return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
    if (dateRange === "year") return pDate.getFullYear() === now.getFullYear();
    return true;
  });

  // Calculate Total Expected Revenue (Allocations * Master Amount)
  // Each allocation is to a FeeGroup. So we must sum all FeeMasters inside that FeeGroup for that allocation.
  let totalExpected = 0;
  allocations.forEach(a => {
    const groupId = typeof a.fee_group_id === 'object' ? a.fee_group_id._id : a.fee_group_id;
    const groupMasters = masters.filter(m => {
      const mGroupId = typeof m.fee_group_id === 'object' ? m.fee_group_id._id : m.fee_group_id;
      return mGroupId === groupId;
    });
    groupMasters.forEach(m => {
      totalExpected += m.amount;
    });
  });

  // Total Collected (Sum of filtered payments)
  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount_paid, 0);

  // Total Outstanding
  const totalOutstanding = Math.max(0, totalExpected - totalCollected); // roughly

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fees Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/reports" className="hover:text-[#F59E0B]">Reports</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Fees Report</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={dateRange} 
            onChange={e => setDateRange(e.target.value)}
            className={`px-3 py-2 bg-white dark:bg-slate-900 border text-[13px] text-slate-900 dark:text-white rounded-lg outline-none focus:border-[#F59E0B] transition-colors ${
              dateRange !== "all" ? "border-[#F59E0B] bg-[#FFF9E6] dark:bg-[#F59E0B]/10" : "border-border"
            }`}
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Time</option>
            <option value="today" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Today</option>
            <option value="month" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">This Month</option>
            <option value="year" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">This Year</option>
          </select>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
        </div>
      ) : (
        <>
          {/* Print Header */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">EduManage School</h1>
            <p className="text-slate-500 mt-1">Fees Collection Report</p>
            <p className="text-slate-400 text-sm mt-1">Generated on: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border shadow-sm flex items-center gap-4 print:border-slate-300">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center print:bg-transparent">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Total Expected Revenue</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">${totalExpected.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border shadow-sm flex items-center gap-4 print:border-slate-300">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center print:bg-transparent">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Total Collected</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">${totalCollected.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border shadow-sm flex items-center gap-4 print:border-slate-300">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center print:bg-transparent">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Outstanding Balance</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">${totalOutstanding.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden print:border-slate-300">
            <div className="p-5 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 print:bg-transparent">
              <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Recent Transactions</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Date</th>
                    <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Receipt No</th>
                    <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                    <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Fee Details</th>
                    <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Method</th>
                    <th className="px-5 py-3 text-right font-bold text-slate-700 dark:text-slate-200">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-slate-300">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">No transactions found for the selected period.</td>
                    </tr>
                  ) : filteredPayments.map(p => (
                    <tr key={p._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors print:text-black">
                      <td className="px-5 py-3">{new Date(p.transaction_date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300 print:text-black">{p.receipt_number}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100 print:text-black">
                        {typeof p.student_id === 'object' ? p.student_id.name : "—"}
                        <div className="text-[11px] text-slate-500 font-normal">Adm: {typeof p.student_id === 'object' ? p.student_id.admission_no : "—"}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 print:text-black">
                        {typeof p.fee_master_id === 'object' && typeof p.fee_master_id.fee_type_id === 'object' ? p.fee_master_id.fee_type_id.name : "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 print:text-black">{p.payment_method}</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-black">${p.amount_paid.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
