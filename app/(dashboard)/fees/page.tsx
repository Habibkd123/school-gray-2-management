"use client";

import React, { useState } from "react";
import { Modal } from "../../components/ui/modal";
import { useFees, useFeeAllocations, useFeePayments, useFeeMasters } from "@/app/hooks/useFees";
import { useAuth } from "@/app/context/auth";
import { useStudents } from "@/app/hooks/useStudents";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";
import {
  DollarSign,
  Plus,
  CreditCard,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Lock,
  ArrowRight,
  TrendingUp,
  Percent,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

function StudentFeesView({ studentId, studentName }: { studentId?: string; studentName?: string }) {
  const { 
    allocations, 
    loading: isAllocLoading 
  } = useFeeAllocations(studentId);
  
  const { 
    payments, 
    loading: isPayLoading 
  } = useFeePayments(studentId);

  const {
    masters,
    loading: isMastersLoading
  } = useFeeMasters();

  const isLoading = isAllocLoading || isPayLoading || isMastersLoading;

  // Filter masters by student's allocated groups
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

  if (!studentId) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="page-title">My Fees Status</h1>
          <p className="page-desc mt-1">
            View pending dues and transaction history for {studentName}.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Summary Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Financial Summary</h3>
              
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-border flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12px] text-slate-500 uppercase font-semibold">Total Fees</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">${totalFees.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
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
                  <div className="flex items-center gap-3">
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
                  <span className="text-slate-500 font-medium">Payment Progress</span>
                  <span className="font-bold text-slate-900 dark:text-white">{paymentPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${paymentPercentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                    style={{ width: `${paymentPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Tabs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Fee Allocations */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-4">Assigned Fees</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
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
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
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
                              <span className="block text-[11px] text-slate-500 font-normal mt-0.5">{group?.name || 'Unknown Group'}</span>
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
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-4">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
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
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
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

export default function FeesPage() {
  const { user } = useAuth();
  const { students } = useStudents();
  
  const student = students.find(s => {
    const sUserId = typeof s.user_id === 'object' && s.user_id ? s.user_id._id : s.user_id;
    return sUserId === user?.id;
  });

  const studentId = student?._id;

  const {
    feeStructures,
    payments,
    loading,
    totalCollected,
    totalPending,
    totalOverdue,
    createFeeStructure,
    recordPayment,
    fetchAll
  } = useFees();

  if (user?.role === "student") {
    return <StudentFeesView studentId={studentId} studentName={student?.name} />;
  }

  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState("");

  // Payment Form States
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // New Fee Structure States
  const [feeName, setFeeName] = useState("");
  const [feeAmount, setFeeAmount] = useState(1500);
  const [feeFrequency, setFeeFrequency] = useState("monthly");
  const [dueDay, setDueDay] = useState(10);
  const [saving, setSaving] = useState(false);

  const handlePayClick = (feeId: string) => {
    setSelectedFeeId(feeId);
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setCardName("");
    setIsSuccess(false);
    setIsProcessing(false);
    setIsPayOpen(true);
  };

  const selectedFee = feeStructures.find((f) => f._id === selectedFeeId);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate payment gateway processing
    setTimeout(async () => {
      if (selectedFee) {
        await recordPayment({
          student_id: "000000000000000000000000", // placeholder
          fee_structure_id: selectedFee._id,
          amount_paid: selectedFee.amount,
          payment_method: "card",
        });
      }
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsPayOpen(false);
      }, 1500);
    }, 2000);
  };

  const handleCreateFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await createFeeStructure({
      name: feeName,
      amount: feeAmount,
      frequency: feeFrequency as any,
      due_day: dueDay,
    });
    setFeeName("");
    setSaving(false);
    setIsAddOpen(false);
  };

  const visibleFees = feeStructures.filter((f) => {
    return f.name.toLowerCase().includes(search.toLowerCase());
  });

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="page-title">Billing Ledger Desk</h1>
          <p className="page-desc mt-1">
            Track student fee payments, invoice balances, and record collections.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Fee Structure</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Collected</span>
              <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">${totalCollected.toLocaleString()}</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Settled
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Pending Dues</span>
              <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">${totalPending.toLocaleString()}</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Unpaid
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Overdue Balances</span>
              <span className="text-2xl font-bold block text-rose-600 mt-0.5">${totalOverdue.toLocaleString()}</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
            Immediate
          </span>
        </div>
      </div>

      {/* Fee Structures & Search */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative text-left">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by fee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 shadow-sm transition-all"
          />
        </div>

        {/* Fee Structure Table */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/50 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Fee Name</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Frequency</th>
                  <th className="px-6 py-4">Due Day</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[13px]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      <p className="text-slate-500 dark:text-slate-400 mt-3 text-[13px]">Loading fees...</p>
                    </td>
                  </tr>
                ) : visibleFees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No fee structures found. Click &quot;Add Fee Structure&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  visibleFees.map((fee) => (
                    <tr key={fee._id} className="hover:bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{fee.name}</span>
                          <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Year: {fee.academic_year}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold font-mono text-slate-800 dark:text-slate-100">${fee.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">{fee.frequency.replace("_", " ")}</td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">{fee.due_day}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          fee.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${fee.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {fee.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handlePayClick(fee._id)}
                          className="px-3.5 py-1.5 text-[12px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments Section */}
        {payments.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left">
            <div className="p-5 border-b border-border">
              <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Recent Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/50 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <th className="px-6 py-4">Receipt No</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-[13px]">
                  {payments.slice(0, 10).map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-primary">{p.receipt_no}</td>
                      <td className="px-6 py-4 font-bold font-mono text-slate-800 dark:text-slate-100">${p.total_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">{p.payment_method}</td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">{formatDate(p.payment_date)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* STRIPE-LIKE PAYMENT GATEWAY POPUP */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Checkout Sandbox Gateway">
        <form onSubmit={handlePaymentSubmit} className="space-y-5">
          <div className="p-5 bg-slate-900 dark:bg-slate-100 text-white rounded-xl text-left shadow-lg space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Checkout Total</span>
                <h3 className="text-3xl font-semibold font-mono mt-1">${selectedFee?.amount}</h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700 text-slate-300">
                SANDBOX MODE
              </span>
            </div>
            <div className="text-[12px] text-slate-300 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700">
              <span className="font-bold text-white">Fee:</span> {selectedFee?.name}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Cardholder Name</label>
              <input
                required
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Credit Card Number</label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Expiration Date</label>
                <input
                  required
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">CVC Code</label>
                <input
                  required
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={isProcessing || isSuccess}
              className="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/70 text-white text-[14px] font-semibold rounded-lg shadow-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Payment Recorded Successfully!</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ${selectedFee?.amount} securely</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1 mt-1">
              Secure sandbox transaction powered by Academix Stripe.
            </p>
          </div>
        </form>
      </Modal>

      {/* ADD FEE STRUCTURE MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Fee Structure">
        <form onSubmit={handleCreateFeeSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Fee Name</label>
            <input
              required
              type="text"
              value={feeName}
              onChange={(e) => setFeeName(e.target.value)}
              placeholder="e.g. Term 3 Tuition Fees"
              className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 text-left col-span-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Amount ($)</label>
              <input
                required
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(Number(e.target.value))}
                min={1}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-left col-span-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Frequency</label>
              <select
                value={feeFrequency}
                onChange={(e) => setFeeFrequency(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm cursor-pointer"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half Yearly</option>
                <option value="annually">Annually</option>
                <option value="one_time">One Time</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 text-left col-span-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Due Day</label>
              <input
                required
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                min={1}
                max={28}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Fee Structure
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
