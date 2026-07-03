"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useTeachers } from "@/app/hooks/useTeachers";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Search, 
  Check, 
  FileText, 
  Download, 
  Loader2, 
  CreditCard,
  Printer,
  ChevronDown,
  X,
  Briefcase,
  CheckCircle
} from "lucide-react";
import { Modal } from "../../components/ui/modal";
import { getPersistedPageSize, PaginationBar } from "@/app/components/ui/pagination-bar";

export default function SalaryDashboardPage() {
  const { teachers, isLoading } = useTeachers();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(10));

  // Modal State
  const [payslipData, setPayslipData] = useState<any | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<any | null>(null);
  const [payingState, setPayingState] = useState(false);

  // Dynamic calculations based on teacher data
  const salaryList = useMemo(() => {
    return teachers.map((t) => {
      const basic = t.basic_salary || 0;
      const allowances = Math.round(basic * 0.10);
      const deductions = Math.round(basic * 0.05);
      const net = basic + allowances - deductions;
      const userRole = typeof t.user_id === "object" && t.user_id ? t.user_id.role : "Teacher";
      return {
        id: t._id,
        name: t.name,
        empId: t.employee_id || "EMP-N/A",
        role: userRole,
        basic,
        allowances,
        deductions,
        net,
        // Mocking payment status dynamically (if basic > 0, it has a payroll)
        status: basic > 0 ? "Paid" : "Pending Setup",
        paymentDate: basic > 0 ? "05 May 2026" : "—"
      };
    });
  }, [teachers]);

  // Filters
  const filteredSalaries = useMemo(() => {
    return salaryList.filter((s) => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.empId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || 
        (selectedStatus === "paid" && s.status === "Paid") ||
        (selectedStatus === "pending" && s.status === "Pending Setup");
      return matchesSearch && matchesStatus;
    });
  }, [salaryList, searchTerm, selectedStatus]);

  // Pagination Slice
  const totalItems = filteredSalaries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedSalaries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSalaries.slice(start, start + pageSize);
  }, [filteredSalaries, currentPage, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const activePayrolls = salaryList.filter(s => s.basic > 0).length;
    const totalPayrollExpense = salaryList.reduce((sum, s) => sum + s.net, 0);
    const totalDeductions = salaryList.reduce((sum, s) => sum + s.deductions, 0);
    return { activePayrolls, totalPayrollExpense, totalDeductions };
  }, [salaryList]);

  const handleRecordPayment = (record: any) => {
    setPaymentRecord(record);
  };

  const submitPayment = () => {
    setPayingState(true);
    setTimeout(() => {
      setPayingState(false);
      alert(`Payroll disbursement of ₹${paymentRecord?.net.toLocaleString()} for ${paymentRecord?.name} simulated successfully!`);
      setPaymentRecord(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Salary & Payroll Desk</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Finance</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Salary</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : salaryList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-12 card-shadow text-center text-slate-400 font-semibold">
          No employee records found in the database. Please add teachers first.
        </div>
      ) : (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Monthly Payroll</span>
                  <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">₹{metrics.totalPayrollExpense.toLocaleString()}</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/25 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200">
                <TrendingUp className="w-3.5 h-3.5" /> Calculated
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Active Payrolls</span>
                  <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">{metrics.activePayrolls} Employees</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-500/25 px-2.5 py-1 rounded-full border border-indigo-200">
                Configured
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Monthly Deductions</span>
                  <span className="text-2xl font-bold block text-rose-600 mt-0.5">₹{metrics.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-500/25 px-2.5 py-1 rounded-full border border-rose-200">
                Tax/EPF
              </span>
            </div>
          </div>

          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative text-left flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee by name or ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 shadow-sm transition-all"
              />
            </div>
            
            <div className="relative text-left">
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-xl outline-none focus:border-primary transition-colors appearance-none shadow-sm cursor-pointer pr-10"
              >
                <option value="all">All Setup Status</option>
                <option value="paid">Paid (Configured)</option>
                <option value="pending">Pending Setup</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/50 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Emp ID</th>
                    <th className="px-6 py-4">Basic Salary</th>
                    <th className="px-6 py-4">Allowances</th>
                    <th className="px-6 py-4">Deductions</th>
                    <th className="px-6 py-4">Net Salary</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedSalaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-semibold">
                        No payroll accounts matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    pagedSalaries.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/teachers/${s.id}`} className="font-bold text-primary hover:underline">
                            {s.name}
                          </Link>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.role}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-600 dark:text-slate-350">{s.empId}</td>
                        <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                          {s.basic > 0 ? `₹${s.basic.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                          {s.basic > 0 ? `₹${s.allowances.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                          {s.basic > 0 ? `₹${s.deductions.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                          {s.basic > 0 ? `₹${s.net.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            s.basic > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.basic > 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {s.basic > 0 ? (
                              <>
                                <button
                                  onClick={() => handleRecordPayment(s)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3" /> Record Pay
                                </button>
                                <button
                                  onClick={() => setPayslipData(s)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> Payslip
                                </button>
                              </>
                            ) : (
                              <Link
                                href={`/teachers/${s.id}/edit`}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-border rounded-md hover:bg-slate-200 transition-colors inline-block"
                              >
                                Setup Salary
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* DISBURSEMENT GATEWAY MODAL */}
      {paymentRecord && (
        <Modal isOpen={!!paymentRecord} onClose={() => setPaymentRecord(null)} title="Disburse Salary Payroll">
          <div className="space-y-4 text-left">
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Disbursement Total</span>
              <h3 className="text-2xl font-mono font-bold">₹{paymentRecord.net.toLocaleString()}</h3>
              <p className="text-[12px] text-slate-300 border-t border-slate-700 pt-2 mt-2">
                Paying: <span className="text-white font-bold">{paymentRecord.name}</span> ({paymentRecord.empId})
              </p>
            </div>

            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Basic Salary</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{paymentRecord.basic.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Monthly Allowances</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{paymentRecord.allowances.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span className="font-medium">Total Deductions</span>
                <span className="font-bold">₹{paymentRecord.deductions.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setPaymentRecord(null)}
                className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={payingState}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {payingState && <Loader2 className="w-4 h-4 animate-spin" />}
                Disburse Pay
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PAYSLIP MODAL */}
      {payslipData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between p-4 border-b border-border print:hidden">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Monthly Payslip</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Payslip
                </button>
                <button 
                  onClick={() => setPayslipData(null)}
                  className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible print:w-full print:absolute print:left-0 print:top-0 text-left" id="printable-payslip">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * { visibility: hidden; }
                  #printable-payslip, #printable-payslip * { visibility: visible; }
                  #printable-payslip { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
                }
              `}} />

              {/* School Info */}
              <div className="text-center mb-8 border-b-2 border-slate-800 pb-5">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">MySchoolLife Academy</h1>
                <p className="text-slate-500 text-[13px] dark:text-slate-450">123 Education Lane, Learning City, 10001</p>
                <div className="mt-4 inline-block bg-slate-950 text-white px-5 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm">
                  Employee Salary Payslip
                </div>
              </div>

              {/* Employee & Pay Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 mb-8 text-[13px]">
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400 w-32">Employee Name:</span>
                  <span className="font-semibold text-slate-950 dark:text-white">{payslipData.name}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400 w-32">Employee ID:</span>
                  <span className="font-mono font-semibold text-slate-950 dark:text-white">{payslipData.empId}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400 w-32">Designation / Role:</span>
                  <span className="font-semibold text-slate-950 dark:text-white">{payslipData.role}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400 w-32">Pay Period:</span>
                  <span className="font-semibold text-slate-950 dark:text-white">May 2026</span>
                </div>
              </div>

              {/* Salary Breakdown Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-[13px]">
                {/* Earnings */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200">
                    Earnings (Allowances)
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Basic Salary</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{payslipData.basic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">HRA / Allowances</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{payslipData.allowances.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200">
                    Deductions
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">EPF / Pension</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{Math.round(payslipData.basic * 0.03).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Professional Tax</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{Math.round(payslipData.basic * 0.02).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary Summary */}
              <div className="bg-slate-950 text-white rounded-xl p-5 flex items-center justify-between mb-12">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Earnings</span>
                  <div className="text-lg font-bold">₹{(payslipData.basic + payslipData.allowances).toLocaleString()}</div>
                </div>
                <div className="w-px h-10 bg-slate-800"></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Deductions</span>
                  <div className="text-lg font-bold">₹{payslipData.deductions.toLocaleString()}</div>
                </div>
                <div className="w-px h-10 bg-slate-800"></div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Disbursed</span>
                  <div className="text-2xl font-black text-emerald-400">₹{payslipData.net.toLocaleString()}</div>
                </div>
              </div>

              {/* Signature block */}
              <div className="flex justify-between items-end mt-12 pt-8 text-[13px] font-bold text-slate-800 dark:text-slate-100">
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1.5">Prepared By</div>
                </div>
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1.5">Employee Signature</div>
                </div>
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1.5">Authorized Signatory</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
