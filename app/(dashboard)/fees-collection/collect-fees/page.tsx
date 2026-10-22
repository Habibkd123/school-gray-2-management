"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Loader2, DollarSign, Printer, CheckCircle2, User, Save, CheckSquare, Square, FileText } from "lucide-react";
import { useStudents } from "@/app/hooks/useStudents";
import { useFeeAllocations, useFeeMasters, useFeePayments } from "@/app/hooks/useFees";
import { GenerateDocumentWizard } from "@/app/components/document-builder/GenerateDocumentWizard";
import { PrintService } from "@/app/lib/print-service";

export default function CollectFeesPage() {
  const { students, isLoading: studentsLoading, fetchStudents: fetchAllStudents } = useStudents({ skip: true });
  const { allocations, loading: allocLoading, fetchAllocations } = useFeeAllocations();
  const { masters, loading: mastersLoading, fetchMasters } = useFeeMasters();
  const { payments, loading: paymentsLoading, fetchPayments, recordPayment } = useFeePayments();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [selectedFees, setSelectedFees] = useState<string[]>([]);

  // Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ payment_method: "Cash", remarks: "" });
  const [saving, setSaving] = useState(false);

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastReceipts, setLastReceipts] = useState<any[]>([]);
  const [receiptCopies, setReceiptCopies] = useState<1 | 2 | 3>(1);
  const [pageMode, setPageMode] = useState<"single" | "separate">("single");

  // Generate Receipt Wizard
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generatePaymentId, setGeneratePaymentId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllStudents();
  }, [fetchAllStudents]);

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchTerm("");
    setSelectedFees([]);
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

  const getBalance = (master: any) => {
    const mPayments = getMasterPayments(master._id);
    const totalPaid = mPayments.reduce((sum, p) => sum + p.amount_paid, 0);
    return master.amount - totalPaid;
  };

  const toggleFee = (masterId: string, balance: number) => {
    if (balance <= 0) return; // Can't select paid fees

    if (selectedFees.includes(masterId)) {
      setSelectedFees(selectedFees.filter(id => id !== masterId));
    } else {
      setSelectedFees([...selectedFees, masterId]);
    }
  };

  const toggleAll = () => {
    const payableMasters = studentMasters.filter(m => getBalance(m) > 0);
    if (selectedFees.length === payableMasters.length) {
      setSelectedFees([]);
    } else {
      setSelectedFees(payableMasters.map(m => m._id));
    }
  };

  const handlePaySelectedClick = () => {
    if (selectedFees.length === 0) return;

    // Initialize amounts with full balance for selected fees
    const initialAmounts: Record<string, string> = {};
    selectedFees.forEach(id => {
      const master = studentMasters.find(m => m._id === id);
      if (master) initialAmounts[id] = getBalance(master).toString();
    });

    setAmounts(initialAmounts);
    setForm({ payment_method: "Cash", remarks: "" });
    setPayModalOpen(true);
  };

  const handleAmountChange = (id: string, value: string) => {
    setAmounts(prev => ({ ...prev, [id]: value }));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const paymentPayload = selectedFees.map(id => ({
      fee_master_id: id,
      amount_paid: Number(amounts[id])
    })).filter(p => p.amount_paid > 0);

    if (paymentPayload.length === 0) {
      alert("Please enter a valid amount greater than 0");
      setSaving(false);
      return;
    }

    const res = await recordPayment({
      student_id: selectedStudent._id,
      payments: paymentPayload,
      payment_method: form.payment_method,
      remarks: form.remarks
    });

    setSaving(false);
    setPayModalOpen(false);
    setSelectedFees([]); // reset selection after successful pay

    if (res.success) {
      setLastReceipts(res.data.payments);
      setReceiptModalOpen(true);
    } else {
      alert(res.message);
    }
  };

  const handlePrintReceipt = () => {
    PrintService.print('printable-receipt', { pageSize: 'A4' });
  };

  const grandTotal = Object.values(amounts).reduce((sum, val) => sum + Number(val || 0), 0);
  const payableCount = studentMasters.filter(m => getBalance(m) > 0).length;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">Collect Fees</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
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
              <div className="card-subtitle text-[13px] mt-1 flex flex-col gap-1">
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
              <div className="p-5 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" /> Pending Fees
                </h2>
                {selectedFees.length > 0 && (
                  <button 
                    onClick={handlePaySelectedClick}
                    className="btn btn-primary"
                  >
                    Pay Selected ({selectedFees.length})
                  </button>
                )}
              </div>
                           <div className="erp-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th className="w-12 cursor-pointer" onClick={toggleAll}>
                         {payableCount > 0 && selectedFees.length === payableCount ? (
                           <CheckSquare className="w-5 h-5 text-primary" />
                         ) : (
                           <Square className="w-5 h-5 text-slate-400" />
                         )}
                      </th>
                      <th>Fee Group / Type</th>
                      <th>Due Date</th>
                      <th>Freq</th>
                      <th className="col-right">Amount</th>
                      <th className="col-right">Paid</th>
                      <th className="col-right">Balance</th>
                      <th className="col-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentMasters.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="table-empty">No fees assigned to this student.</td>
                      </tr>
                    ) : studentMasters.map(m => {
                      const balance = getBalance(m);
                      const isPaid = balance <= 0;
                      const selected = selectedFees.includes(m._id);
                      const mPayments = getMasterPayments(m._id);
                      const totalPaid = mPayments.reduce((sum, p) => sum + p.amount_paid, 0);
 
                      let statusBadge = <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded">Pending</span>;
                      if (isPaid) {
                        statusBadge = <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
                      } else if (totalPaid > 0) {
                        statusBadge = <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded">Partial</span>;
                      }
 
                      return (
                        <tr key={m._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td>
                            {!isPaid && (
                              <div className="cursor-pointer" onClick={() => toggleFee(m._id, balance)}>
                                {selected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-slate-400" />}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="text-slate-800 dark:text-slate-100 font-semibold">{typeof m.fee_type_id === 'object' ? m.fee_type_id.name : "—"}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{typeof m.fee_group_id === 'object' ? m.fee_group_id.name : "—"}</div>
                          </td>
                          <td>{new Date(m.due_date).toLocaleDateString()}</td>
                          <td>{(m as any).frequency || "Monthly"}</td>
                          <td className="col-right font-medium">₹{m.amount.toFixed(2)}</td>
                          <td className="col-right text-emerald-600 dark:text-emerald-400 font-medium">₹{totalPaid.toFixed(2)}</td>
                          <td className="col-right text-rose-600 dark:text-rose-400 font-medium">₹{balance.toFixed(2)}</td>
                          <td className="col-right">{statusBadge}</td>
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
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Record Payment</h2>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              
              <div className="space-y-3 mb-4">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Fee Breakdown <span className="text-rose-500">*</span></label>
                <div className="border border-border rounded-lg divide-y divide-border max-h-[250px] overflow-y-auto">
                  {selectedFees.map(id => {
                    const master = studentMasters.find(m => m._id === id);
                    if (!master) return null;
                    const balance = getBalance(master);
                    return (
                      <div key={id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50">
                        <div>
                          <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{typeof master.fee_type_id === 'object' ? master.fee_type_id.name : "Fee"}</div>
                          <div className="text-[11px] text-slate-500">Bal: ₹{balance.toFixed(2)}</div>
                        </div>
                        <div className="w-32 relative">
                          <span className="absolute left-3 top-2.5 text-slate-500 text-[13px]">₹</span>
                          <input 
                            required 
                            type="number" 
                            min="0" 
                            max={balance}
                            step="0.01" 
                            value={amounts[id] || ""} 
                            onChange={e => handleAmountChange(id, e.target.value)} 
                            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-border rounded text-[13px] outline-none focus:border-primary font-bold text-right" 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="flex justify-between text-[14px] bg-primary/10 p-3 rounded-lg border border-primary/20">
                <span className="text-primary font-bold">Grand Total</span>
                <span className="font-black text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setPayModalOpen(false)} className="px-4 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={saving || grandTotal === 0} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptModalOpen && lastReceipts.length > 0 && (() => {
        const copiesConfig: Record<number, string[]> = {
          1: ["OFFICIAL COPY"],
          2: ["STUDENT COPY", "OFFICE COPY"],
          3: ["STUDENT COPY", "OFFICE COPY", "BANK / ACCOUNTS COPY"],
        };
        const activeCopies = copiesConfig[receiptCopies] || ["OFFICIAL COPY"];
        const isCompact = pageMode === "single" && receiptCopies > 1;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:bg-white print:p-0 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 print:shadow-none print:w-full print:max-w-none my-8">
              
              {/* Header / Selector Controls (Hidden on print) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-border flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Copy Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2">Copies:</span>
                    <button
                      type="button"
                      onClick={() => setReceiptCopies(1)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        receiptCopies === 1
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70"
                      }`}
                    >
                      1 Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptCopies(2)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        receiptCopies === 2
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70"
                      }`}
                    >
                      2 Copies
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptCopies(3)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        receiptCopies === 3
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70"
                      }`}
                    >
                      3 Copies
                    </button>
                  </div>

                  {/* Page Mode Selector */}
                  {receiptCopies > 1 && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2">Page Mode:</span>
                      <button
                        type="button"
                        onClick={() => setPageMode("single")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          pageMode === "single"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70"
                        }`}
                        title="Both copies print on 1 page with a cut line"
                      >
                        📄 1 Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageMode("separate")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          pageMode === "separate"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70"
                        }`}
                        title="Each copy prints on its own separate page"
                      >
                        📑 Separate Pages
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={() => setReceiptModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors">
                  Close
                </button>
              </div>

              {/* Printable Content */}
              <div className="p-6 md:p-8 print:p-0 space-y-6" id="printable-receipt" data-print-zone="true">
                {activeCopies.map((copyLabel, idx) => {
                  const isLast = idx === activeCopies.length - 1;

                  return (
                    <React.Fragment key={idx}>
                      <div
                        className={isCompact ? "space-y-3" : "space-y-4"}
                        style={
                          !isLast && pageMode === "separate"
                            ? { pageBreakAfter: "always", breakAfter: "page" }
                            : undefined
                        }
                      >
                        <div className="text-center pb-2 border-b-2 border-slate-900">
                          <h2 className={`font-black text-slate-900 dark:text-white uppercase tracking-wider ${isCompact ? "text-lg" : "text-2xl"}`}>
                            EduManage School
                          </h2>
                          <div className="mt-1">
                            <span className="inline-block px-3 py-0.5 rounded-full border border-slate-900 bg-slate-50 text-slate-900 font-extrabold text-[10px] uppercase tracking-wider">
                              Official Payment Receipt • {copyLabel}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                          <div>
                            <span className="text-slate-400 font-bold block">Receipt No:</span>
                            <span className="font-bold font-mono text-primary">{lastReceipts[0].receipt_number}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 font-bold block">Date:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{new Date(lastReceipts[0].transaction_date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="border-t border-b border-border py-2.5 text-xs font-sans">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 mb-1">
                            <span className="text-slate-400 font-bold">Received From:</span>
                            <span className="font-bold text-slate-900 dark:text-white md:col-span-2">{selectedStudent.name} (Adm: {selectedStudent.admission_no})</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                            <span className="text-slate-400 font-bold">Payment Method:</span>
                            <span className="font-bold text-slate-900 dark:text-white md:col-span-2">{lastReceipts[0].payment_method}</span>
                          </div>
                        </div>

                        {/* Breakdown Table */}
                        <div>
                          <table className="erp-table text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="py-1.5 text-left font-bold text-slate-700 dark:text-slate-300">Fee Particulars</th>
                                <th className="py-1.5 text-right font-bold text-slate-700 dark:text-slate-300">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {lastReceipts.map(rec => (
                                <tr key={rec._id}>
                                  <td className="py-1.5 text-slate-800 dark:text-slate-200">
                                    {rec.fee_master_id?.fee_type_id?.name || "Fee"} 
                                    <span className="text-[10px] text-slate-500 block">{rec.fee_master_id?.fee_group_id?.name}</span>
                                  </td>
                                  <td className="py-1.5 text-right font-semibold text-slate-900 dark:text-white">₹{rec.amount_paid.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg flex justify-between items-center print:bg-slate-100 print:text-black">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Total Amount Paid:</span>
                          <span className={`font-black text-primary ${isCompact ? "text-base" : "text-xl"}`}>
                            ₹{lastReceipts.reduce((sum, r) => sum + r.amount_paid, 0).toFixed(2)}
                          </span>
                        </div>

                        <div className={`border-t border-border flex justify-between items-end ${isCompact ? "pt-5 mt-4" : "pt-8 mt-6"}`}>
                          <div className="text-center">
                            <div className="w-28 border-b border-slate-300 mb-1"></div>
                            <span className="text-[10px] text-slate-500 font-bold">Accountant Signature</span>
                          </div>
                          <div className="text-center text-[10px] text-slate-400">
                            Generated by EduManage System
                          </div>
                        </div>
                      </div>

                      {!isLast && pageMode === "single" && (
                        <div className="my-4 flex items-center justify-center text-center">
                          <div className="flex-1 border-b border-dashed border-slate-400"></div>
                          <span className="px-2 py-0.5 bg-slate-100 border border-dashed border-slate-400 rounded-full text-[9px] font-bold text-slate-500 mx-2">
                            ✂ CUT ALONG THIS LINE ✂
                          </span>
                          <div className="flex-1 border-b border-dashed border-slate-400"></div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Action Buttons (Hidden on print) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-border flex flex-wrap justify-end gap-3 print:hidden">
                <button onClick={() => setReceiptModalOpen(false)} className="px-4 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  Close
                </button>
                <button
                  onClick={() => {
                    if (lastReceipts[0]?._id) {
                      setGeneratePaymentId(lastReceipts[0]._id);
                      setIsGenerateOpen(true);
                    }
                  }}
                  className="px-4 py-2 text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                  style={{ background: "linear-gradient(90deg, #4338ca, #7c3aed)" }}
                >
                  <FileText className="w-4 h-4" /> Generate Receipt (PDF)
                </button>
                <button onClick={handlePrintReceipt} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
                  <Printer className="w-4 h-4" /> Print Receipt ({receiptCopies} {receiptCopies === 1 ? "Copy" : "Copies"}{receiptCopies > 1 ? ` • ${pageMode === "single" ? "1 Page" : `${receiptCopies} Pages`}` : ""})
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Generate Fee Receipt Wizard */}
      <GenerateDocumentWizard
        open={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        defaultModule="fees"
        defaultStudentId={selectedStudent?._id}
        defaultStudentName={selectedStudent?.name}
        defaultReferenceId={generatePaymentId || undefined}
        defaultReferenceLabel={selectedStudent?.name ? `Fee Receipt — ${selectedStudent.name}` : undefined}
      />
    </div>
  );
}
