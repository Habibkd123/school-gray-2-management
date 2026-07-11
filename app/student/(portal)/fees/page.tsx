"use client";

import React, { useState } from "react";
import { useStudentAuth } from "../../context/studentAuth";
import { useFeeAllocations, useFeePayments, useFeeMasters } from "../../../hooks/useFees";
import {
  CreditCard,
  Receipt,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Coins,
  Loader2,
  ArrowUpRight,
  TrendingDown,
  Info,
} from "lucide-react";

export default function StudentFeesPage() {
  const { studentProfile } = useStudentAuth();

  const studentId = studentProfile?._id;

  const { allocations, loading: allocationsLoading } = useFeeAllocations(studentId);
  const { payments, loading: paymentsLoading } = useFeePayments(studentId);
  const { masters, loading: mastersLoading } = useFeeMasters();

  const [activeTab, setActiveTab] = useState<"dues" | "history">("dues");

  const isLoading = allocationsLoading || paymentsLoading || mastersLoading;

  // ── Compute Fees Data ──────────────────────────────────────────────
  // 1. Get allocated group IDs
  const allocatedGroupIds = allocations.map((a) =>
    a.fee_group_id && typeof a.fee_group_id === "object"
      ? a.fee_group_id._id
      : String(a.fee_group_id)
  );

  // 2. Filter masters belonging to the student's allocated groups
  const studentFeeItems = masters.filter((m) => {
    const groupId =
      m.fee_group_id && typeof m.fee_group_id === "object"
        ? m.fee_group_id._id
        : String(m.fee_group_id);
    return allocatedGroupIds.includes(groupId);
  });

  // 3. Match payments to each master fee item
  const detailedFees = studentFeeItems.map((item) => {
    const itemPayments = payments.filter((p) => {
      const payMasterId =
        p.fee_master_id && typeof p.fee_master_id === "object"
          ? p.fee_master_id._id
          : String(p.fee_master_id);
      return payMasterId === item._id;
    });

    const amountPaid = itemPayments.reduce((sum, p) => sum + p.amount_paid, 0);
    const balance = Math.max(0, item.amount - amountPaid);

    let status: "paid" | "partial" | "unpaid" = "unpaid";
    if (amountPaid >= item.amount) {
      status = "paid";
    } else if (amountPaid > 0) {
      status = "partial";
    }

    const isOverdue = balance > 0 && new Date(item.due_date) < new Date();

    const groupName =
      item.fee_group_id && typeof item.fee_group_id === "object"
        ? item.fee_group_id.name
        : "General Fee";

    const typeName =
      item.fee_type_id && typeof item.fee_type_id === "object"
        ? item.fee_type_id.name
        : "Fee Item";

    return {
      id: item._id,
      groupName,
      typeName,
      amount: item.amount,
      amountPaid,
      balance,
      dueDate: item.due_date,
      status,
      isOverdue,
    };
  });

  // Totals calculations
  const totalAmount = detailedFees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = detailedFees.reduce((sum, f) => sum + f.amountPaid, 0);
  const totalBalance = detailedFees.reduce((sum, f) => sum + f.balance, 0);
  const overdueCount = detailedFees.filter((f) => f.isOverdue).length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fees Overview</h1>
        <p className="card-subtitle text-[13px] mt-1">
          View your assigned fee groups, balance dues, and billing history
        </p>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Allocated */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
              <CreditCard className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Assigned</span>
          </div>
          <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
            ${totalAmount.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Allocated fees</p>
        </div>

        {/* Total Paid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <Coins className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Paid</span>
          </div>
          <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
            ${totalPaid.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Paid till date</p>
        </div>

        {/* Total Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance Due</span>
          </div>
          <p className="text-lg font-extrabold text-rose-600 dark:text-rose-450 mt-0.5">
            ${totalBalance.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Outstanding amount</p>
        </div>

        {/* Overdue Items */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2.5">
            <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center ${overdueCount > 0 ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20" : "bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750"}`}>
              <AlertTriangle className={`w-4 h-4 ${overdueCount > 0 ? "text-amber-500 animate-pulse" : "text-slate-400"}`} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overdue Items</span>
          </div>
          <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
            {overdueCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Passed due dates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 gap-4">
        <button
          onClick={() => setActiveTab("dues")}
          className={`pb-3 text-[13px] font-bold border-b-2 transition-all px-1 ${
            activeTab === "dues"
              ? "border-indigo-500 text-slate-900 dark:text-white"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Fee Structure & Dues
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-[13px] font-bold border-b-2 transition-all px-1 ${
            activeTab === "history"
              ? "border-indigo-500 text-slate-900 dark:text-white"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Payment Receipts ({payments.length})
        </button>
      </div>

      {/* Tab Contents */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : activeTab === "dues" ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          {detailedFees.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-slate-350 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-400">
                No fee allocations found
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                You do not have any assigned fees for this term.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4">Fee Item</th>
                    <th className="py-4">Group</th>
                    <th className="py-4">Due Date</th>
                    <th className="py-4">Amount</th>
                    <th className="py-4">Paid</th>
                    <th className="py-4">Balance</th>
                    <th className="py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-850 text-[13px]">
                  {detailedFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/25 transition-colors">
                      <td className="py-4 font-bold text-slate-800 dark:text-slate-200">
                        {fee.typeName}
                      </td>
                      <td className="py-4 font-semibold text-slate-500 dark:text-slate-400">
                        {fee.groupName}
                      </td>
                      <td className="py-4 font-semibold text-slate-600 dark:text-slate-350">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(fee.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-slate-800 dark:text-slate-200">
                        ${fee.amount.toLocaleString()}
                      </td>
                      <td className="py-4 font-semibold text-emerald-600 dark:text-emerald-450">
                        ${fee.amountPaid.toLocaleString()}
                      </td>
                      <td className="py-4 font-bold text-slate-800 dark:text-slate-200">
                        <span className={fee.balance > 0 ? "text-rose-600 dark:text-rose-400" : ""}>
                          ${fee.balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              fee.status === "paid"
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                                : fee.status === "partial"
                                ? "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400"
                                : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
                            }`}
                          >
                            {fee.status === "paid"
                              ? "Paid"
                              : fee.status === "partial"
                              ? "Partial"
                              : "Unpaid"}
                          </span>
                          {fee.isOverdue && (
                            <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center gap-0.5 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-slate-350 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-400">
                No payment logs found
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                You have not made any payments yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4">Receipt</th>
                    <th className="py-4">Fee Description</th>
                    <th className="py-4">Payment Date</th>
                    <th className="py-4">Method</th>
                    <th className="py-4">Amount Paid</th>
                    <th className="py-4 text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-850 text-[13px]">
                  {payments.map((p) => {
                    const master = p.fee_master_id;
                    const typeName =
                      master && typeof master === "object" && master.fee_type_id
                        ? (typeof master.fee_type_id === "object" ? master.fee_type_id.name : String(master.fee_type_id))
                        : "General Fee Item";

                    return (
                      <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/25 transition-colors">
                        <td className="py-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Receipt className="w-4 h-4 text-slate-400" />
                          {p.receipt_number || "REC-N/A"}
                        </td>
                        <td className="py-4 font-semibold text-slate-500 dark:text-slate-400">
                          {typeName}
                        </td>
                        <td className="py-4 font-semibold text-slate-600 dark:text-slate-350">
                          {new Date(p.transaction_date || p.payment_date || p.createdAt || Date.now()).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-4 font-bold text-indigo-500 uppercase text-[11px]">
                          {p.payment_method}
                        </td>
                        <td className="py-4 font-bold text-emerald-600 dark:text-emerald-450">
                          +${p.amount_paid.toLocaleString()}
                        </td>
                        <td className="py-4 text-right text-slate-400 italic text-[12px]">
                          {p.remarks || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
