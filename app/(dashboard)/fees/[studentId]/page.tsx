"use client";

import React, { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import { Modal } from "@/app/components/ui/modal";
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  FileText,
  Printer,
  History,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard
} from "lucide-react";
import Link from "next/link";

interface PaymentHistoryPageProps {
  params: Promise<{ studentId: string }>;
}

interface PaymentLog {
  _id: string;
  receipt_number: string;
  receipt_no: string;
  amount_paid: number;
  total_amount: number;
  payment_date: string;
  payment_method: "Cash" | "Cheque" | "Bank Transfer" | "Online";
  remarks?: string;
  student_id: {
    _id: string;
    name: string;
    admission_no: string;
    class_id?: {
      name: string;
      section: string;
    };
  };
}

export default function StudentPaymentHistoryPage({ params }: PaymentHistoryPageProps) {
  const resolvedParams = React.use(params);
  const studentId = resolvedParams.studentId;
  const { academicYear } = useAppState();

  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printedReceipt, setPrintedReceipt] = useState<any | null>(null);

  useEffect(() => {
    const loadDetailsAndPayments = async () => {
      setIsLoading(true);
      try {
        // Fetch dynamic student billing summary
        const studentRes = await fetch(`/api/fees?student_id=${studentId}`, { headers: getAuthHeaders() });
        const studentData = await studentRes.json();
        if (studentData.success && studentData.data.students && studentData.data.students.length > 0) {
          setStudentDetails(studentData.data.students[0]);
        }

        // Fetch payments list
        const paymentsRes = await fetch(`/api/fees/payments?student_id=${studentId}`, { headers: getAuthHeaders() });
        const paymentsData = await paymentsRes.json();
        if (paymentsData.success) {
          setPayments(paymentsData.data.payments);
        }
      } catch (e) {
        console.error("Error loading payment history details", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadDetailsAndPayments();
  }, [studentId]);

  const money = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center gap-4 text-left">
        <Link
          href="/fees"
          className="p-2 border border-border bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 transition-all text-slate-655"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Dues Payment History</h1>
          <p className="page-desc mt-1">
            Browse complete billing ledger and receipts history list.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !studentDetails ? (
        <div className="bg-white border border-border p-10 rounded-xl text-center font-bold text-slate-450 text-xs">
          ⚠️ Unable to load student ledger history details.
        </div>
      ) : (
        <>
          {/* Summary Row cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-650">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Fees Invoice</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{money(studentDetails.totalFees)}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Paid Dues</span>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">{money(studentDetails.totalPaid)}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding Dues</span>
                <div className="text-xl font-bold text-rose-500 mt-0.5">{money(studentDetails.balanceAmount)}</div>
              </div>
            </div>
          </div>

          {/* Student metadata info banner */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-border rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div>Student Name: <span className="text-slate-900 dark:text-white font-extrabold">{studentDetails.name}</span></div>
            <div>Admission Number: <span className="text-slate-900 dark:text-white font-mono font-extrabold">{studentDetails.admission_no}</span></div>
            <div>Class & Section: <span className="text-slate-900 dark:text-white font-extrabold">{studentDetails.class_name}</span></div>
            <div>Status: 
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                studentDetails.status === "Paid" ? "bg-emerald-100 text-emerald-700" : studentDetails.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
              }`}>{studentDetails.status}</span>
            </div>
          </div>

          {/* Transaction logs table list */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
            <div className="p-4 border-b border-border font-bold text-slate-850 dark:text-slate-100">
              Billing Ledger Transactions Log
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-955/50 border-b border-border text-slate-500 font-bold">
                    <th className="px-6 py-3.5">Receipt Number</th>
                    <th className="px-6 py-3.5">Payment Date</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Ledger Remarks</th>
                    <th className="px-6 py-3.5 text-right">Amount Paid</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-450 font-bold">
                        No transactions recorded in billing history logs.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-mono font-bold text-primary">{p.receipt_number || p.receipt_no}</td>
                        <td className="px-6 py-4 font-semibold">{fmtDate(p.payment_date)}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{p.remarks || "—"}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                          {money(p.amount_paid || p.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              // We copy the student details into the printable view
                              setPrintedReceipt({
                                ...p,
                                student_id: {
                                  name: studentDetails.name,
                                  admission_no: studentDetails.admission_no,
                                  class_id: {
                                    name: studentDetails.class_name.split(" - ")[0],
                                    section: studentDetails.class_name.split(" - ")[1] || ""
                                  }
                                }
                              });
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Print Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL: PRINTABLE TRANSACTION RECEIPT */}
      {printedReceipt && (
        <Modal isOpen={!!printedReceipt} onClose={() => setPrintedReceipt(null)} title="Payment Transaction Receipt">
          <div className="space-y-4">
            <div className="flex justify-end gap-2 print:hidden border-b border-border pb-2.5">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print / PDF Receipt
              </button>
            </div>

            {/* Receipt template container */}
            <div className="p-8 border border-slate-200 rounded-2xl bg-white text-slate-800 text-left font-serif text-xs relative overflow-hidden" id="printable-receipt">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * { visibility: hidden; }
                  #printable-receipt, #printable-receipt * { visibility: visible; }
                  #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; border: none; margin: 0; padding: 20px; }
                }
              `}} />

              {/* School branding header */}
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 mb-0.5">My School Life</h1>
                <p className="text-slate-500 text-[10px] tracking-wide font-sans">Professional ERP Student Invoice Ledger</p>
                <div className="mt-3 inline-block bg-slate-900 text-white px-4 py-1 rounded-full font-bold text-[10px] uppercase tracking-widest font-sans">
                  Fees Payment Receipt
                </div>
              </div>

              {/* Student Metadata fields grid */}
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-8 mb-6 font-sans text-[11px]">
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-400 w-28">Student Name:</span>
                  <span className="font-bold text-slate-900">{printedReceipt.student_id?.name || "N/A"}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-400 w-28">Admission No:</span>
                  <span className="font-mono font-bold text-slate-900">{printedReceipt.student_id?.admission_no || "N/A"}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1 col-span-2">
                  <span className="font-bold text-slate-400 w-28">Class Assigned:</span>
                  <span className="font-bold text-slate-900">
                    {printedReceipt.student_id?.class_id?.name 
                      ? `${printedReceipt.student_id.class_id.name} - ${printedReceipt.student_id.class_id.section}`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-400 w-28">Receipt Number:</span>
                  <span className="font-mono font-bold text-primary">{printedReceipt.receipt_number || printedReceipt.receipt_no}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-400 w-28">Payment Date:</span>
                  <span className="font-bold text-slate-900">{fmtDate(printedReceipt.payment_date)}</span>
                </div>
              </div>

              {/* Transaction amounts summary card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 font-sans space-y-2 mb-8 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-450 font-bold">Total Fees Invoice:</span>
                  <span className="font-mono font-bold text-slate-900">{money(printedReceipt.totalFees || (studentDetails ? studentDetails.totalFees : 0))}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-800">
                  <span>Amount Paid Now ({printedReceipt.payment_method}):</span>
                  <span className="font-mono text-emerald-600">{money(printedReceipt.amount_paid || printedReceipt.total_amount)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 font-bold text-slate-900 text-xs">
                  <span>Outstanding Balance Due:</span>
                  <span className="font-mono text-rose-500">{money(printedReceipt.balanceAmount || (studentDetails ? Math.max(0, studentDetails.totalFees - studentDetails.totalPaid) : 0))}</span>
                </div>
              </div>

              {printedReceipt.remarks && (
                <p className="italic text-[10px] text-slate-450 font-sans mb-8">Remarks: {printedReceipt.remarks}</p>
              )}

              {/* Signatures */}
              <div className="flex justify-between items-end pt-6 font-sans text-[10px] font-bold text-slate-750">
                <div className="text-center w-32 border-t border-slate-350 pt-1.5">Depositor Signature</div>
                <div className="text-center w-32 border-t border-slate-350 pt-1.5">Authorized cashier</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPrintedReceipt(null)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
