"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import {
  ArrowLeft,
  User,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
  Printer,
  CheckSquare,
  Square,
  ChevronDown
} from "lucide-react";

export default function CollectFeesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId");
  const { academicYear } = useAppState();

  // Core loading/fetched states
  const [student, setStudent] = useState<any | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Core configuration loaded from class setup / student overrides
  const [feeTypesConfig, setFeeTypesConfig] = useState<any[]>([]);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);

  // Period Selection
  const [collectionType, setCollectionType] = useState<"Monthly" | "Day Wise">("Monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selections & Forms
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Cheque" | "Bank Transfer" | "Online" | "UPI">("Cash");
  const [collectionDate, setCollectionDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  // Adjustment particulars
  const [discount, setDiscount] = useState("0");
  const [fine, setFine] = useState("0");
  const [scholarship, setScholarship] = useState("0");
  const [waiver, setWaiver] = useState("0");
  const [adjustment, setAdjustment] = useState("0");
  const [roundOff, setRoundOff] = useState("0");

  // Flow state
  const [step, setStep] = useState<"form" | "receipt">("form");
  const [lastPaymentResult, setLastPaymentResult] = useState<any | null>(null);

  // Fallback avatar helper
  const getAvatar = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=D2232A&color=fff&bold=true`;
  };

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

  // 1. Load Student Details from API
  useEffect(() => {
    if (!studentId) {
      setIsLoadingStudent(false);
      return;
    }

    const loadStudent = async () => {
      setIsLoadingStudent(true);
      try {
        const res = await fetch(`/api/students/${studentId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.data) {
          const s = data.data;
          setStudent({
            _id: s._id,
            id: s._id,
            name: s.name,
            admission_no: s.admission_no,
            class_id: s.class_id,
            class_name: s.class_id ? `${s.class_id.name} - ${s.class_id.section || ""}`.replace(/ - $/, "") : "Unassigned",
            photo_url: s.photo_url,
            admission_date: s.dob || s.createdAt
          });
        }
      } catch (err) {
        console.error("Failed to load student details for fee collection page", err);
      } finally {
        setIsLoadingStudent(false);
      }
    };

    loadStudent();
  }, [studentId]);

  // 2. Fetch billing config and payments history when student details are loaded
  useEffect(() => {
    if (!student) return;

    const studentClassId = student.class_id?._id || student.class_id;

    // Reset local states
    setStep("form");
    setFeeTypesConfig([]);
    setPaymentsHistory([]);
    setSelectedFees([]);
    setAmounts({});
    setCollectionDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Cash");
    setReferenceNo("");
    setNotes("");
    setLastPaymentResult(null);
    setCollectionType("Monthly");
    setDiscount("0");
    setFine("0");
    setScholarship("0");
    setWaiver("0");
    setAdjustment("0");
    setRoundOff("0");

    const fetchData = async () => {
      setIsLoadingDetails(true);
      try {
        // Enriched config with student overrides / class setup
        const configRes = await fetch(
          `/api/fees?config_only=true&student_id=${student.id}&class_id=${studentClassId}&academic_year=${academicYear || "2026"}`,
          { headers: getAuthHeaders() }
        );
        const configData = await configRes.json();

        // Payments history log
        const paymentsRes = await fetch(`/api/fees/payments?student_id=${student.id}`, { headers: getAuthHeaders() });
        const paymentsData = await paymentsRes.json();

        let activeConfig: any[] = [];
        if (configData.success && configData.data?.fee_types) {
          activeConfig = configData.data.fee_types.filter((f: any) => f.is_enabled);
        }
        setFeeTypesConfig(activeConfig);

        let validPayments: any[] = [];
        if (paymentsData.success && paymentsData.data?.payments) {
          validPayments = paymentsData.data.payments;
          setPaymentsHistory(validPayments);
        }

        // Establish Default Start Date: Last Payment Date + 1 Day
        let lastEndPaidStr: string | null = null;
        const sortedPayments = [...validPayments]
          .filter((p: any) => p.end_date)
          .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

        if (sortedPayments.length > 0) {
          lastEndPaidStr = sortedPayments[0].end_date;
        }

        const todayStr = new Date().toISOString().split("T")[0];

        if (lastEndPaidStr && !isNaN(new Date(lastEndPaidStr).getTime())) {
          const nextDay = new Date(lastEndPaidStr);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayStr = nextDay.toISOString().split("T")[0];
          setStartDate(nextDayStr);
          setEndDate(nextDayStr >= todayStr ? nextDayStr : todayStr);
        } else {
          // Fallback to student's joined / admission date
          const rawJoin = student.admission_date;
          const fallbackStart = rawJoin && !isNaN(new Date(rawJoin).getTime()) ? new Date(rawJoin).toISOString().split("T")[0] : "2026-01-01";
          setStartDate(fallbackStart);
          setEndDate(todayStr);
        }

      } catch (err) {
        console.error("Error loading fee data:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchData();
  }, [student, academicYear]);

  // Recalculate multiplier helper
  const getMultiplier = (frequency: string, startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;

    if (frequency === "One Time") return 1;

    // Difference in calendar months
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

    switch (frequency) {
      case "Monthly":
        return Math.max(1, monthsDiff);
      case "Quarterly":
        return Math.max(1, Math.ceil(monthsDiff / 3));
      case "Half Yearly":
        return Math.max(1, Math.ceil(monthsDiff / 6));
      case "Yearly":
        return Math.max(1, Math.ceil(monthsDiff / 12));
      default:
        return 1;
    }
  };

  // Derive granular stats per fee head
  const getFeeHeadStats = (ft: any) => {
    const mult = getMultiplier(ft.frequency || "Monthly", startDate, endDate);
    const total = ft.amount * mult;

    let paid = 0;
    paymentsHistory.forEach(p => {
      if (p.fee_breakdown && p.fee_breakdown.length > 0) {
        const match = p.fee_breakdown.find((item: any) => item.name === ft.name);
        if (match) paid += match.amount_paid;
      } else {
        // Legacy fallback: attribute entire amount paid to the first enabled fee type
        const firstTypeName = feeTypesConfig.find(item => item.is_enabled)?.name || "Academic Fees";
        if (ft.name === firstTypeName) {
          paid += p.amount_paid;
        }
      }
    });

    const balance = Math.max(0, total - paid);
    return { total, paid, balance };
  };

  const toggleFee = (name: string, balance: number) => {
    if (balance <= 0) return;

    if (selectedFees.includes(name)) {
      setSelectedFees(selectedFees.filter(fName => fName !== name));
      const newAmounts = { ...amounts };
      delete newAmounts[name];
      setAmounts(newAmounts);
    } else {
      setSelectedFees([...selectedFees, name]);
      setAmounts({ ...amounts, [name]: balance.toString() });
    }
  };

  const handleAmountChange = (name: string, value: string) => {
    setAmounts(prev => ({ ...prev, [name]: value }));
  };

  // Validations & recalculations
  const validationMessage = React.useMemo(() => {
    if (selectedFees.length === 0) {
      return "At least one Fee Head must be selected.";
    }

    if (!collectionDate) {
      return "Collection Date is required.";
    }

    if (!paymentMethod) {
      return "Payment Method is required.";
    }

    const isRefVisible = ["Cheque", "Bank Transfer", "UPI"].includes(paymentMethod);
    if (isRefVisible && !referenceNo.trim()) {
      return `Reference Number is required for ${paymentMethod} payments.`;
    }

    for (const name of selectedFees) {
      const ft = feeTypesConfig.find(item => item.name === name);
      if (!ft) continue;
      const { balance } = getFeeHeadStats(ft);
      const enterAmtStr = amounts[name];
      const enterAmt = Number(enterAmtStr || 0);

      if (!enterAmtStr || isNaN(enterAmt) || enterAmt <= 0) {
        return `Collection amount for ${name} must be greater than ₹0.`;
      }
      if (enterAmt > balance) {
        return `Collection amount for ${name} cannot exceed the outstanding balance of ${money(balance)}.`;
      }
    }

    if (startDate && endDate) {
      const startVal = new Date(startDate);
      const endVal = new Date(endDate);

      if (endVal < startVal) {
        return `End date (${endDate}) cannot be before start date (${startDate}). You can change both dates above.`;
      }

      const hasOverlap = paymentsHistory.some((p) => {
        if (!p.start_date || !p.end_date) return false;
        const pStart = new Date(p.start_date).getTime();
        const pEnd = new Date(p.end_date).getTime();
        return pStart <= endVal.getTime() && pEnd >= startVal.getTime();
      });

      if (hasOverlap) {
        return "Overlapping date range: duplicate fee payments are already recorded for this period.";
      }
    }

    return "";
  }, [selectedFees, collectionDate, paymentMethod, referenceNo, amounts, feeTypesConfig, paymentsHistory, startDate, endDate]);

  const handleCollectFeesSubmit = async () => {
    if (validationMessage) return;
    setIsRecording(true);

    const subtotal = selectedFees.reduce((sum, name) => sum + Number(amounts[name] || 0), 0);
    const grandTotal = Math.max(0.01, (subtotal + Number(fine || 0)) - (Number(discount || 0) + Number(scholarship || 0) + Number(waiver || 0) + Number(adjustment || 0)) + Number(roundOff || 0));

    const breakdownPayload = selectedFees.map(name => ({
      name,
      amount_paid: Number(amounts[name] || 0)
    })).filter(item => item.amount_paid > 0);

    if (breakdownPayload.length === 0) {
      alert("Please select at least one fee type and enter an amount.");
      setIsRecording(false);
      return;
    }

    try {
      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          student_id: student.id,
          amount_paid: grandTotal,
          payment_method: paymentMethod,
          remarks: `${notes}${referenceNo ? ` [Ref: ${referenceNo}]` : ""}`,
          payment_date: collectionDate,
          start_date: startDate,
          end_date: endDate,
          collection_type: collectionType,
          fee_breakdown: breakdownPayload,
          discount: Number(discount || 0),
          fine: Number(fine || 0),
          scholarship: Number(scholarship || 0),
          waiver: Number(waiver || 0),
          adjustment: Number(adjustment || 0),
          round_off: Number(roundOff || 0)
        })
      });

      const data = await res.json();
      if (data.success) {
        setLastPaymentResult(data.data.payment);
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

  const handleBack = () => {
    router.back();
  };

  // Grand summary aggregates
  const subtotalCollecting = selectedFees.reduce((sum, name) => sum + Number(amounts[name] || 0), 0);
  const grandTotalCollecting = Math.max(0.01, (subtotalCollecting + Number(fine || 0)) - (Number(discount || 0) + Number(scholarship || 0) + Number(waiver || 0) + Number(adjustment || 0)) + Number(roundOff || 0));

  let overallTotalFees = 0;
  let overallTotalPaid = 0;
  feeTypesConfig.forEach(ft => {
    const { total, paid } = getFeeHeadStats(ft);
    overallTotalFees += total;
    overallTotalPaid += paid;
  });
  const overallBalance = Math.max(0, overallTotalFees - overallTotalPaid);
  const remainingBalanceAfter = Math.max(0, overallBalance - grandTotalCollecting);

  let overallStatus = "Pending";
  if (overallTotalFees > 0) {
    if (overallTotalPaid >= overallTotalFees) overallStatus = "Paid";
    else if (overallTotalPaid > 0) overallStatus = "Partial";
  }

  const isRefVisible = ["Cheque", "Bank Transfer", "UPI"].includes(paymentMethod);

  const receiptBreakdown = React.useMemo(() => {
    if (!lastPaymentResult || !lastPaymentResult.fee_breakdown) return [];

    return lastPaymentResult.fee_breakdown.map((item: any) => {
      const config = feeTypesConfig.find((c: any) => c.name === item.name);

      const start = new Date(lastPaymentResult.start_date);
      const end = new Date(lastPaymentResult.end_date);
      let mult = 1;
      if (config && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        if (config.frequency !== "One Time") {
          const monthsDiff =
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth()) +
            1;
          switch (config.frequency) {
            case "Monthly": mult = Math.max(1, monthsDiff); break;
            case "Quarterly": mult = Math.max(1, Math.ceil(monthsDiff / 3)); break;
            case "Half Yearly": mult = Math.max(1, Math.ceil(monthsDiff / 6)); break;
            case "Yearly": mult = Math.max(1, Math.ceil(monthsDiff / 12)); break;
          }
        }
      }

      const totalAmount = config ? config.amount * mult : item.amount_paid;

      let paidBefore = 0;
      paymentsHistory.forEach((p: any) => {
        if (p._id !== lastPaymentResult._id) {
          const match = p.fee_breakdown?.find((f: any) => f.name === item.name);
          if (match) paidBefore += match.amount_paid;
        }
      });

      const paidNow = item.amount_paid;
      const totalPaid = paidBefore + paidNow;
      const outstanding = Math.max(0, totalAmount - totalPaid);

      let status = "Pending";
      if (totalAmount > 0) {
        if (totalPaid >= totalAmount) status = "Paid";
        else if (totalPaid > 0) status = "Partial";
      }

      return { name: item.name, totalAmount, paidBefore, paidNow, totalPaid, outstanding, status };
    });
  }, [lastPaymentResult, feeTypesConfig, paymentsHistory]);

  if (isLoadingStudent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-500 font-medium">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-xs font-bold">Loading student info...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-205">No Student Selected</h3>
        <p className="text-slate-500 mt-2 text-xs">Invalid or missing student identification code.</p>
        <button onClick={handleBack} className="mt-4 btn btn-primary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 border border-border bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-655 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">
            {step === "form" ? "Collect Student Fees" : "Transaction Receipt"}
          </h1>
          <p className="page-desc mt-1">
            {step === "form"
              ? "Record new dues payments, apply discounts or adjustments, and print receipts."
              : "Fee transaction recorded successfully. Download or print the invoice ledger."}
          </p>
        </div>
      </div>

      {isLoadingDetails ? (
        <div className="h-80 flex flex-col items-center justify-center text-slate-450 gap-3 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold">Retrieving billing ledger info...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* HEADER STUDENT SUMMARY CARD */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <img
                src={student.photo_url || getAvatar(student.name)}
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-700 shadow-sm shrink-0"
                alt="Student avatar"
              />
              <div>
                <h4 className="text-[16px] font-extrabold text-white leading-tight">{student.name}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5 font-sans">
                  <span>Adm No: <strong className="text-white">{student.admission_no || "N/A"}</strong></span>
                  <span>•</span>
                  <span>Class: <strong className="text-white">{student.class_name}</strong></span>
                  <span>•</span>
                  <span>Session: <strong className="text-white">{academicYear || "2026"}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 border-t md:border-t-0 border-slate-800 pt-4 md:pt-0 justify-between md:justify-end text-xs font-sans">
              <div className="text-left md:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Fees</span>
                <span className="font-sans font-black text-slate-200 text-[15px] block mt-0.5">{money(overallTotalFees)}</span>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Paid</span>
                <span className="font-sans font-black text-emerald-400 text-[15px] block mt-0.5">{money(overallTotalPaid)}</span>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Outstanding</span>
                <span className="font-sans font-black text-rose-400 text-[15px] block mt-0.5">{money(overallBalance)}</span>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Status</span>
                <div className="mt-1">
                  <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${overallStatus === "Paid"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : overallStatus === "Partial"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}>
                    {overallStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 1: DIRECT ENTRY FEE COLLECTION FORM */}
          {step === "form" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              {/* LEFT COLUMN: OUTSTANDING FEES CARD DISPLAY */}
              <div className="lg:col-span-3 space-y-4 bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-205 uppercase tracking-wider">
                    Outstanding Fee Heads
                  </h3>
                  <span className="text-[10px] text-slate-450 font-bold uppercase">
                    Select cards to collect
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar text-left">
                  {feeTypesConfig.filter(ft => {
                    const { total } = getFeeHeadStats(ft);
                    return total > 0;
                  }).length === 0 ? (
                    <div className="md:col-span-2 py-16 text-center text-slate-400 border border-dashed border-border rounded-xl font-medium text-xs">
                      No active fee heads configured for this academic year.
                    </div>
                  ) : (
                    feeTypesConfig
                      .filter(ft => {
                        const { total } = getFeeHeadStats(ft);
                        return total > 0;
                      })
                      .map(ft => {
                        const { total, paid, balance } = getFeeHeadStats(ft);
                        const isPaid = balance <= 0;
                      const isSelected = selectedFees.includes(ft.name);

                      let statusBadge = <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-705 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-550/20">Pending</span>;
                      if (isPaid) {
                        statusBadge = <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-705 dark:bg-emerald-500/10 dark:text-emerald-450 border border-emerald-100 inline-flex items-center gap-0.5">Paid</span>;
                      } else if (paid > 0) {
                        statusBadge = <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-705 dark:bg-amber-500/10 dark:text-amber-450 border border-amber-100">Partial</span>;
                      }

                      return (
                        <div
                          key={ft._id || ft.name}
                          onClick={() => !isPaid && toggleFee(ft.name, balance)}
                          className={`p-4 border rounded-xl shadow-sm transition-all text-left flex flex-col justify-between relative cursor-pointer group ${isPaid
                              ? "bg-slate-50/50 dark:bg-slate-900/30 border-border opacity-70 cursor-not-allowed"
                              : isSelected
                                ? "bg-primary/[0.02] border-primary ring-2 ring-primary/10"
                                : "bg-white dark:bg-slate-900 border-border hover:border-slate-350 dark:hover:border-slate-700"
                            }`}
                        >
                          {/* Selection Icon */}
                          {!isPaid && (
                            <div className="absolute top-4 right-4">
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-slate-400" />
                              )}
                            </div>
                          )}

                          <div>
                            <div>
                              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-[13px] block truncate pr-8" title={ft.name}>
                                {ft.name}
                              </span>
                              <span className="text-[10px] text-slate-455 font-bold block mt-0.5 uppercase tracking-wider">
                                {ft.frequency || "Monthly"} • {ft.is_mandatory ? "Mandatory" : "Optional"}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-t border-border mt-3.5 pt-3.5 text-[11px] font-sans">
                              <div>
                                <span className="text-slate-400 block font-bold text-[9px] uppercase">Total Due</span>
                                <span className="font-sans font-bold text-slate-700 dark:text-slate-300">{money(total)}</span>
                              </div>
                              <div>
                                <span className="text-slate-455 block font-bold text-[9px] uppercase">Paid</span>
                                <span className="font-sans font-bold text-emerald-600">{money(paid)}</span>
                              </div>
                              <div>
                                <span className="text-slate-455 block font-bold text-[9px] uppercase">Balance</span>
                                <span className="font-sans font-bold text-rose-500">{money(balance)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-border mt-3.5 pt-3.5">
                            <div>{statusBadge}</div>

                            {!isPaid && isSelected && (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] font-bold text-slate-455 uppercase">Collect:</span>
                                <div className="relative w-28">
                                  <span className="absolute left-2.5 top-1.5 text-slate-450 font-bold">₹</span>
                                  <input
                                    type="number"
                                    min="0.01"
                                    max={balance}
                                    step="0.01"
                                    value={amounts[ft.name] || ""}
                                    onChange={e => handleAmountChange(ft.name, e.target.value)}
                                    className="w-full pl-5 pr-1.5 py-1 border border-border rounded bg-white dark:bg-slate-900 font-sans font-bold text-slate-800 dark:text-white outline-none focus:border-primary text-right"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: PAYMENT INFO & SUMMARY */}
              <div className="lg:col-span-2 space-y-6">
                {/* Payment Information Form Card */}
                <div className="bg-white dark:bg-slate-900 p-5 border border-border rounded-2xl space-y-4 text-xs shadow-sm">
                  <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-border pb-2.5">
                    Payment Information
                  </h3>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="font-bold text-slate-500">Collection Date</label>
                    <input
                      type="date"
                      value={collectionDate}
                      onChange={(e) => setCollectionDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-primary/40"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="font-bold text-slate-500">
                      Billing Period <span className="text-[9px] font-normal text-slate-400 ml-1">(start – end)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`flex-1 px-2.5 py-2 border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white outline-none ${startDate && endDate && new Date(endDate) < new Date(startDate)
                            ? "border-rose-450 bg-rose-50 dark:bg-rose-900/10"
                            : "border-border focus:border-primary/40"
                          }`}
                      />
                      <span className="text-slate-400 font-bold text-[10px] shrink-0">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className={`flex-1 px-2.5 py-2 border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white outline-none ${startDate && endDate && new Date(endDate) < new Date(startDate)
                            ? "border-rose-450 bg-rose-50 dark:bg-rose-900/10"
                            : "border-border focus:border-primary/40"
                          }`}
                      />
                    </div>
                    {startDate && endDate && new Date(endDate) < new Date(startDate) && (
                      <p className="text-[9px] text-rose-500 font-bold mt-0.5">
                        ⚠ End date is before start date — please adjust above.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="font-bold text-slate-550">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none cursor-pointer focus:border-primary/40"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>

                  {isRefVisible && (
                    <div className="flex flex-col gap-1 text-left">
                      <label className="font-bold text-slate-550">Reference Number / Txn ID</label>
                      <input
                        type="text"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white outline-none font-sans focus:border-primary/40"
                        placeholder="Enter Reference Code"
                      />
                    </div>
                  )}

                  {/* Adjustments Subform */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <h4 className="font-extrabold text-slate-655 dark:text-slate-400 uppercase text-[9px] tracking-wider">Payment Adjustments</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] text-slate-500 font-bold">Fine (+)</label>
                        <input
                          type="number"
                          min="0"
                          value={fine}
                          onChange={(e) => setFine(e.target.value)}
                          className="px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 font-sans font-bold text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] text-slate-500 font-bold">Discount (-)</label>
                        <input
                          type="number"
                          min="0"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          className="px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 font-sans font-bold text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] text-slate-500 font-bold">Scholarship (-)</label>
                        <input
                          type="number"
                          min="0"
                          value={scholarship}
                          onChange={(e) => setScholarship(e.target.value)}
                          className="px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 font-sans font-bold text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] text-slate-500 font-bold">Waiver (-)</label>
                        <input
                          type="number"
                          min="0"
                          value={waiver}
                          onChange={(e) => setWaiver(e.target.value)}
                          className="px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 font-sans font-bold text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] text-slate-500 font-bold">Adjustment (-)</label>
                        <input
                          type="number"
                          min="0"
                          value={adjustment}
                          onChange={(e) => setAdjustment(e.target.value)}
                          className="px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 font-sans font-bold text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] text-slate-500 font-bold">Round Off (+/-)</label>
                        <input
                          type="number"
                          value={roundOff}
                          onChange={(e) => setRoundOff(e.target.value)}
                          className="px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 font-sans font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Summary aggregates card */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 text-xs shadow-md">
                  <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                    Payment Summary
                  </h3>
                  <div className="space-y-3 font-sans">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Selected Fee Heads</span>
                      <span className="text-slate-200 font-bold truncate block w-full text-[13px]" title={selectedFees.join(", ")}>
                        {selectedFees.length > 0 ? selectedFees.join(", ") : "None Selected"}
                      </span>
                    </div>

                    <div className="border-t border-slate-800/80 my-2 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Outstanding Before Payment:</span>
                        <span className="font-sans font-bold text-slate-200">{money(overallBalance)}</span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal:</span>
                        <span className="font-sans">{money(subtotalCollecting)}</span>
                      </div>

                      {Number(fine) > 0 && (
                        <div className="flex justify-between text-amber-400 font-semibold">
                          <span>Fine Added (+):</span>
                          <span className="font-sans">+{money(Number(fine))}</span>
                        </div>
                      )}

                      {Number(discount) > 0 && (
                        <div className="flex justify-between text-emerald-450 font-semibold">
                          <span>Discount Applied (-):</span>
                          <span className="font-sans">-{money(Number(discount))}</span>
                        </div>
                      )}

                      {Number(scholarship) > 0 && (
                        <div className="flex justify-between text-emerald-450 font-semibold">
                          <span>Scholarship Applied (-):</span>
                          <span className="font-sans">-{money(Number(scholarship))}</span>
                        </div>
                      )}

                      {Number(waiver) > 0 && (
                        <div className="flex justify-between text-emerald-450 font-semibold">
                          <span>Waiver Applied (-):</span>
                          <span className="font-sans">-{money(Number(waiver))}</span>
                        </div>
                      )}

                      {Number(adjustment) > 0 && (
                        <div className="flex justify-between text-emerald-450 font-semibold">
                          <span>Adjustment Applied (-):</span>
                          <span className="font-sans">-{money(Number(adjustment))}</span>
                        </div>
                      )}

                      {Number(roundOff) !== 0 && (
                        <div className="flex justify-between text-slate-350 font-semibold">
                          <span>Round Off:</span>
                          <span className="font-sans">{Number(roundOff) > 0 ? "+" : ""}{money(Number(roundOff))}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-emerald-450 font-bold border-t border-slate-800/60 pt-3 text-[13px]">
                        <span>Grand Total Collecting:</span>
                        <span className="font-sans text-lg">{money(grandTotalCollecting)}</span>
                      </div>

                      <div className="flex justify-between text-rose-455 font-bold border-t border-dashed border-slate-800/60 pt-2.5 text-xs">
                        <span>Remaining Balance:</span>
                        <span className="font-sans">{money(remainingBalanceAfter)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation error message */}
                {validationMessage && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-250 text-rose-600 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-pulse shadow-sm">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    <span>{validationMessage}</span>
                  </div>
                )}

                {/* Submit Controls */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleBack}
                    className="px-5 py-2.5 border border-border text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCollectFeesSubmit}
                    disabled={isRecording || grandTotalCollecting <= 0 || !!validationMessage}
                    className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md"
                  >
                    {isRecording && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Collect Fees</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PRINTABLE FEE RECEIPT */}
          {step === "receipt" && lastPaymentResult && (() => {
            const buildReceiptHTML = () => {
              const rows = receiptBreakdown.map((ft: any) => {
                const statusColor = ft.status === "Paid"
                  ? "background:#d1fae5;color:#065f46;border:1px solid #a7f3d0"
                  : ft.status === "Partial"
                    ? "background:#fef3c7;color:#92400e;border:1px solid #fde68a"
                    : "background:#fee2e2;color:#991b1b;border:1px solid #fecaca";

                return `
                  <tr>
                    <td style="padding:7px 10px;text-align:left;font-family:sans-serif;font-weight:700;color:#1e293b;border-top:1px solid #e2e8f0">${ft.name}</td>
                    <td style="padding:7px 10px;text-align:right;font-family:monospace;border-top:1px solid #e2e8f0">${money(ft.totalAmount)}</td>
                    <td style="padding:7px 10px;text-align:right;font-family:monospace;color:#64748b;border-top:1px solid #e2e8f0">${money(ft.paidBefore)}</td>
                    <td style="padding:7px 10px;text-align:right;font-family:monospace;font-weight:900;color:#6366f1;border-top:1px solid #e2e8f0">${money(ft.paidNow)}</td>
                    <td style="padding:7px 10px;text-align:right;font-family:monospace;font-weight:700;border-top:1px solid #e2e8f0">${money(ft.totalPaid)}</td>
                    <td style="padding:7px 10px;text-align:right;font-family:monospace;font-weight:700;color:#e11d48;border-top:1px solid #e2e8f0">${money(ft.outstanding)}</td>
                    <td style="padding:7px 10px;text-align:center;border-top:1px solid #e2e8f0">
                      <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;${statusColor}">
                        ${ft.status}
                      </span>
                    </td>
                  </tr>`;
              }).join("");

              const remarksHtml = notes
                ? `<p style="font-style:italic;font-size:9px;color:#64748b;margin-bottom:20px;font-family:sans-serif">Remarks: ${notes}</p>`
                : "";

              return `<!DOCTYPE html>
<html>
<head>
  <title>Fee Receipt — ${lastPaymentResult.receipt_number}</title>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; font-size: 11px; color: #1e293b; background: #fff; padding: 32px; }
    @media print { body { padding: 0; } @page { margin: 14mm; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="text-align:center;border-bottom:2px solid #1e293b;padding-bottom:14px;margin-bottom:18px">
    <h1 style="font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">${lastPaymentResult.school_name || "My School ERP"}</h1>
    <p style="font-size:9px;letter-spacing:0.05em;font-family:sans-serif;color:#475569">Student Fee Payment Receipt</p>
    <div style="display:inline-block;background:#1e293b;color:#fff;padding:2px 14px;border-radius:999px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:sans-serif;margin-top:8px">
      Official Receipt
    </div>
  </div>

  <!-- Details Grid -->
  <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px;margin-bottom:18px">
    <tr>
      <td style="padding:3px 0;width:50%">
        <span style="font-weight:700;color:#64748b;display:inline-block;width:110px">Student Name:</span>
        <strong>${student.name}</strong>
      </td>
      <td style="padding:3px 0">
        <span style="font-weight:700;color:#64748b;display:inline-block;width:110px">Admission No:</span>
        <strong style="font-family:monospace">${student.admission_no || "N/A"}</strong>
      </td>
    </tr>
    <tr>
      <td style="padding:3px 0">
        <span style="font-weight:700;color:#64748b;display:inline-block;width:110px">Class:</span>
        <strong>${student.class_name}</strong>
      </td>
      <td style="padding:3px 0">
        <span style="font-weight:700;color:#64748b;display:inline-block;width:110px">Receipt No:</span>
        <strong style="font-family:monospace;color:#4f46e5">${lastPaymentResult.receipt_number}</strong>
      </td>
    </tr>
    <tr>
      <td style="padding:3px 0" colspan="2">
        <span style="font-weight:700;color:#64748b;display:inline-block;width:110px">Billing Period:</span>
        <strong>${fmtDate(lastPaymentResult.start_date)} – ${fmtDate(lastPaymentResult.end_date)}</strong>
      </td>
    </tr>
    <tr>
      <td style="padding:3px 0">
        <span style="font-weight:700;color:#64748b;display:inline-block;width:110px">Payment Method:</span>
        <strong>${lastPaymentResult.payment_method}</strong>
      </td>
      <td style="padding:3px 0">
        <span style="font-weight:700;color:#64748b;display:inline-block;width:110px">Payment Date:</span>
        <strong>${fmtDate(lastPaymentResult.payment_date)}</strong>
      </td>
    </tr>
  </table>

  <!-- Fee Breakdown Table -->
  <table style="width:100%;border-collapse:collapse;font-size:9px;border:1px solid #cbd5e1;margin-bottom:16px">
    <thead>
      <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1">
        <th style="padding:7px 10px;text-align:left;font-family:sans-serif;font-size:8px;font-weight:800;text-transform:uppercase;color:#475569;letter-spacing:0.05em">Fee Head</th>
        <th style="padding:7px 10px;text-align:right;font-family:sans-serif;font-size:8px;font-weight:800;text-transform:uppercase;color:#475569">Total Fee</th>
        <th style="padding:7px 10px;text-align:right;font-family:sans-serif;font-size:8px;font-weight:800;text-transform:uppercase;color:#475569">Paid Before</th>
        <th style="padding:7px 10px;text-align:right;font-family:sans-serif;font-size:8px;font-weight:800;text-transform:uppercase;color:#4f46e5">Paid Now</th>
        <th style="padding:7px 10px;text-align:right;font-family:sans-serif;font-size:8px;font-weight:800;text-transform:uppercase;color:#475569">Total Paid</th>
        <th style="padding:7px 10px;text-align:right;font-family:sans-serif;font-size:8px;font-weight:800;text-transform:uppercase;color:#e11d48">Outstanding</th>
        <th style="padding:7px 10px;text-align:center;font-family:sans-serif;font-size:8px;font-weight:800;text-transform:uppercase;color:#475569">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Total Summary & Adjustments Table -->
  <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px;margin-bottom:18px;border-top:1px solid #cbd5e1">
    <tr>
      <td style="padding:6px 0;text-align:left;color:#64748b">Subtotal Paid Now:</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:700">${money(receiptBreakdown.reduce((sum: number, r: any) => sum + r.paidNow, 0))}</td>
    </tr>
    ${lastPaymentResult.fine > 0 ? `
    <tr>
      <td style="padding:4px 0;text-align:left;color:#64748b">Fine Added (+):</td>
      <td style="padding:4px 0;text-align:right;font-family:monospace;color:#92400e">+${money(lastPaymentResult.fine)}</td>
    </tr>` : ""}
    ${lastPaymentResult.discount > 0 ? `
    <tr>
      <td style="padding:4px 0;text-align:left;color:#64748b">Discount Applied (-):</td>
      <td style="padding:4px 0;text-align:right;font-family:monospace;color:#0f766e">-${money(lastPaymentResult.discount)}</td>
    </tr>` : ""}
    ${lastPaymentResult.scholarship > 0 ? `
    <tr>
      <td style="padding:4px 0;text-align:left;color:#64748b">Scholarship Applied (-):</td>
      <td style="padding:4px 0;text-align:right;font-family:monospace;color:#0f766e">-${money(lastPaymentResult.scholarship)}</td>
    </tr>` : ""}
    ${lastPaymentResult.waiver > 0 ? `
    <tr>
      <td style="padding:4px 0;text-align:left;color:#64748b">Waiver Applied (-):</td>
      <td style="padding:4px 0;text-align:right;font-family:monospace;color:#0f766e">-${money(lastPaymentResult.waiver)}</td>
    </tr>` : ""}
    ${lastPaymentResult.adjustment > 0 ? `
    <tr>
      <td style="padding:4px 0;text-align:left;color:#64748b">Adjustment Applied (-):</td>
      <td style="padding:4px 0;text-align:right;font-family:monospace;color:#0f766e">-${money(lastPaymentResult.adjustment)}</td>
    </tr>` : ""}
    ${lastPaymentResult.round_off !== 0 ? `
    <tr>
      <td style="padding:4px 0;text-align:left;color:#64748b">Round Off:</td>
      <td style="padding:4px 0;text-align:right;font-family:monospace;color:#475569">${lastPaymentResult.round_off > 0 ? "+" : ""}${money(lastPaymentResult.round_off)}</td>
    </tr>` : ""}
    <tr style="border-top:2px solid #1e293b;border-bottom:2px solid #1e293b">
      <td style="padding:8px 0;text-align:left;font-weight:900;font-size:11px">GRAND TOTAL PAID (${lastPaymentResult.payment_method}):</td>
      <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:14px;font-weight:900;color:#059669">${money(lastPaymentResult.amount_paid)}</td>
    </tr>
  </table>

  <!-- Future Ready QR Code Placeholder & Auditor Audit Info -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border:1px dashed #cbd5e1;border-radius:8px;padding:10px font-family:sans-serif">
    <div style="font-family:sans-serif;font-size:9px;color:#64748b">
      <span style="display:block;font-weight:bold;color:#1e293b;margin-bottom:2px">Transaction Audit Trail</span>
      <span>Collected By: ${lastPaymentResult.collected_by?.name || lastPaymentResult.collected_by?.username || "Authorized ERP Cashier"}</span><br/>
      <span>System Verification: SUCCESS</span>
    </div>
    <div style="text-align:right">
      <svg width="45" height="45" viewBox="0 0 29 29" style="display:inline-block">
        <path d="M0 0h9v9H0zm1 1v7h7V1zm10 0h9v9h-9zm1 1v7h7V1zm10 0h7v7h-7zm0 10h9v9h-9zm1 1v7h7v-7zm-12-1h9v9h-9zm1 1v7h7v-7zm12 10h7v7h-7z" fill="#1e293b"/>
        <path d="M3 3h3v3H3zm13 0h3v3h-3zM3 16h3v3H3zm23-3h1v1h-1zm-1-1h1v1h-1zm1 3h1v1h-1zm-2 2h1v1h-1zm-1 0h1v1h-1zm3 0h1v1h-1zm-3-1h1v1h-1zm-3 2h1v1h-1zm-1 1h1v1h-1z" fill="#1e293b"/>
      </svg>
      <span style="display:block;font-family:sans-serif;font-size:7px;color:#94a3b8;margin-top:2px">Scan to Verify</span>
    </div>
  </div>

  ${remarksHtml}

  <!-- Signatures -->
  <div style="display:flex;justify-content:space-between;padding-top:24px;margin-top:16px">
    <div style="text-align:center;width:130px;border-top:1px solid #cbd5e1;padding-top:6px;font-family:sans-serif;font-size:9px;font-weight:700;color:#64748b">
      Depositor Signature
    </div>
    <div style="text-align:center;width:130px;border-top:1px solid #cbd5e1;padding-top:6px;font-family:sans-serif;font-size:9px;font-weight:700;color:#64748b">
      Authorized Cashier
    </div>
  </div>
</body>
</html>`;
            };

            return (
              <div className="space-y-4 max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm">
                {/* Success Banner */}
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 text-emerald-600 rounded-xl flex items-center gap-2.5 text-xs font-bold shadow-sm">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  <span>Success! Fee payment recorded. Click <strong>Print / Download PDF</strong> below.</span>
                </div>

                {/* On-screen preview of key details */}
                <div className="p-6 border border-slate-200 rounded-2xl bg-white text-slate-800 font-sans text-xs space-y-4 text-left shadow-sm">
                  <div className="text-center border-b border-slate-200 pb-3 mb-3">
                    <p className="text-base font-black uppercase tracking-widest text-slate-900">Fee Payment Receipt</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans font-bold">{lastPaymentResult.receipt_number}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px] font-sans">
                    <div><span className="text-slate-400 font-bold">Student:</span> <strong className="text-slate-800">{student.name}</strong></div>
                    <div><span className="text-slate-400 font-bold">Adm No:</span> <strong className="text-slate-800">{student.admission_no || "N/A"}</strong></div>
                    <div><span className="text-slate-400 font-bold">Class:</span> <strong className="text-slate-800">{student.class_name}</strong></div>
                    <div><span className="text-slate-400 font-bold">Method:</span> <strong className="text-slate-800">{lastPaymentResult.payment_method}</strong></div>
                    <div className="col-span-2"><span className="text-slate-400 font-bold">Period:</span> <strong className="text-slate-800">{fmtDate(lastPaymentResult.start_date)} – {fmtDate(lastPaymentResult.end_date)}</strong></div>
                  </div>

                  <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5">
                    <span className="font-bold text-slate-700">Amount Paid</span>
                    <span className="font-sans font-black text-emerald-700 text-xl">{money(lastPaymentResult.amount_paid)}</span>
                  </div>

                  <p className="text-center text-[10px] text-slate-400 font-semibold">
                    Click <strong>Print / Download PDF</strong> below to get the formatted invoice copy.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      const html = buildReceiptHTML();
                      const printWin = window.open("", "_blank", "width=820,height=950");
                      if (!printWin) {
                        alert("Pop-up blocked! Please allow pop-ups for this site.");
                        return;
                      }
                      printWin.document.write(html);
                      printWin.document.close();
                      printWin.focus();
                      setTimeout(() => { printWin.print(); printWin.close(); }, 400);
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Download PDF</span>
                  </button>
                  <button onClick={handleBack} className="px-5 py-2.5 border border-border text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm">
                    Back to Fees
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
