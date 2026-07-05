import React, { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import {
  X,
  User,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign,
  Loader2,
  Printer,
  CalendarDays
} from "lucide-react";

interface CollectFeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
}

export function CollectFeesModal({ isOpen, onClose, student }: CollectFeesModalProps) {
  const { academicYear } = useAppState();

  // Loading States
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Dynamic Dues details loaded from API
  const [billingDetails, setBillingDetails] = useState<any>(null);
  const [feeTypesList, setFeeTypesList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);

  // Period / Mode Selection
  const [collectionType, setCollectionType] = useState<"Monthly" | "Day Wise">("Monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalDays, setTotalDays] = useState(0);
  const [validationError, setValidationError] = useState("");

  // Payment Form Fields
  const [feeGroup, setFeeGroup] = useState("Academic Session 2026");
  const [selectedFeeType, setSelectedFeeType] = useState("");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Cheque" | "Bank Transfer" | "Online" | "UPI">("Cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  // Step flow: 'form' | 'receipt'
  const [step, setStep] = useState<"form" | "receipt">("form");
  const [recordedPaymentResult, setRecordedPaymentResult] = useState<any | null>(null);

  // Fallback avatar helper
  const getAvatar = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=D2232A&color=fff&bold=true`;
  };

  const studentId = student?._id || student?.id;
  const studentClassId = student?.class_id?._id || student?.class_id;

  // 1. Fetch Student dynamic billing ledger & payments history when modal opens
  useEffect(() => {
    if (!isOpen || !studentId) return;

    // Reset local form states
    setStep("form");
    setBillingDetails(null);
    setRecordedPaymentResult(null);
    setCollectionType("Monthly");
    setCollectionDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Cash");
    setReferenceNo("");
    setNotes("");
    setValidationError("");

    const loadLedgerInfo = async () => {
      setIsLoadingDetails(true);
      try {
        // Fetch ledger statistics
        const res = await fetch(`/api/fees?student_id=${studentId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.data.students && data.data.students.length > 0) {
          const detail = data.data.students[0];
          setBillingDetails(detail);
          setCollectAmount(detail.balanceAmount.toString());
        }

        // Fetch class or custom student fee types config
        if (studentClassId) {
          const cRes = await fetch(`/api/fees?config_only=true&student_id=${studentId}&class_id=${studentClassId}&academic_year=2026`, {
            headers: getAuthHeaders()
          });
          const cData = await cRes.json();
          if (cData.success && cData.data?.fee_types) {
            const activeTypes = cData.data.fee_types.filter((f: any) => f.is_enabled);
            setFeeTypesList(activeTypes);
            if (activeTypes.length > 0) setSelectedFeeType(activeTypes[0].name);
          }
        }

        // Fetch existing payment history to establish latest paid boundaries
        const pRes = await fetch(`/api/fees/payments?student_id=${studentId}`, { headers: getAuthHeaders() });
        const pData = await pRes.json();
        let lastEndPaidStr: string | null = null;
        if (pData.success && pData.data?.payments?.length > 0) {
          setPaymentsList(pData.data.payments);
          const validPayments = pData.data.payments.filter((p: any) => p.end_date);
          if (validPayments.length > 0) {
            const sorted = [...validPayments].sort(
              (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
            );
            lastEndPaidStr = sorted[0].end_date;
          }
        }

        // Establish Default Start & End Dates for Monthly Mode
        const todayStr = new Date().toISOString().split("T")[0];
        setEndDate(todayStr);

        if (lastEndPaidStr && !isNaN(new Date(lastEndPaidStr).getTime())) {
          const nextDay = new Date(lastEndPaidStr);
          nextDay.setDate(nextDay.getDate() + 1);
          setStartDate(nextDay.toISOString().split("T")[0]);
        } else {
          // Fallback to student's joined / admission date
          const rawJoin = student.admission_date || student.joinedDate || student.createdAt;
          const fallbackStart = rawJoin && !isNaN(new Date(rawJoin).getTime()) ? new Date(rawJoin).toISOString().split("T")[0] : "2026-01-01";
          setStartDate(fallbackStart);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadLedgerInfo();
  }, [isOpen, studentId, studentClassId]);

  // 2. Auto-set date ranges & validate overlapping boundaries whenever variables mutate
  useEffect(() => {
    if (collectionType === "Day Wise") {
      return;
    }

    const validPayments = paymentsList.filter((p: any) => p.end_date);
    if (validPayments.length > 0) {
      const sorted = [...validPayments].sort(
        (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      );
      const lastEndPaidStr = sorted[0].end_date;
      if (lastEndPaidStr && !isNaN(new Date(lastEndPaidStr).getTime())) {
        const nextDay = new Date(lastEndPaidStr);
        nextDay.setDate(nextDay.getDate() + 1);
        setStartDate(nextDay.toISOString().split("T")[0]);
      } else {
        const rawJoin = student?.admission_date || student?.joinedDate || student?.createdAt;
        const fallbackStart = rawJoin && !isNaN(new Date(rawJoin).getTime()) ? new Date(rawJoin).toISOString().split("T")[0] : "2026-01-01";
        setStartDate(fallbackStart);
      }
    } else {
      const rawJoin = student?.admission_date || student?.joinedDate || student?.createdAt;
      const fallbackStart = rawJoin && !isNaN(new Date(rawJoin).getTime()) ? new Date(rawJoin).toISOString().split("T")[0] : "2026-01-01";
      setStartDate(fallbackStart);
    }
    setEndDate(new Date().toISOString().split("T")[0]);
  }, [collectionType, paymentsList, student]);

  // Recalculate days count and run validation triggers
  useEffect(() => {
    setValidationError("");
    if (!startDate || !endDate) {
      setTotalDays(0);
      return;
    }

    const startVal = new Date(startDate);
    const endVal = new Date(endDate);

    if (endVal < startVal) {
      setValidationError("End Date cannot be earlier than Start Date");
      setTotalDays(0);
      return;
    }

    const diffTime = Math.abs(endVal.getTime() - startVal.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setTotalDays(daysCount);

    // Overlapping period validator
    const hasOverlap = paymentsList.some((p) => {
      const pStart = new Date(p.start_date).getTime();
      const pEnd = new Date(p.end_date).getTime();
      return pStart <= endVal.getTime() && pEnd >= startVal.getTime();
    });

    if (hasOverlap) {
      setValidationError("Overlapping date range: duplicate fee payments are already recorded for this period.");
      return;
    }

    // Collection Date verification
    if (collectionDate && billingDetails?.lastPaymentDate) {
      const lastPayDate = new Date(billingDetails.lastPaymentDate);
      if (new Date(collectionDate) < lastPayDate) {
        setValidationError(`Collection Date cannot be earlier than the previous payment date (${new Date(lastPayDate).toLocaleDateString()}).`);
        return;
      }
    }

    // Amount validations
    const amountVal = Number(collectAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setValidationError("Amount to collect must be a positive number.");
      return;
    }
    if (billingDetails && amountVal > billingDetails.balanceAmount) {
      setValidationError("Amount to collect cannot exceed the remaining balance.");
      return;
    }
  }, [startDate, endDate, paymentsList, collectAmount, collectionDate, billingDetails]);

  if (!isOpen || !student) return null;

  // Calculation helpers
  const outstandingBalance = billingDetails ? billingDetails.balanceAmount : 0;
  const amountToCollect = Number(collectAmount || 0);
  const remainingBalanceAfter = Math.max(0, outstandingBalance - amountToCollect);

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

  // Submit Dues confirmation handler
  const handleCollectFeesSubmit = async () => {
    if (validationError) return;
    setIsRecording(true);
    try {
      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          student_id: studentId,
          amount_paid: amountToCollect,
          payment_method: paymentMethod === "UPI" ? "Online" : paymentMethod, // Map to schema compatibility
          remarks: `${notes}${referenceNo ? ` [Ref: ${referenceNo}]` : ""}`,
          payment_date: collectionDate,
          start_date: startDate,
          end_date: endDate,
          collection_type: collectionType,
        })
      });
      const data = await res.json();
      if (data.success) {
        setRecordedPaymentResult(data.data.payment);
        setStep("receipt");
      } else {
        alert(data.message || "Fee collection transaction failed");
      }
    } catch (e) {
      console.error(e);
      alert("Network connection failure recording fee collection");
    } finally {
      setIsRecording(false);
    }
  };

  const isRefVisible = ["Cheque", "Bank Transfer", "UPI"].includes(paymentMethod);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Mask */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={step !== "receipt" ? onClose : undefined} />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden transform transition-all text-left border border-border">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
              {step === "form" ? "Collect Student Fees" : "Payment Transaction Receipt"}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LOADING STATE DRAWER */}
        {isLoadingDetails ? (
          <div className="h-80 flex flex-col items-center justify-center text-slate-450 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-bold">Retrieving billing ledger info...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">

            {/* HEADER STUDENT SUMMARY CARD */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={student.photo_url || getAvatar(student.name)} 
                  className="w-12 h-12 rounded-full object-cover border border-slate-700 shadow-sm" 
                  alt="Student avatar" 
                />
                <div>
                  <h4 className="text-[13px] font-extrabold text-white leading-tight">{student.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wide mt-1">
                    Adm No: {student.admission_no || "N/A"} • Class: {billingDetails?.class_name || "Unassigned"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wide">
                    Academic Session: {academicYear || "Academic Session 2026"}
                  </p>
                </div>
              </div>

              <div className="flex gap-x-6 gap-y-1 text-right sm:text-right border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Payment Status</span>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold ${
                      billingDetails?.status === "Paid" 
                        ? "bg-emerald-500/20 text-emerald-300"
                        : billingDetails?.status === "Partial"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}>
                      {billingDetails?.status || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 1: DIRECT ENTRY FEE COLLECTION FORM */}
            {step === "form" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* LEFT COLUMN: PERIOD & FEE INFORMATION */}
                <div className="space-y-4">
                  {/* Payment Mode Selector Box */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-border rounded-xl space-y-3">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Payment Mode</label>
                    <div className="flex gap-4 text-xs font-bold">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="collectionType"
                          checked={collectionType === "Monthly"}
                          onChange={() => setCollectionType("Monthly")}
                          className="w-3.5 h-3.5 accent-primary cursor-pointer"
                        />
                        <span>Monthly</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="collectionType"
                          checked={collectionType === "Day Wise"}
                          onChange={() => {
                            setCollectionType("Day Wise");
                            setStartDate("");
                            setEndDate("");
                          }}
                          className="w-3.5 h-3.5 accent-primary cursor-pointer"
                        />
                        <span>Custom Date Range</span>
                      </label>
                    </div>

                    {/* Date Pickers */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                      <div className="flex flex-col gap-1 text-left">
                        <span className="font-bold text-slate-500 text-[10px]">Start Date</span>
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="px-2 py-1.5 border border-border bg-white dark:bg-slate-900 font-bold rounded-lg outline-none cursor-pointer text-slate-700"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <span className="font-bold text-slate-500 text-[10px]">End Date</span>
                        <input 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="px-2 py-1.5 border border-border bg-white dark:bg-slate-900 font-bold rounded-lg outline-none cursor-pointer text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fee Information Box (Read-Only) */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-border rounded-xl space-y-2.5 text-xs">
                    <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-border pb-1">
                      Fee Details (Read-only)
                    </h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-450 font-semibold">Fee Group:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{feeGroup}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-455 font-semibold">Fee Type:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedFeeType || "Academic Dues"}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1.5">
                        <span className="text-slate-455 font-semibold">Total Fees:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{money(billingDetails?.totalFees || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-455 font-semibold">Total Paid:</span>
                        <span className="font-mono font-bold text-emerald-600">{money(billingDetails?.totalPaid || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-455 font-semibold">Remaining Balance:</span>
                        <span className="font-mono font-bold text-rose-500">{money(outstandingBalance)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: PAYMENT INFORMATION & PAYMENT SUMMARY */}
                <div className="space-y-4">
                  {/* Payment Information Form */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-border rounded-xl space-y-3 text-xs">
                    <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-border pb-1">
                      Payment Information
                    </h3>

                    <div className="flex flex-col gap-1 text-left">
                      <label className="font-bold text-slate-555">Amount to Collect (₹)</label>
                      <input 
                        type="number"
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-750 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="flex flex-col gap-1 text-left">
                      <label className="font-bold text-slate-555">Collection Date</label>
                      <input 
                        type="date"
                        value={collectionDate}
                        onChange={(e) => setCollectionDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-750 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1 text-left">
                      <label className="font-bold text-slate-555">Payment Method</label>
                      <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none cursor-pointer"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI / QR Code</option>
                      </select>
                    </div>

                    {isRefVisible && (
                      <div className="flex flex-col gap-1 text-left">
                        <label className="font-bold text-slate-555">Reference Number</label>
                        <input 
                          type="text"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-750 outline-none font-mono"
                          placeholder="Reference / Transaction ID"
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Summary Box */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2.5 text-xs">
                    <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 pb-1">
                      Payment Summary
                    </h3>
                    <div className="space-y-1.5 font-sans">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Outstanding Balance:</span>
                        <span className="font-mono font-bold text-slate-200">{money(outstandingBalance)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-450 font-bold border-t border-slate-850 pt-1.5">
                        <span>Collecting Now:</span>
                        <span className="font-mono">{money(amountToCollect)}</span>
                      </div>
                      <div className="flex justify-between text-rose-455 font-bold border-t border-dashed border-slate-850 pt-1.5">
                        <span>Balance After Payment:</span>
                        <span className="font-mono">{money(remainingBalanceAfter)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlap / Bounds error message */}
                {validationError && (
                  <div className="col-span-1 md:col-span-2 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 rounded-xl flex items-center gap-2 text-xs font-bold">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PRINTABLE FEE RECEIPT */}
            {step === "receipt" && recordedPaymentResult && (
              <div className="space-y-4">
                {/* Success Banner */}
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 text-emerald-600 rounded-xl flex items-center gap-2.5 text-xs font-bold">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  <span>Success! Fee payment recorded and receipt generated.</span>
                </div>

                <div id="printable-receipt" className="p-6 border border-slate-200 rounded-2xl bg-white text-slate-800 font-serif text-xs relative overflow-hidden">
                  
                  {/* Branding Header */}
                  <div className="text-center border-b-2 border-slate-800 pb-3.5 mb-4">
                    <h1 className="text-lg font-black uppercase tracking-wider text-slate-900 mb-0.5">My School ERP</h1>
                    <p className="text-slate-455 text-[9px] tracking-wide font-sans">Student Fee Payment Receipt</p>
                    <div className="mt-2.5 inline-block bg-slate-900 text-white px-3 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-widest font-sans">
                      Fees Payment Receipt
                    </div>
                  </div>

                  {/* Fields list */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-6 mb-5 font-sans text-[10px]">
                    <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-455 w-24 text-left">Student Name:</span>
                      <span className="font-bold text-slate-900">{student.name}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-455 w-24 text-left">Admission No:</span>
                      <span className="font-mono font-bold text-slate-900">{student.admission_no || "N/A"}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-455 w-24 text-left">Class Details:</span>
                      <span className="font-bold text-slate-900">{billingDetails?.class_name || "N/A"}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-455 w-24 text-left">Receipt Number:</span>
                      <span className="font-mono font-bold text-primary">{recordedPaymentResult.receipt_number || recordedPaymentResult.receipt_no}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-200 pb-0.5 col-span-2">
                      <span className="font-bold text-slate-455 w-24 text-left">Collection Type:</span>
                      <span className="font-semibold text-slate-900">{recordedPaymentResult.collection_type || collectionType}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-200 pb-0.5 col-span-2">
                      <span className="font-bold text-slate-455 w-24 text-left">Collection Period:</span>
                      <span className="font-semibold text-slate-900">
                        {fmtDate(recordedPaymentResult.start_date || startDate)} – {fmtDate(recordedPaymentResult.end_date || endDate)}
                      </span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-455 w-24 text-left">Payment Method:</span>
                      <span className="font-semibold text-slate-900">{recordedPaymentResult.payment_method || paymentMethod}</span>
                    </div>
                    <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-455 w-24 text-left">Payment Date:</span>
                      <span className="font-semibold text-slate-900">{fmtDate(recordedPaymentResult.payment_date)}</span>
                    </div>
                  </div>

                  {/* Summary aggregate details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-sans space-y-1.5 mb-6 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-455 font-bold">Total Fees Configured:</span>
                      <span className="font-mono font-bold text-slate-900">{money(recordedPaymentResult.totalFees || (billingDetails ? billingDetails.totalFees : 0))}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-800">
                      <span>Amount Paid ({paymentMethod}):</span>
                      <span className="font-mono text-emerald-600">{money(recordedPaymentResult.amount_paid || recordedPaymentResult.total_amount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 font-bold text-slate-900 text-xs">
                      <span>Outstanding Balance Due:</span>
                      <span className="font-mono text-rose-500">{money(recordedPaymentResult.balanceAmount ?? 0)}</span>
                    </div>
                  </div>

                  {/* Remarks */}
                  {notes && (
                    <p className="italic text-[9px] text-slate-455 font-sans mb-6">Remarks: {notes}</p>
                  )}

                  {/* Signature pads */}
                  <div className="flex justify-between items-end pt-5 font-sans text-[9px] font-bold text-slate-550">
                    <div className="text-center w-28 border-t border-slate-300 pt-1.5">Depositor Signature</div>
                    <div className="text-center w-28 border-t border-slate-300 pt-1.5">Authorized cashier</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer controls */}
        {!isLoadingDetails && (
          <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
            {step === "form" ? (
              <>
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 border border-border text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCollectFeesSubmit}
                  disabled={isRecording || !!validationError || !startDate || !endDate}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                >
                  {isRecording && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Collect Fees</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Download PDF</span>
                </button>
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 border border-border text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
