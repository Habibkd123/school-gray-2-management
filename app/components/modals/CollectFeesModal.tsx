import React, { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import {
  X,
  User,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
  Printer,
  CheckSquare,
  Square,
  CheckCircle2,
  Calendar
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

  // Core configuration loaded from class setup / student overrides
  const [feeTypesConfig, setFeeTypesConfig] = useState<any[]>([]);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);

  // Period Selection
  const [collectionType, setCollectionType] = useState<"Monthly" | "Day Wise">("Monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [validationError, setValidationError] = useState("");

  // Selections & Forms
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Cheque" | "Bank Transfer" | "Online" | "UPI">("Cash");
  const [collectionDate, setCollectionDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  // Flow state
  const [step, setStep] = useState<"form" | "receipt">("form");
  const [lastPaymentResult, setLastPaymentResult] = useState<any | null>(null);

  const studentId = student?._id || student?.id;
  const studentClassId = student?.class_id?._id || student?.class_id;

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

  // 1. Fetch config and payments history when modal opens
  useEffect(() => {
    if (!isOpen || !studentId) return;

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
    setValidationError("");
    setLastPaymentResult(null);
    setCollectionType("Monthly");

    const fetchData = async () => {
      setIsLoadingDetails(true);
      try {
        // Enriched config with student overrides / class setup
        const configRes = await fetch(
          `/api/fees?config_only=true&student_id=${studentId}&class_id=${studentClassId}&academic_year=${academicYear || "2026"}`,
          { headers: getAuthHeaders() }
        );
        const configData = await configRes.json();
        
        // Payments history log
        const paymentsRes = await fetch(`/api/fees/payments?student_id=${studentId}`, { headers: getAuthHeaders() });
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
        console.error("Error loading fee data:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchData();
  }, [isOpen, studentId, studentClassId, academicYear]);

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
    // 1. At least one Fee Head must be selected
    if (selectedFees.length === 0) {
      return "At least one Fee Head must be selected.";
    }

    // 2. Collection Date is required
    if (!collectionDate) {
      return "Collection Date is required.";
    }

    // 3. Payment Method is required
    if (!paymentMethod) {
      return "Payment Method is required.";
    }

    // 4. Reference Number validation for Cheque, Bank Transfer, UPI
    const isRefVisible = ["Cheque", "Bank Transfer", "UPI"].includes(paymentMethod);
    if (isRefVisible && !referenceNo.trim()) {
      return `Reference Number is required for ${paymentMethod} payments.`;
    }

    // 5. Check if entered amounts are valid
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

    // 6. Overlap range / duplicate validation
    if (startDate && endDate) {
      const startVal = new Date(startDate);
      const endVal = new Date(endDate);
      if (endVal >= startVal) {
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
    }

    return "";
  }, [selectedFees, collectionDate, paymentMethod, referenceNo, amounts, feeTypesConfig, paymentsHistory, startDate, endDate]);

  const handleCollectFeesSubmit = async () => {
    if (validationMessage) return;
    setIsRecording(true);

    const grandTotalCollecting = selectedFees.reduce((sum, name) => sum + Number(amounts[name] || 0), 0);
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
          student_id: studentId,
          amount_paid: grandTotalCollecting,
          payment_method: paymentMethod === "UPI" ? "Online" : paymentMethod,
          remarks: `${notes}${referenceNo ? ` [Ref: ${referenceNo}]` : ""}`,
          payment_date: collectionDate,
          start_date: startDate,
          end_date: endDate,
          collection_type: collectionType,
          fee_breakdown: breakdownPayload
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


  // Grand summary aggregates
  const grandTotalCollecting = selectedFees.reduce((sum, name) => sum + Number(amounts[name] || 0), 0);
  
  let overallTotalFees = 0;
  let overallTotalPaid = 0;
  feeTypesConfig.forEach(ft => {
    const { total, paid } = getFeeHeadStats(ft);
    overallTotalFees += total;
    overallTotalPaid += paid;
  });
  const overallBalance = Math.max(0, overallTotalFees - overallTotalPaid);
  const remainingBalanceAfter = Math.max(0, overallBalance - grandTotalCollecting);

  // Status Badge for Overall
  let overallStatus = "Pending";
  if (overallTotalFees > 0) {
    if (overallTotalPaid >= overallTotalFees) overallStatus = "Paid";
    else if (overallTotalPaid > 0) overallStatus = "Partial";
  }

  const isRefVisible = ["Cheque", "Bank Transfer", "UPI"].includes(paymentMethod);

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Mask */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={step !== "receipt" ? onClose : undefined} />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden transform transition-all text-left border border-border">
        
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
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={student.photo_url || getAvatar(student.name)} 
                  className="w-12 h-12 rounded-full object-cover border border-slate-700 shadow-sm shrink-0" 
                  alt="Student avatar" 
                />
                <div>
                  <h4 className="text-[14px] font-extrabold text-white leading-tight">{student.name}</h4>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1 font-sans">
                    <span>Adm No: <strong className="text-white">{student.admission_no || "N/A"}</strong></span>
                    <span>•</span>
                    <span>Class: <strong className="text-white">{student.class_name || student.class_id?.name || "Unassigned"}</strong></span>
                    <span>•</span>
                    <span>Session: <strong className="text-white">{academicYear || "2026"}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0 justify-between md:justify-end text-xs font-sans">
                <div className="text-left md:text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total Fees</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5">{money(overallTotalFees)}</span>
                </div>
                <div className="text-left md:text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total Paid</span>
                  <span className="font-mono font-bold text-emerald-400 block mt-0.5">{money(overallTotalPaid)}</span>
                </div>
                <div className="text-left md:text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Outstanding</span>
                  <span className="font-mono font-bold text-rose-400 block mt-0.5">{money(overallBalance)}</span>
                </div>
                <div className="text-left md:text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Status</span>
                  <div className="mt-0.5">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                      overallStatus === "Paid" 
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
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* LEFT COLUMN: OUTSTANDING FEES CARD DISPLAY */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Outstanding Fee Heads
                    </h3>
                    <span className="text-[10px] text-slate-450 font-bold uppercase">
                      Select cards to collect
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar text-left">
                    {feeTypesConfig.length === 0 ? (
                      <div className="md:col-span-2 py-10 text-center text-slate-400 border border-dashed border-border rounded-xl">
                        No active fee heads configured for this academic year.
                      </div>
                    ) : (
                      feeTypesConfig.map(ft => {
                        const { total, paid, balance } = getFeeHeadStats(ft);
                        const isPaid = balance <= 0;
                        const isSelected = selectedFees.includes(ft.name);

                        let statusBadge = <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">Pending</span>;
                        if (isPaid) {
                          statusBadge = <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-450 inline-flex items-center gap-0.5">Paid</span>;
                        } else if (paid > 0) {
                          statusBadge = <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-emerald-450">Partial</span>;
                        }

                        return (
                          <div 
                            key={ft._id || ft.name} 
                            onClick={() => !isPaid && toggleFee(ft.name, balance)}
                            className={`p-4 border rounded-xl shadow-sm transition-all text-left flex flex-col justify-between relative cursor-pointer group ${
                              isPaid 
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
                                <span className="text-[10px] text-slate-450 font-bold block mt-0.5 uppercase tracking-wider">
                                  {ft.frequency || "Monthly"} • {ft.is_mandatory ? "Mandatory" : "Optional"}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 border-t border-border mt-3.5 pt-3.5 text-[11px] font-sans">
                                <div>
                                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Total Due</span>
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{money(total)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-455 block font-bold text-[9px] uppercase">Paid</span>
                                  <span className="font-mono font-bold text-emerald-600">{money(paid)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-455 block font-bold text-[9px] uppercase">Balance</span>
                                  <span className="font-mono font-bold text-rose-500">{money(balance)}</span>
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
                                      className="w-full pl-5 pr-1.5 py-1 border border-border rounded bg-white dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-primary text-right"
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
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* Payment Information Form Card */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-border rounded-xl space-y-3.5 text-xs shadow-sm">
                    <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-border pb-1.5">
                      Payment Information
                    </h3>

                    <div className="flex flex-col gap-1 text-left">
                      <label className="font-bold text-slate-500">Collection Date</label>
                      <input 
                        type="date"
                        value={collectionDate}
                        onChange={(e) => setCollectionDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1 text-left">
                      <label className="font-bold text-slate-550">Payment Method</label>
                      <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none cursor-pointer"
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
                          className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white outline-none font-mono"
                          placeholder="Enter Reference Code"
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Summary aggregates card */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3.5 text-xs shadow-md">
                    <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">
                      Payment Summary
                    </h3>
                    <div className="space-y-2.5 font-sans">
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Selected Fee Heads</span>
                        <span className="text-slate-200 font-bold truncate block w-full" title={selectedFees.join(", ")}>
                          {selectedFees.length > 0 ? selectedFees.join(", ") : "None Selected"}
                        </span>
                      </div>
                      
                      <div className="border-t border-slate-800/80 my-2 pt-2.5 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Outstanding Before Payment:</span>
                          <span className="font-mono font-bold text-slate-200">{money(overallBalance)}</span>
                        </div>
                        
                        <div className="flex justify-between text-emerald-450 font-bold border-t border-slate-800/60 pt-2">
                          <span>Collecting Today:</span>
                          <span className="font-mono text-base">{money(grandTotalCollecting)}</span>
                        </div>
                        
                        <div className="flex justify-between text-rose-455 font-bold border-t border-dashed border-slate-800/60 pt-2">
                          <span>Outstanding After Payment:</span>
                          <span className="font-mono">{money(remainingBalanceAfter)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation error message */}
                {validationMessage && (
                  <div className="lg:col-span-5 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 rounded-xl flex items-center gap-2 text-xs font-bold animate-pulse">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                    <span>{validationMessage}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PRINTABLE FEE RECEIPT */}
            {step === "receipt" && lastPaymentResult && (() => {
              const isRefVisible = ["Cheque", "Bank Transfer", "UPI"].includes(paymentMethod);

              // Compute detailed metrics for each fee head in the receipt
              const receiptBreakdown = React.useMemo(() => {
                if (!lastPaymentResult || !lastPaymentResult.fee_breakdown) return [];
                
                return lastPaymentResult.fee_breakdown.map((item: any) => {
                  const config = feeTypesConfig.find(c => c.name === item.name);
                  
                  // Calculate multiplier for the transaction billing range
                  const start = new Date(lastPaymentResult.start_date);
                  const end = new Date(lastPaymentResult.end_date);
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
                          mult = Math.max(1, Math.ceil(monthsDiff / 12));
                          break;
                      }
                    }
                  }

                  const totalAmount = config ? (config.amount * mult) : item.amount_paid;

                  // Calculate amount paid BEFORE this transaction
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

                  return {
                    name: item.name,
                    totalAmount,
                    paidBefore,
                    paidNow,
                    totalPaid,
                    outstanding,
                    status
                  };
                });
              }, [lastPaymentResult, feeTypesConfig, paymentsHistory]);

              return (
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
                        <span className="font-bold text-slate-900">{student.class_name || student.class_id?.name || "N/A"}</span>
                      </div>
                      <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                        <span className="font-bold text-slate-455 w-24 text-left">Receipt Number:</span>
                        <span className="font-mono font-bold text-primary">{lastPaymentResult.receipt_number}</span>
                      </div>
                      <div className="flex border-b border-dashed border-slate-200 pb-0.5 col-span-2">
                        <span className="font-bold text-slate-455 w-24 text-left">Collection Period:</span>
                        <span className="font-semibold text-slate-900">
                          {fmtDate(lastPaymentResult.start_date)} – {fmtDate(lastPaymentResult.end_date)}
                        </span>
                      </div>
                      <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                        <span className="font-bold text-slate-455 w-24 text-left">Payment Method:</span>
                        <span className="font-semibold text-slate-900">{lastPaymentResult.payment_method}</span>
                      </div>
                      <div className="flex border-b border-dashed border-slate-200 pb-0.5">
                        <span className="font-bold text-slate-455 w-24 text-left">Payment Date:</span>
                        <span className="font-semibold text-slate-900">{fmtDate(lastPaymentResult.payment_date)}</span>
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="mb-6 font-sans border border-slate-300 rounded-xl overflow-hidden">
                      <table className="w-full text-[10px] border-collapse text-left">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-extrabold uppercase text-[9px] tracking-wider">
                            <th className="px-3 py-2">Fee Head</th>
                            <th className="px-3 py-2 text-right">Total Fee</th>
                            <th className="px-3 py-2 text-right">Paid Before</th>
                            <th className="px-3 py-2 text-right text-primary">Paid Now</th>
                            <th className="px-3 py-2 text-right">Total Paid</th>
                            <th className="px-3 py-2 text-right text-rose-600">Outstanding</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {receiptBreakdown.map((ft: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2.5 font-bold text-slate-800">{ft.name}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-700">{money(ft.totalAmount)}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-500">{money(ft.paidBefore)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-black text-primary bg-primary/5">{money(ft.paidNow)}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-800">{money(ft.totalPaid)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600 bg-rose-50/20">{money(ft.outstanding)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`px-2 py-0.3 rounded text-[8px] font-black uppercase tracking-wider ${
                                  ft.status === "Paid"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : ft.status === "Partial"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}>
                                  {ft.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary aggregate details */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-sans space-y-1.5 mb-6 text-[10px]">
                      <div className="flex justify-between border-slate-200 pt-1.5 font-bold text-slate-800">
                        <span>Total Amount Paid ({paymentMethod}):</span>
                        <span className="font-mono text-emerald-600 font-black text-sm">
                          {money(lastPaymentResult.amount_paid)}
                        </span>
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
              );
            })()}
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
                  disabled={isRecording || grandTotalCollecting <= 0 || !!validationMessage}
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
