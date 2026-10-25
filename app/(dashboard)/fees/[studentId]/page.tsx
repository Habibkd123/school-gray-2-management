"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import { useAuth } from "@/app/context/auth";
import { usePublicSchoolInfo } from "@/app/hooks/usePublicSchoolInfo";
import { Modal } from "@/app/components/ui/modal";
import { CollectFeesModal } from "@/app/components/modals/CollectFeesModal";
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  FileText,
  Printer,
  AlertCircle,
  CheckCircle2,
  Percent,
  Gift,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PrintService } from "@/app/lib/print-service";

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
  start_date?: string;
  end_date?: string;
  collection_type?: string;
  payment_method: "Cash" | "Cheque" | "Bank Transfer" | "Online";
  remarks?: string;
  discount?: number;
  fine?: number;
  scholarship?: number;
  waiver?: number;
  adjustment?: number;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from");
  const backUrl = fromQuery || "/settings/profile?tab=finance&sub=fees";

  const resolvedParams = React.use(params);
  const studentId = resolvedParams.studentId;
  const { academicYear } = useAppState();
  const { school } = useAuth();
  const { schoolInfo } = usePublicSchoolInfo();

  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printedReceipt, setPrintedReceipt] = useState<any | null>(null);
  const [receiptCopies, setReceiptCopies] = useState<1 | 2 | 3>(1);
  const [pageMode, setPageMode] = useState<"single" | "separate">("single");
  const [isCollectFeeOpen, setIsCollectFeeOpen] = useState(false);

  const loadDetailsAndPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch dynamic student billing summary
      const studentRes = await fetch(`/api/fees?student_id=${studentId}${academicYear ? `&academic_year=${encodeURIComponent(academicYear)}` : ""}`, {
        headers: getAuthHeaders(),
      });
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
  }, [studentId, academicYear]);

  useEffect(() => {
    loadDetailsAndPayments();
  }, [loadDetailsAndPayments]);

  const money = (val: number | undefined | null) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val || 0);
  };

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Back Button & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-4">
          <Link
            href={backUrl}
            onClick={(e) => {
              if (!fromQuery && typeof window !== "undefined" && window.history.length > 1 && document.referrer.includes("/settings")) {
                e.preventDefault();
                router.back();
              }
            }}
            className="p-2 border border-border bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 transition-all text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-sm"
            title="Back to Finance Settings"
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

        {studentDetails && (
          <button
            onClick={() => setIsCollectFeeOpen(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <DollarSign className="w-4 h-4" /> Collect New Fee
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !studentDetails ? (
        <div className="bg-white border border-border p-10 rounded-xl text-center font-bold text-slate-400 text-xs">
          ⚠️ Unable to load student ledger history details.
        </div>
      ) : (
        <>
          {(() => {
            // Calculate total concessions/discounts given by school across all payments
            const totalDiscount = payments.reduce((sum, p) => sum + (Number(p.discount) || 0), 0);
            const totalScholarship = payments.reduce((sum, p) => sum + (Number(p.scholarship) || 0), 0);
            const totalWaiver = payments.reduce((sum, p) => sum + (Number(p.waiver) || 0), 0);
            const totalAdjustment = payments.reduce((sum, p) => sum + (Number(p.adjustment) || 0), 0);
            const totalConcessions = totalDiscount + totalScholarship + totalWaiver + totalAdjustment;

            const totalInvoice = Number(studentDetails.totalFees || 0);
            const totalCashPaid = payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);
            const adjustedBalance = Math.max(0, totalInvoice - (totalCashPaid + totalConcessions));
            const isSettledWithDiscount = totalInvoice > 0 && adjustedBalance === 0;

            return (
              <>
                {/* Summary Row cards */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${totalConcessions > 0 ? "lg:grid-cols-4" : "md:grid-cols-3"} gap-4 text-left`}>
                  {/* Card 1: Total Fees */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Fees Invoice</span>
                      <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{money(totalInvoice)}</div>
                    </div>
                  </div>

                  {/* Card 2: Cash Paid */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Paid (Cash)</span>
                      <div className="text-xl font-bold text-emerald-600 mt-0.5">{money(totalCashPaid)}</div>
                    </div>
                  </div>

                  {/* Card 3: School Discount / Concession (Shown if any discount/scholarship was granted) */}
                  {totalConcessions > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                        <Percent className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">School Discount / Concession</span>
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{money(totalConcessions)}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {[
                            totalDiscount > 0 ? `Discount: ${money(totalDiscount)}` : null,
                            totalScholarship > 0 ? `Scholarship: ${money(totalScholarship)}` : null,
                            totalWaiver > 0 ? `Waiver: ${money(totalWaiver)}` : null,
                          ].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card 4: Outstanding Dues */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${adjustedBalance === 0
                      ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600"
                      : "bg-rose-50 dark:bg-rose-950 text-rose-500"
                      }`}>
                      {adjustedBalance === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding Dues</span>
                      <div className={`text-xl font-bold mt-0.5 ${adjustedBalance === 0 ? "text-emerald-600" : "text-rose-500"
                        }`}>
                        {money(adjustedBalance)}
                      </div>
                      {totalConcessions > 0 && adjustedBalance === 0 && (
                        <span className="text-[10px] text-emerald-600 font-bold block">
                          Settled via Discount & Cash
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explanation Banner when School Discount / Scholarship is Applied */}
                {totalConcessions > 0 && (
                  <div className="bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-850 rounded-xl p-3.5 flex items-start gap-3 text-xs text-left">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-amber-900 dark:text-amber-200">
                          School Concession Note: {money(totalConcessions)} Fee Concession Applied
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          {isSettledWithDiscount ? "Full Fees Settled (No Due)" : "Partially Settled"}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                        This amount is not an outstanding due. A school concession of {money(totalConcessions)} (
                        {[
                          totalDiscount > 0 ? `Discount: ${money(totalDiscount)}` : null,
                          totalScholarship > 0 ? `Scholarship: ${money(totalScholarship)}` : null,
                          totalWaiver > 0 ? `Fee Waiver: ${money(totalWaiver)}` : null,
                        ].filter(Boolean).join(", ")}
                        ) was approved by the administration during fee collection, settling the total fee of ₹{totalInvoice.toLocaleString("en-IN")} alongside ₹{totalCashPaid.toLocaleString("en-IN")} received in cash.
                      </p>
                    </div>
                  </div>
                )}

                {/* Student metadata info banner */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-border rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Student Name</span>
                    <span className="text-slate-900 dark:text-white font-bold text-[13px]">{studentDetails.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Admission No</span>
                    <span className="text-slate-900 dark:text-white font-mono font-bold text-[13px]">{studentDetails.admission_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Class & Section</span>
                    <span className="text-slate-900 dark:text-white font-bold text-[13px]">{studentDetails.class_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Payment Status</span>
                    <span
                      className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isSettledWithDiscount || studentDetails.status === "Paid"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : studentDetails.status === "Partial"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        }`}
                    >
                      {isSettledWithDiscount ? "Paid (Discount Settled)" : studentDetails.status}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Transaction logs table list */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
            <div className="p-4 border-b border-border font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>Billing Ledger Transactions Log</span>
              <span className="text-xs font-normal text-slate-500">
                {payments.length} {payments.length === 1 ? "Record" : "Records"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table text-xs w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-border text-slate-500 font-bold">
                    <th className="px-6 py-3.5">Receipt Number</th>
                    <th className="px-6 py-3.5">Payment Date</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Ledger Remarks & Concessions</th>
                    <th className="px-6 py-3.5 text-right">Amount Paid</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                        No transactions recorded in billing history logs.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const pDiscount = Number(p.discount || 0);
                      const pScholarship = Number(p.scholarship || 0);
                      const pWaiver = Number(p.waiver || 0);
                      const pTotalConcession = pDiscount + pScholarship + pWaiver;

                      return (
                        <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-primary">{p.receipt_number || p.receipt_no}</td>
                          <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{fmtDate(p.payment_date)}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                              {p.payment_method}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            <div>{p.remarks || "—"}</div>
                            {pTotalConcession > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {pDiscount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-200/50">
                                    Discount: {money(pDiscount)}
                                  </span>
                                )}
                                {pScholarship > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200/50">
                                    Scholarship: {money(pScholarship)}
                                  </span>
                                )}
                                {pWaiver > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-200/50">
                                    Waiver: {money(pWaiver)}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-mono font-bold text-emerald-600">
                              {money(p.amount_paid || p.total_amount)}
                            </div>
                            {pTotalConcession > 0 && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-sans mt-0.5 font-medium">
                                + {money(pTotalConcession)} Concession
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  const configRes = await fetch(
                                    `/api/fees?config_only=true&student_id=${studentId}`,
                                    { headers: getAuthHeaders() }
                                  );
                                  const configData = await configRes.json();
                                  const config = configData.success ? configData.data.fee_types : [];

                                  setPrintedReceipt({
                                    ...p,
                                    feeTypesConfig: config,
                                    paymentsHistory: payments,
                                    student_id: {
                                      name: studentDetails.name,
                                      admission_no: studentDetails.admission_no,
                                      class_id: {
                                        name: studentDetails.class_name.split(" - ")[0],
                                        section: studentDetails.class_name.split(" - ")[1] || "",
                                      },
                                    },
                                  });
                                } catch (err) {
                                  console.error(err);
                                  setPrintedReceipt({
                                    ...p,
                                    student_id: {
                                      name: studentDetails.name,
                                      admission_no: studentDetails.admission_no,
                                      class_id: {
                                        name: studentDetails.class_name.split(" - ")[0],
                                        section: studentDetails.class_name.split(" - ")[1] || "",
                                      },
                                    },
                                  });
                                }
                              }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                            >
                              Print Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL: PRINTABLE TRANSACTION RECEIPT */}
      {printedReceipt && (
        <Modal
          isOpen={!!printedReceipt}
          onClose={() => setPrintedReceipt(null)}
          title="Payment Transaction Receipt"
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Copy selector toggle */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2">Copies:</span>
                  <button
                    type="button"
                    onClick={() => setReceiptCopies(1)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${receiptCopies === 1
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                      }`}
                  >
                    1 Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptCopies(2)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${receiptCopies === 2
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                      }`}
                  >
                    2 Copies
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptCopies(3)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${receiptCopies === 3
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                      }`}
                  >
                    3 Copies
                  </button>
                </div>

                {/* Page layout mode (when multiple copies selected) */}
                {receiptCopies > 1 && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2">Page Mode:</span>
                    <button
                      type="button"
                      onClick={() => setPageMode("single")}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${pageMode === "single"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                        }`}
                      title="Both copies print on 1 page with a cut line"
                    >
                      📄 1 Page (Half Cut)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageMode("separate")}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${pageMode === "separate"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                        }`}
                      title="Each copy prints on its own separate page"
                    >
                      📑 Separate Pages ({receiptCopies} Pages)
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => PrintService.print("printable-receipt", { pageSize: "A4" })}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print / PDF ({receiptCopies} {receiptCopies === 1 ? "Copy" : "Copies"}{receiptCopies > 1 ? ` • ${pageMode === "single" ? "1 Page" : `${receiptCopies} Pages`}` : ""})
              </button>
            </div>

            {/* Receipt template container */}
            <div
              className="p-6 md:p-8 border border-slate-200 rounded-2xl bg-white text-slate-800 text-left font-serif text-xs relative overflow-hidden"
              id="printable-receipt"
              data-print-zone="true"
            >
              {(() => {
                const activeSchool = (printedReceipt.school_id && typeof printedReceipt.school_id === "object") ? printedReceipt.school_id : (school || {});
                const schoolName = activeSchool.name || schoolInfo?.school_name || "Bajrang Shikshan Sansthan";
                const schoolSubtitle = activeSchool.subtitle || schoolInfo?.school_subtitle || "Sec. Sch. Padu Khurd";
                const schoolLogo = activeSchool.logo_url || schoolInfo?.logo_url || null;
                const schoolAddress = activeSchool.address || (activeSchool.city ? `${activeSchool.city}, ${activeSchool.state || ""}` : (school?.address || ""));
                const schoolPhone = activeSchool.phone || school?.phone || "";
                const schoolEmail = activeSchool.email || school?.email || "";

                // Calculate enriched ledger breakdown
                const receiptBreakdown = (printedReceipt.fee_breakdown || []).map((item: any) => {
                  const config = (printedReceipt.feeTypesConfig || []).find((c: any) => c.name === item.name);
                  const start = new Date(printedReceipt.start_date);
                  const end = new Date(printedReceipt.end_date);
                  let mult = 1;
                  if (config && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
                    if (config.frequency !== "One Time") {
                      const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
                      switch (config.frequency) {
                        case "Monthly":
                          mult = Math.max(1, monthsDiff);
                          break;
                        case "Quarterly":
                          mult = Math.max(1, Math.ceil(monthsDiff / 3));
                          break;
                        case "Half Yearly":
                          mult = Math.max(1, Math.ceil(monthsDiff / 6));
                          break;
                        case "Yearly":
                          mult = 1;
                          break;
                      }
                    }
                  }

                  const totalAmount = config ? config.amount * mult : item.amount_paid;
                  let paidBefore = 0;
                  if (printedReceipt.paymentsHistory) {
                    printedReceipt.paymentsHistory.forEach((p: any) => {
                      if (p._id !== printedReceipt._id) {
                        const match = p.fee_breakdown?.find((f: any) => f.name === item.name);
                        if (match) paidBefore += match.amount_paid;
                      }
                    });
                  }

                  const paidNow = item.amount_paid;
                  const totalPaid = paidBefore + paidNow;
                  const outstanding = Math.max(0, totalAmount - totalPaid);

                  let status = "Pending";
                  if (totalAmount > 0) {
                    if (totalPaid >= totalAmount) status = "Paid";
                    else if (totalPaid > 0) status = "Partial";
                  }

                  return {
                    name: item.name,
                    totalAmount,
                    paidBefore,
                    paidNow,
                    totalPaid,
                    outstanding,
                    status,
                  };
                });

                const copiesConfig: Record<number, string[]> = {
                  1: ["OFFICIAL COPY"],
                  2: ["STUDENT COPY", "OFFICE COPY"],
                  3: ["STUDENT COPY", "OFFICE COPY", "BANK / ACCOUNTS COPY"],
                };
                const activeCopies = copiesConfig[receiptCopies] || ["OFFICIAL COPY"];
                const isCompact = pageMode === "single" && receiptCopies > 1;

                return (
                  <div className="space-y-6">
                    {activeCopies.map((copyLabel, copyIdx) => {
                      const isLast = copyIdx === activeCopies.length - 1;

                      return (
                        <React.Fragment key={copyIdx}>
                          <div
                            className={`receipt-slip ${isCompact ? "space-y-2.5" : "space-y-4"} ${!isLast && pageMode === "separate" ? "receipt-page-break" : ""
                              }`}
                            style={
                              !isLast && pageMode === "separate"
                                ? { pageBreakAfter: "always", breakAfter: "page" }
                                : undefined
                            }
                          >
                            {/* School branding header */}
                            <div className={`border-b-2 border-slate-900 ${isCompact ? "pb-2.5 mb-3" : "pb-4 mb-5"}`}>
                              <div className="flex items-center gap-3">
                                {schoolLogo && (
                                  <img
                                    src={schoolLogo}
                                    alt="Logo"
                                    className={`${isCompact ? "w-11 h-11" : "w-16 h-16"} object-contain shrink-0`}
                                  />
                                )}
                                <div className={`flex-1 ${schoolLogo ? "text-left" : "text-center"}`}>
                                  <h1 className={`${isCompact ? "text-base" : "text-xl"} font-black uppercase tracking-wider text-slate-900 mb-0.5 leading-snug`}>
                                    {schoolName}
                                  </h1>
                                  {schoolSubtitle && (
                                    <p className={`text-slate-700 ${isCompact ? "text-[11px]" : "text-xs"} font-bold font-sans`}>
                                      {schoolSubtitle}
                                    </p>
                                  )}
                                  {schoolAddress && (
                                    <p className={`text-slate-500 ${isCompact ? "text-[9px]" : "text-[10px]"} font-sans`}>
                                      {schoolAddress}
                                    </p>
                                  )}
                                  {(schoolPhone || schoolEmail) && (
                                    <p className={`text-slate-500 ${isCompact ? "text-[8.5px]" : "text-[9px]"} font-sans`}>
                                      {[schoolPhone ? `Ph: ${schoolPhone}` : "", schoolEmail ? `Email: ${schoolEmail}` : ""].filter(Boolean).join(" | ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className={isCompact ? "mt-2 text-center" : "mt-3 text-center"}>
                                <span
                                  className="receipt-badge inline-block rounded-full font-black uppercase tracking-widest font-sans"
                                  style={{
                                    backgroundColor: "#f8fafc",
                                    color: "#0f172a",
                                    border: "1.5px solid #0f172a",
                                    padding: isCompact ? "2.5px 14px" : "3.5px 18px",
                                    fontSize: isCompact ? "9px" : "10px",
                                  }}
                                >
                                  Fees Payment Receipt • {copyLabel}
                                </span>
                              </div>
                            </div>

                            {/* Student Metadata fields grid */}
                            <div className={`grid grid-cols-1 md:grid-cols-2 ${isCompact ? "gap-y-1.5 gap-x-6 mb-3 text-[10px]" : "gap-y-2.5 gap-x-8 mb-5 text-[11px]"} font-sans`}>
                              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1">
                                <span className="font-bold text-slate-400">Student Name:</span>
                                <span className="font-bold text-slate-900">{printedReceipt.student_id?.name || "N/A"}</span>
                              </div>
                              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1">
                                <span className="font-bold text-slate-400">Admission No:</span>
                                <span className="font-mono font-bold text-slate-900">{printedReceipt.student_id?.admission_no || "N/A"}</span>
                              </div>
                              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1">
                                <span className="font-bold text-slate-400">Class & Section:</span>
                                <span className="font-bold text-slate-900">
                                  {printedReceipt.student_id?.class_id?.name
                                    ? `${printedReceipt.student_id.class_id.name}${printedReceipt.student_id.class_id.section ? ` - ${printedReceipt.student_id.class_id.section}` : ""}`
                                    : "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1">
                                <span className="font-bold text-slate-400">Receipt Number:</span>
                                <span className="font-mono font-bold text-primary tracking-wide">
                                  {printedReceipt.receipt_number || printedReceipt.receipt_no}
                                </span>
                              </div>
                              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1">
                                <span className="font-bold text-slate-400">Payment Date:</span>
                                <span className="font-bold text-slate-900">{fmtDate(printedReceipt.payment_date)}</span>
                              </div>
                              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1">
                                <span className="font-bold text-slate-400">Payment Method:</span>
                                <span className="font-bold text-slate-900">{printedReceipt.payment_method || "Cash"}</span>
                              </div>
                              {printedReceipt.start_date && printedReceipt.end_date && (
                                <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1 md:col-span-2">
                                  <span className="font-bold text-slate-400">Billing Range:</span>
                                  <span className="font-bold text-slate-800 font-mono">
                                    {fmtDate(printedReceipt.start_date)} – {fmtDate(printedReceipt.end_date)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Enriched Ledger Breakdown Table */}
                            <div className={`font-sans border border-slate-200 rounded-xl overflow-x-auto shadow-2xs ${isCompact ? "mb-2.5" : "mb-4"}`}>
                              <table className={`w-full ${isCompact ? "text-[10px]" : "text-[11px]"} whitespace-nowrap border-collapse min-w-[540px]`}>
                                <thead>
                                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[9.5px] tracking-wider">
                                    <th className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-left`}>Fee Head</th>
                                    <th className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right`}>Total Fee</th>
                                    <th className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right`}>Paid Before</th>
                                    <th className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right text-primary font-bold`}>Paid Now</th>
                                    <th className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right`}>Total Paid</th>
                                    <th className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right text-rose-600`}>Outstanding</th>
                                    <th className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-center`}>Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {receiptBreakdown.map((ft: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                      <td className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} font-bold text-slate-800`}>{ft.name}</td>
                                      <td className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right font-sans text-slate-700`}>{money(ft.totalAmount)}</td>
                                      <td className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right font-sans text-slate-500`}>{money(ft.paidBefore)}</td>
                                      <td className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right font-sans font-bold text-primary bg-primary/5`}>{money(ft.paidNow)}</td>
                                      <td className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right font-sans text-slate-800 font-semibold`}>{money(ft.totalPaid)}</td>
                                      <td className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-right font-sans font-bold text-rose-600 bg-rose-50/20`}>{money(ft.outstanding)}</td>
                                      <td className={`${isCompact ? "px-2.5 py-1.5" : "px-3.5 py-2.5"} text-center`}>
                                        <span
                                          className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${ft.status === "Paid"
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                            : ft.status === "Partial"
                                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                                              : "bg-rose-100 text-rose-800 border border-rose-200"
                                            }`}
                                        >
                                          {ft.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Concessions / Discounts and Summary aggregate details */}
                            <div className={`bg-slate-50 border border-slate-200 rounded-xl ${isCompact ? "p-2.5 mb-2.5 text-[10px]" : "p-4 mb-4 text-[11px]"} font-sans space-y-1.5`}>
                              {((printedReceipt.discount || 0) > 0 ||
                                (printedReceipt.scholarship || 0) > 0 ||
                                (printedReceipt.waiver || 0) > 0 ||
                                (printedReceipt.fine || 0) > 0) && (
                                  <div className="border-b border-dashed border-slate-200 pb-1.5 space-y-1 text-slate-600 text-[10px]">
                                    {(printedReceipt.discount || 0) > 0 && (
                                      <div className="flex justify-between">
                                        <span>Concession / Discount:</span>
                                        <span className="font-semibold text-emerald-600 font-mono">- {money(printedReceipt.discount)}</span>
                                      </div>
                                    )}
                                    {(printedReceipt.scholarship || 0) > 0 && (
                                      <div className="flex justify-between">
                                        <span>Scholarship:</span>
                                        <span className="font-semibold text-emerald-600 font-mono">- {money(printedReceipt.scholarship)}</span>
                                      </div>
                                    )}
                                    {(printedReceipt.waiver || 0) > 0 && (
                                      <div className="flex justify-between">
                                        <span>Waiver:</span>
                                        <span className="font-semibold text-emerald-600 font-mono">- {money(printedReceipt.waiver)}</span>
                                      </div>
                                    )}
                                    {(printedReceipt.fine || 0) > 0 && (
                                      <div className="flex justify-between">
                                        <span>Late Fine:</span>
                                        <span className="font-semibold text-rose-600 font-mono">+ {money(printedReceipt.fine)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                              <div className="flex justify-between items-center font-bold text-slate-900 pt-0.5">
                                <span className={isCompact ? "text-[11px]" : "text-[12px]"}>Total Amount Paid In This Transaction:</span>
                                <span className={`font-mono text-emerald-600 font-black ${isCompact ? "text-sm" : "text-base"}`}>
                                  {money(printedReceipt.amount_paid || printedReceipt.total_amount)}
                                </span>
                              </div>
                            </div>

                            {printedReceipt.remarks && (
                              <p className="italic text-[9.5px] text-slate-500 font-sans mb-3">Remarks: {printedReceipt.remarks}</p>
                            )}

                            {/* Audit Trail */}
                            <div className={`flex justify-between items-center pt-2.5 pb-1.5 ${isCompact ? "text-[8.5px] mt-2 mb-1" : "text-[9.5px] mt-4 mb-2"} text-slate-500 font-sans border-t border-dashed border-slate-200`}>
                              <span>Collected By: <strong className="text-slate-800">{printedReceipt.collected_by?.name || printedReceipt.collected_by?.username || "Authorized Cashier"}</strong></span>
                              <span>Computer Generated Official Fee Receipt</span>
                            </div>

                            {/* Signatures with ample writing gap & bottom padding */}
                            <div className={`flex justify-between items-end ${isCompact ? "pt-10 pb-3 text-[10px]" : "pt-16 pb-6 text-[11px]"} font-sans font-bold text-slate-700 signature-block`}>
                              <div className="text-center w-36 md:w-44 border-t-2 border-slate-300 pt-2">Depositor Signature</div>
                              <div className="text-center w-36 md:w-44 border-t-2 border-slate-300 pt-2">Authorized Cashier</div>
                            </div>
                          </div>

                          {/* Separator between copies */}
                          {!isLast && (
                            pageMode === "single" ? (
                              <div className="my-6 flex items-center justify-center gap-3 select-none print:my-4 print-keep-together">
                                <div className="flex-1 border-b-2 border-dashed border-slate-300"></div>
                                <span className="px-3 py-1 bg-slate-100 border border-dashed border-slate-300 rounded-full text-slate-500 font-sans text-[10px] font-bold tracking-wider flex items-center gap-1.5 shadow-2xs">
                                  ✂ <span>CUT ALONG THIS LINE</span> ✂
                                </span>
                                <div className="flex-1 border-b-2 border-dashed border-slate-300"></div>
                              </div>
                            ) : (
                              <div className="my-8 print:hidden flex items-center justify-center gap-3 select-none">
                                <div className="flex-1 border-b-2 border-dashed border-indigo-200 dark:border-indigo-800"></div>
                                <span className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-full text-indigo-700 dark:text-indigo-300 font-sans text-xs font-bold tracking-wide flex items-center gap-2 shadow-2xs">
                                  <span>📄 Page Break: Next Copy ({activeCopies[copyIdx + 1]}) Prints on Page {copyIdx + 2}</span>
                                </span>
                                <div className="flex-1 border-b-2 border-dashed border-indigo-200 dark:border-indigo-800"></div>
                              </div>
                            )
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPrintedReceipt(null)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: COLLECT FEES */}
      {studentDetails && (
        <CollectFeesModal
          isOpen={isCollectFeeOpen}
          onClose={() => {
            setIsCollectFeeOpen(false);
            loadDetailsAndPayments();
          }}
          student={{
            _id: studentId,
            name: studentDetails.name,
            admission_no: studentDetails.admission_no,
            class_id: studentDetails.class_id,
            class_name: studentDetails.class_name,
          }}
        />
      )}
    </div>
  );
}
