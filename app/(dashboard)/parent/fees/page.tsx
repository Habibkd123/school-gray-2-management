"use client";

import React from "react";
import { useParent } from "@/app/hooks/useParent";
import { ChildSelector } from "@/app/components/parent/ChildSelector";
import { DollarSign, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { useFeeAllocations, useFeePayments, useFeeMasters } from "@/app/hooks/useFees";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";


export default function ParentFeesPage() {
  const { children, selectedChild, selectedChildId, setSelectedChildId, isLoading: isParentLoading } = useParent();
  
  const { 
    allocations, 
    loading: isAllocLoading 
  } = useFeeAllocations(selectedChildId || undefined);
  
  const { 
    payments, 
    loading: isPayLoading 
  } = useFeePayments(selectedChildId || undefined);

  const {
    masters,
    loading: isMastersLoading
  } = useFeeMasters();

  const isLoading = isAllocLoading || isPayLoading || isMastersLoading;

  // Filter masters by child's allocated groups
  const childGroupIds = allocations.map(a => typeof a.fee_group_id === 'object' ? a.fee_group_id._id : a.fee_group_id);
  const childFeeMasters = masters.filter(m => {
    const groupId = typeof m.fee_group_id === 'object' ? m.fee_group_id._id : m.fee_group_id;
    return childGroupIds.includes(groupId);
  });

  // Calculate totals
  const totalFees = childFeeMasters.reduce((sum, m) => sum + m.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalPending = Math.max(0, totalFees - totalPaid);
  
  const paymentPercentage = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;

  // Paginate payment history
  const payPag = usePagination(payments, 8);

  return (
    <div className="space-y-6 max-w-full sm:w-[1200px] mx-auto">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border card-shadow">
        <div>
          <h1 className="section-title tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-500" />
            Fees Status
          </h1>
          <p className="card-subtitle mt-1">View pending dues and payment history</p>
        </div>
        <div className="w-full sm:w-[250px]">
          <ChildSelector 
            childrenList={children} 
            selectedChildId={selectedChildId} 
            onSelectChild={setSelectedChildId} 
            isLoading={isParentLoading} 
          />
        </div>
      </div>

      {!selectedChild ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-border text-center text-slate-500 dark:text-slate-400">
          Please select a child to view their fees.
        </div>
      ) : isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Summary Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Financial Summary</h3>
              
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-border flex justify-between items-center">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12px] text-slate-500 uppercase font-semibold dark:text-slate-400">Total Fees</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">${totalFees.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex justify-between items-center">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Total Paid</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">${totalPaid.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 flex justify-between items-center">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Pending Dues</p>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-300">${totalPending.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500 font-medium dark:text-slate-400">Payment Progress</span>
                  <span className="font-bold text-slate-900 dark:text-white">{paymentPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${paymentPercentage === 100 ? 'bg-success' : 'bg-primary'}`} 
                    style={{ width: `${paymentPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Tabs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Fee Allocations */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow">
              <h3 className="card-title mb-4">Assigned Fees</h3>
              <div className="overflow-x-auto">
                <table className="erp-table card-subtitle">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Fee Type</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childFeeMasters.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          No fees assigned yet.
                        </td>
                      </tr>
                    ) : (
                      childFeeMasters.map((master) => {
                        const type = typeof master.fee_type_id === 'object' ? master.fee_type_id : null;
                        const group = typeof master.fee_group_id === 'object' ? master.fee_group_id : null;
                        
                        return (
                          <tr key={master._id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {type?.name || 'Unknown Type'}
                              <span className="block text-[11px] text-slate-500 font-normal mt-0.5 dark:text-slate-400">{group?.name || 'Unknown Group'}</span>
                            </td>
                            <td className="px-4 py-3">
                              {master.due_date ? new Date(master.due_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                              ${master.amount?.toLocaleString() || 0}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow">
              <h3 className="card-title mb-4">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="erp-table card-subtitle">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Date</th>
                      <th className="px-4 py-3">Receipt No</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payPag.paged.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          No payments made yet.
                        </td>
                      </tr>
                    ) : (
                      payPag.paged.map((payment) => (
                        <tr key={payment._id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            {new Date(payment.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                            {payment.receipt_number}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs">
                              {payment.payment_method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ${payment.amount_paid.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                currentPage={payPag.page}
                totalPages={payPag.totalPages}
                totalItems={payPag.totalItems}
                pageSize={8}
                onPageChange={payPag.setPage}
                className="border-t-0 pt-0"
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
