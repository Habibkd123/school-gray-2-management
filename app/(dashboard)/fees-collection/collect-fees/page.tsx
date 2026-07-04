"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Loader2, DollarSign, Printer, CheckCircle2, User, Save } from "lucide-react";
import { useStudents } from "@/app/hooks/useStudents";
import { useFeeAllocations, useFeeMasters, useFeePayments } from "@/app/hooks/useFees";

export default function CollectFeesPage() {
  const { students, isLoading: studentsLoading, fetchStudents: fetchAllStudents } = useStudents({ skip: true });
  const { allocations, loading: allocLoading, fetchAllocations } = useFeeAllocations();
  const { masters, loading: mastersLoading, fetchMasters } = useFeeMasters();
  const { payments, loading: paymentsLoading, fetchPayments, recordPayment } = useFeePayments();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [activeMaster, setActiveMaster] = useState<any>(null);
  const [form, setForm] = useState({ amount_paid: "", payment_method: "Cash", remarks: "" });
  const [saving, setSaving] = useState(false);

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  useEffect(() => {
    fetchAllStudents();
  }, [fetchAllStudents]);

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchTerm("");
    await Promise.all([
      fetchAllocations(student._id),
      fetchMasters(), // fetch all masters and filter locally
      fetchPayments(student._id)
    ]);
  };

  const filteredStudents = searchTerm.length > 2 ? students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.admission_no || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Calculate fee records for selected student
  const studentGroups = allocations.map(a => typeof a.fee_group_id === 'object' ? a.fee_group_id._id : a.fee_group_id);
  const studentMasters = masters.filter(m => {
    const gid = typeof m.fee_group_id === 'object' ? m.fee_group_id._id : m.fee_group_id;
    return studentGroups.includes(gid);
  });

  const getMasterPayments = (masterId: string) => {
    return payments.filter(p => {
      const mid = typeof p.fee_master_id === 'object' ? p.fee_master_id._id : p.fee_master_id;
      return mid === masterId;
    });
  };

  const handlePayClick = (master: any, balance: number) => {
    setActiveMaster(master);
    setForm({ amount_paid: balance.toString(), payment_method: "Cash", remarks: "" });
    setPayModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await recordPayment({
      student_id: selectedStudent._id,
      fee_master_id: activeMaster._id,
      amount_paid: Number(form.amount_paid),
      payment_method: form.payment_method,
      remarks: form.remarks
    });
    setSaving(false);
    setPayModalOpen(false);

    if (res.success) {
      setLastReceipt(res.data.payment);
      setReceiptModalOpen(true);
    } else {
      alert(res.message);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Collect Fees</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/fees-collection" className="hover:text-primary">Fees Collection</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Collect Fees</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Left Column: Search & Profile */}
        <div className="space-y-6">
          {/* Search Box */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-5 relative">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> Search Student</h2>
            <input 
              type="text" 
              placeholder="Search by Name or Admission No (min 3 chars)..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
            
            {/* Search Results Dropdown */}
            {filteredStudents.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl overflow-hidden z-20 max-h-[300px] overflow-y-auto">
                {filteredStudents.map(s => (
                  <div 
                    key={s._id} 
                    onClick={() => handleSelectStudent(s)}
                    className="px-4 py-3 border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Adm: {s.admission_no} • Roll: {s.roll_no || "-"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Profile Card */}
          {selectedStudent && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-5 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedStudent.name}</h2>
              <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 flex flex-col gap-1">
                <span>Admission No: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedStudent.admission_no}</span></span>
                <span>Roll No: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedStudent.roll_no || "-"}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Fees Details */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" /> Pending Fees
                </h2>
              </div>
              
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-b border-border">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Fee Group</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Fee Type</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Due Date</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 dark:text-slate-200">Amount</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 dark:text-slate-200">Paid</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 dark:text-slate-200">Balance</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 dark:text-slate-200">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {studentMasters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">No fees assigned to this student.</td>
                      </tr>
                    ) : studentMasters.map(m => {
                      const mPayments = getMasterPayments(m._id);
                      const totalPaid = mPayments.reduce((sum, p) => sum + p.amount_paid, 0);
                      const balance = m.amount - totalPaid;
                      const isPaid = balance <= 0;

                      return (
                        <tr key={m._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-5 py-3 text-slate-800 dark:text-slate-100">{typeof m.fee_group_id === 'object' ? m.fee_group_id.name : "—"}</td>
                          <td className="px-5 py-3 text-slate-800 dark:text-slate-100">{typeof m.fee_type_id === 'object' ? m.fee_type_id.name : "—"}</td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{new Date(m.due_date).toLocaleDateString()}</td>
                          <td className="px-5 py-3 text-right text-slate-800 dark:text-slate-100 font-medium">${m.amount.toFixed(2)}</td>
                          <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">${totalPaid.toFixed(2)}</td>
                          <td className="px-5 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">${balance.toFixed(2)}</td>
                          <td className="px-5 py-3 text-right">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded text-[11px] font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </span>
                            ) : (
                              <button onClick={() => handlePayClick(m, balance)} className="px-3 py-1.5 bg-primary hover:bg-[var(--primary-hover)] text-white rounded text-[12px] font-semibold transition-colors">Pay</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-border border-dashed rounded-xl flex items-center justify-center h-[300px] text-slate-400 text-[14px]">
              Search and select a student to view their fees
            </div>
          )}
        </div>
      </div>

      {/* Pay Modal */}
      {payModalOpen && activeMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Record Payment</h2>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="flex justify-between text-[13px] bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-border">
                <span className="text-slate-600 dark:text-slate-400">Total Amount: <span className="font-bold text-slate-900 dark:text-white">${activeMaster.amount.toFixed(2)}</span></span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Amount Paying Now <span className="text-rose-500">*</span></label>
                <input required type="number" min="1" step="0.01" value={form.amount_paid} onChange={e => setForm({...form, amount_paid: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Payment Method <span className="text-rose-500">*</span></label>
                <select required value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors">
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Online">Online</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Remarks</label>
                <input type="text" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" placeholder="Optional details..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setPayModalOpen(false)} className="px-4 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptModalOpen && lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 print:shadow-none print:w-full print:max-w-none">
            
            {/* Printable Content */}
            <div className="p-8 print:p-0">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">EduManage School</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Official Payment Receipt</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <div className="text-slate-500 mb-1 dark:text-slate-400">Receipt No</div>
                  <div className="font-bold text-slate-900 dark:text-white">{lastReceipt.receipt_number}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 mb-1 dark:text-slate-400">Date</div>
                  <div className="font-bold text-slate-900 dark:text-white">{new Date(lastReceipt.transaction_date).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="border-t border-b border-border py-4 mb-6 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <span className="text-slate-500 col-span-1 dark:text-slate-400">Received From:</span>
                  <span className="font-bold text-slate-900 dark:text-white col-span-2">{selectedStudent.name} (Adm: {selectedStudent.admission_no})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <span className="text-slate-500 col-span-1 dark:text-slate-400">Fee Category:</span>
                  <span className="font-bold text-slate-900 dark:text-white col-span-2">
                    {lastReceipt.fee_master_id.fee_group_id.name} - {lastReceipt.fee_master_id.fee_type_id.name}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <span className="text-slate-500 col-span-1 dark:text-slate-400">Payment Method:</span>
                  <span className="font-bold text-slate-900 dark:text-white col-span-2">{lastReceipt.payment_method}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg flex justify-between items-center print:bg-slate-100 print:text-black">
                <span className="font-bold text-slate-700 dark:text-slate-300">Amount Paid:</span>
                <span className="text-2xl font-black text-primary">${lastReceipt.amount_paid.toFixed(2)}</span>
              </div>

              <div className="mt-8 pt-8 border-t border-border flex justify-between items-end text-sm text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <div className="w-32 border-b border-slate-300 mb-1"></div>
                  Accountant Signature
                </div>
                <div className="text-center text-xs">
                  Generated by EduManage System
                </div>
              </div>
            </div>

            {/* Action Buttons (Hidden on print) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-border flex justify-end gap-3 print:hidden">
              <button onClick={() => setReceiptModalOpen(false)} className="px-4 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Close</button>
              <button onClick={handlePrintReceipt} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
