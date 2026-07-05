"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Calendar,
  Clock,
  History,
  TrendingDown,
  FileSpreadsheet
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { getPersistedPageSize, PaginationBar } from "@/app/components/ui/pagination-bar";
import { getAuthHeaders } from "@/lib/utils/session";

export default function SalaryDashboardPage() {
  const { teachers, isLoading: isTeachersLoading, fetchTeachers } = useTeachers();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  
  // Tab State: "desk" | "reports"
  const [activeTab, setActiveTab] = useState<"desk" | "reports">("desk");

  // Filter Date State (Date range based)
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const selectedPeriod = useMemo(() => {
    return `${startDateStr} to ${endDateStr}`;
  }, [startDateStr, endDateStr]);

  // Backend Payments Data State
  const [paymentsData, setPaymentsData] = useState<{ payments: any[], summary: { totalPaid: number, totalPending: number, pendingCount: number, count: number } }>({
    payments: [],
    summary: { totalPaid: 0, totalPending: 0, pendingCount: 0, count: 0 }
  });
  const [allPayments, setAllPayments] = useState<any[]>([]); // All payouts to compute Last Paid
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(10));

  // Modal States
  const [setupSalaryTeacher, setSetupSalaryTeacher] = useState<any | null>(null);
  const [setupSalaryAmount, setSetupSalaryAmount] = useState("");
  const [isSettingSalary, setIsSettingSalary] = useState(false);

  const [previewTeacher, setPreviewTeacher] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [payTeacher, setPayTeacher] = useState<any | null>(null);
  const [payData, setPayData] = useState<any | null>(null);
  const [isPayLoading, setIsPayLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentStartDate, setPaymentStartDate] = useState("");
  const [paymentEndDate, setPaymentEndDate] = useState("");
  const [calculationType, setCalculationType] = useState<"Monthly" | "Day Wise">("Monthly");

  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  const [historyTeacher, setHistoryTeacher] = useState<any | null>(null);
  const [historyPayments, setHistoryPayments] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // ─── Fetch API Payments ─────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setIsPaymentsLoading(true);
    try {
      const res = await fetch(`/api/salaries?start_date=${startDateStr}&end_date=${endDateStr}&_t=${Date.now()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setPaymentsData(data.data);
      }
    } catch (err) {
      console.error("Error fetching payments for period:", err);
    } finally {
      setIsPaymentsLoading(false);
    }
  }, [selectedPeriod, startDateStr, endDateStr]);

  const fetchAllPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/salaries?_t=${Date.now()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setAllPayments(data.data.payments);
      }
    } catch (err) {
      console.error("Error fetching all payments:", err);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchAllPayments();
  }, [fetchPayments, fetchAllPayments]);

  // Compute Last Paid Date and current status for each teacher
  const salaryList = useMemo(() => {
    return teachers.map((t) => {
      const baseSalary = t.basic_salary || 0;
      
      // Find latest payout from all payments
      const teacherPayouts = allPayments.filter(
        p => p.teacher_id && (p.teacher_id._id === t._id || p.teacher_id === t._id)
      );
      
      let lastPaid = "Never";
      if (teacherPayouts.length > 0) {
        const sorted = [...teacherPayouts].sort(
          (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        );
        lastPaid = new Date(sorted[0].payment_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }

      // Check current month payout
      const periodPayout = paymentsData.payments.find(
        p => p.teacher_id && (p.teacher_id._id === t._id || p.teacher_id === t._id)
      );

      return {
        id: t._id,
        name: t.name,
        empId: t.employee_id || "EMP-N/A",
        role: (t.user_id && typeof t.user_id === "object" && "role" in t.user_id ? t.user_id.role : t.department) || "Teacher",
        basic: baseSalary,
        lastPaid,
        status: baseSalary === 0 ? "Pending Setup" : (periodPayout ? "Paid" : "Unpaid"),
        payoutRecord: periodPayout || null
      };
    });
  }, [teachers, allPayments, paymentsData.payments]);

  // Filter Salaries
  const filteredSalaries = useMemo(() => {
    return salaryList.filter((s) => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.empId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || 
        (selectedStatus === "Paid" && s.status === "Paid") ||
        (selectedStatus === "Unpaid" && s.status === "Unpaid") ||
        (selectedStatus === "Pending Setup" && s.status === "Pending Setup");
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

  // ─── Setup Salary Action ────────────────────────────────────────
  const openSetupSalary = (teacher: any) => {
    setSetupSalaryTeacher(teacher);
    setSetupSalaryAmount(teacher.basic ? String(teacher.basic) : "");
  };

  const handleSaveSalary = async () => {
    const amount = Number(setupSalaryAmount);
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid salary amount.");
      return;
    }

    setIsSettingSalary(true);
    try {
      const res = await fetch(`/api/teachers/${setupSalaryTeacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ basic_salary: amount }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchTeachers();
        setSetupSalaryTeacher(null);
      } else {
        alert(result.message || "Failed to configure salary.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving salary configuration.");
    } finally {
      setIsSettingSalary(false);
    }
  };

  // ─── Preview Salary Action ──────────────────────────────────────
  const openPreview = async (teacher: any) => {
    setPreviewTeacher(teacher);
    setIsPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await fetch(`/api/salaries/preview?teacher_id=${teacher.id}&start_date=${startDateStr}&end_date=${endDateStr}&_t=${Date.now()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data.data);
      } else {
        alert(data.message || "Failed to load calculation preview.");
        setPreviewTeacher(null);
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching preview.");
      setPreviewTeacher(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const recalculatePayPreview = async (teacherId: string, sDate: string, eDate: string) => {
    if (!sDate || !eDate) {
      setPayData(null);
      return;
    }
    setIsPayLoading(true);
    setPayData(null);
    try {
      const res = await fetch(`/api/salaries/preview?teacher_id=${teacherId}&start_date=${sDate}&end_date=${eDate}&_t=${Date.now()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setPayData(data.data);
      } else {
        alert(data.message || "Failed to calculate salary details.");
      }
    } catch (err) {
      console.error(err);
      alert("Error loading pay preview.");
    } finally {
      setIsPayLoading(false);
    }
  };

  const payValidationMsg = useMemo(() => {
    if (!paymentStartDate || !paymentEndDate) return "";
    const sDate = new Date(paymentStartDate);
    const eDate = new Date(paymentEndDate);
    if (eDate < sDate) {
      return "End Date cannot be earlier than Start Date.";
    }

    if (payTeacher) {
      const payouts = allPayments.filter(
        p => p.teacher_id && (p.teacher_id._id === payTeacher.id || p.teacher_id === payTeacher.id)
      );
      const hasOverlap = payouts.some(p => {
        if (!p.start_date || !p.end_date) return false;
        const existingStart = new Date(p.start_date);
        const existingEnd = new Date(p.end_date);
        return sDate <= existingEnd && eDate >= existingStart;
      });
      if (hasOverlap) {
        return "Selected date range overlaps with a previously paid salary record.";
      }
    }
    return "";
  }, [paymentStartDate, paymentEndDate, payTeacher, allPayments]);

  const handleCalculationTypeChange = (type: "Monthly" | "Day Wise") => {
    setCalculationType(type);
    if (!payTeacher) return;
    if (type === "Monthly") {
      const payouts = allPayments.filter(
        p => p.teacher_id && (p.teacher_id._id === payTeacher.id || p.teacher_id === payTeacher.id)
      );
      let start = "";
      if (payouts.length > 0) {
        const sorted = [...payouts].sort(
          (a, b) => new Date(b.end_date || b.payment_date).getTime() - new Date(a.end_date || a.payment_date).getTime()
        );
        const latest = sorted[0];
        const latestDateStr = latest.end_date || latest.payment_date;
        const d = new Date(latestDateStr);
        d.setDate(d.getDate() + 1);
        start = d.toISOString().split("T")[0];
      } else {
        if (payTeacher.join_date) {
          start = new Date(payTeacher.join_date).toISOString().split("T")[0];
        } else if (payTeacher.createdAt) {
          start = new Date(payTeacher.createdAt).toISOString().split("T")[0];
        } else {
          const d = new Date();
          start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        }
      }
      const end = new Date().toISOString().split("T")[0];
      setPaymentStartDate(start);
      setPaymentEndDate(end);
      recalculatePayPreview(payTeacher.id, start, end);
    } else {
      setPaymentStartDate("");
      setPaymentEndDate("");
      setPayData(null);
    }
  };

  // ─── Pay Salary Action ──────────────────────────────────────────
  const openPaySalary = async (teacher: any) => {
    setPayTeacher(teacher);
    setPaymentRemarks("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setCalculationType("Monthly");

    // Determine default start date (Monthly Mode: Last Paid Date + 1 Day)
    const payouts = allPayments.filter(
      p => p.teacher_id && (p.teacher_id._id === teacher.id || p.teacher_id === teacher.id)
    );
    let start = "";
    if (payouts.length > 0) {
      const sorted = [...payouts].sort(
        (a, b) => new Date(b.end_date || b.payment_date).getTime() - new Date(a.end_date || a.payment_date).getTime()
      );
      const latest = sorted[0];
      const latestDateStr = latest.end_date || latest.payment_date;
      const d = new Date(latestDateStr);
      d.setDate(d.getDate() + 1);
      start = d.toISOString().split("T")[0];
    } else {
      if (teacher.join_date) {
        start = new Date(teacher.join_date).toISOString().split("T")[0];
      } else if (teacher.createdAt) {
        start = new Date(teacher.createdAt).toISOString().split("T")[0];
      } else {
        const d = new Date();
        start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      }
    }
    const end = new Date().toISOString().split("T")[0];

    setPaymentStartDate(start);
    setPaymentEndDate(end);

    recalculatePayPreview(teacher.id, start, end);
  };

  // Find all payout records for this teacher, sorted by period ascending
  const teacherPayouts = useMemo(() => {
    if (!payTeacher) return [];
    return allPayments
      .filter(p => p.teacher_id && (p.teacher_id._id === payTeacher.id || p.teacher_id === payTeacher.id))
      .sort((a, b) => a.salary_period.localeCompare(b.salary_period));
  }, [payTeacher, allPayments]);

  const latestPaidPeriod = useMemo(() => {
    if (teacherPayouts.length === 0) return null;
    return teacherPayouts[teacherPayouts.length - 1].salary_period;
  }, [teacherPayouts]);

  const pendingMonthsInfo = useMemo(() => {
    if (!payTeacher || !payData) return { count: 1, amount: 0, periods: [] };
    
    return {
      count: 1,
      amount: payData.totalPayableAmount,
      periods: [selectedPeriod]
    };
  }, [payTeacher, payData, selectedPeriod]);

  const handleConfirmPayment = async () => {
    if (!payData) return;
    setIsConfirmingPayment(true);
    try {
      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          teacher_id: payData.teacherId,
          salary_period: payData.salaryPeriod,
          monthly_salary: payData.monthlySalary,
          working_days: payData.workingDays,
          present_days: payData.presentDays,
          absent_days: payData.absentDays,
          suggested_deduction: 0,
          final_salary: payData.totalPayableAmount,
          payment_date: paymentDate,
          remarks: paymentRemarks,
          start_date: payData.startDate,
          end_date: payData.endDate,
          calculation_type: calculationType
        })
      });
      const result = await res.json();
      if (result.success) {
        const newPaymentPopulated = {
          ...result.data,
          teacher_id: {
            _id: payData.teacherId,
            name: payData.teacherName,
            employee_id: payData.employeeId,
            designation: payTeacher.role
          }
        };

        // Instantly update states so page doesn't need to refresh
        setPaymentsData(prev => ({
          ...prev,
          payments: [newPaymentPopulated, ...prev.payments],
          summary: {
            ...prev.summary,
            totalPaid: prev.summary.totalPaid + Number(payData.totalPayableAmount),
            totalPending: Math.max(0, prev.summary.totalPending - Number(payData.monthlySalary)),
            pendingCount: Math.max(0, prev.summary.pendingCount - 1),
            count: prev.summary.count + 1
          }
        }));

        setAllPayments(prev => [newPaymentPopulated, ...prev]);

        // Background sync
        fetchPayments();
        fetchAllPayments();

        setPayTeacher(null);
        // Load slip of the completed transaction
        setSelectedSlip(newPaymentPopulated);
      } else {
        alert(result.message || "Disbursement failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving transaction.");
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  // ─── History Payouts Action ─────────────────────────────────────
  const openHistory = async (teacher: any) => {
    setHistoryTeacher(teacher);
    setIsHistoryLoading(true);
    setHistoryPayments([]);
    try {
      const res = await fetch(`/api/salaries?teacher_id=${teacher.id}&_t=${Date.now()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setHistoryPayments(data.data);
      } else {
        alert(data.message || "Failed to load history.");
        setHistoryTeacher(null);
      }
    } catch (err) {
      console.error(err);
      alert("Error loading history.");
      setHistoryTeacher(null);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────
  const money = (val: number) => "₹ " + (val || 0).toLocaleString("en-IN");
  
  const fmtDate = (d: string) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getMonthName = (m: number) => {
    const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return names[m - 1];
  };

  // ─── Exports ────────────────────────────────────────────────────
  const exportToCSV = () => {
    if (paymentsData.payments.length === 0) {
      alert("No payout records to export.");
      return;
    }
    const headers = ["Employee ID", "Employee Name", "Salary Period", "Monthly Salary", "Present", "Absent", "Final Salary Paid", "Payment Date", "Receipt Number"].join(",");
    const rows = paymentsData.payments.map((p) => {
      const teacher = p.teacher_id || {};
      return [
        `"${teacher.employee_id || ""}"`,
        `"${teacher.name || ""}"`,
        `"${p.salary_period}"`,
        p.monthly_salary,
        p.present_days,
        p.absent_days,
        p.final_salary,
        `"${new Date(p.payment_date).toLocaleDateString()}"`,
        `"${p.receipt_number}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SalaryReport_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-8 p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Salary Hub</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Finance</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Salaries</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("desk")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "desk"
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            Salary Desk
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "reports"
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            Reports Desk
          </button>
        </div>
      </div>

      {isTeachersLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-12 card-shadow text-center text-slate-450 font-bold">
          No employee records found in the database. Please add teachers first.
        </div>
      ) : (
        <>
          {/* TAB 1: SALARY DESK */}
          {activeTab === "desk" && (
            <div className="space-y-5">
              {/* Date Filters & Search Desk */}
              <div className="bg-white dark:bg-slate-900 border border-border p-5 rounded-xl shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="text-left flex-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search Employees</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-450 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="Search by teacher name or employee ID..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDateStr}
                      onChange={(e) => { setStartDateStr(e.target.value); setCurrentPage(1); }}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                    />
                  </div>

                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDateStr}
                      onChange={(e) => { setEndDateStr(e.target.value); setCurrentPage(1); }}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between border-t border-border pt-4 gap-4">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-border">
                    {["all", "Paid", "Unpaid", "Pending Setup"].map((st) => (
                      <button
                        key={st}
                        onClick={() => { setSelectedStatus(st); setCurrentPage(1); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          selectedStatus === st
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-border"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                        }`}
                      >
                        {st === "all" ? "All Accounts" : st}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-slate-450 font-bold">
                    For Period: <span className="text-slate-900 dark:text-white font-black">{selectedPeriod}</span>
                  </span>
                </div>
              </div>

              {/* Table Desk */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/50 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Emp ID</th>
                        <th className="px-6 py-4">Monthly Salary</th>
                        <th className="px-6 py-4">Last Payout</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Preview</th>
                        <th className="px-6 py-4 text-center">Disburse</th>
                        <th className="px-6 py-4 text-right">History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pagedSalaries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-10 text-center text-slate-450 font-bold">
                            No employee accounts match the active filter criteria.
                          </td>
                        </tr>
                      ) : (
                        pagedSalaries.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.role}</span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-400">{s.empId}</td>
                            <td className="px-6 py-4">
                              {s.basic > 0 ? (
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{money(s.basic)}</span>
                              ) : (
                                <button
                                  onClick={() => openSetupSalary(s)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-250 bg-slate-100 dark:bg-slate-850 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 border border-border"
                                >
                                  Setup Salary
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">{s.lastPaid}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                s.status === "Paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                  : s.status === "Unpaid"
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.status === "Paid" ? "bg-emerald-500" : s.status === "Unpaid" ? "bg-rose-500" : "bg-slate-400"}`} />
                                {s.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                disabled={s.basic === 0}
                                onClick={() => openPreview(s)}
                                className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                title="Salary Calculation Preview"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {s.status === "Paid" ? (
                                <button
                                  onClick={() => setSelectedSlip(s.payoutRecord)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-md hover:bg-emerald-100 transition-all flex items-center gap-1 mx-auto"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Slip
                                </button>
                              ) : (
                                <button
                                  disabled={s.basic === 0}
                                  onClick={() => openPaySalary(s)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-primary rounded-md hover:bg-primary/95 transition-all flex items-center gap-1 mx-auto disabled:opacity-40"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Pay
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => openHistory(s)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors inline-block"
                                title="Payout History Logs"
                              >
                                <History className="w-4 h-4" />
                              </button>
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
            </div>
          )}

          {/* TAB 2: REPORTS DESK */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Reports Date Range Picker Card */}
              <div className="bg-white dark:bg-slate-900 border border-border p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 text-left">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Start Date</span>
                    <input
                      type="date"
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">End Date</span>
                    <input
                      type="date"
                      value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)}
                      className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2.5 border border-border bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/95 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print / Export PDF
                  </button>
                </div>
              </div>

              {/* Aggregation Metric Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm text-left flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Paid Salary</span>
                      <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">{money(paymentsData.summary.totalPaid)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {paymentsData.summary.count} paid
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm text-left flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Pending Salary</span>
                      <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">{money(paymentsData.summary.totalPending)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    {paymentsData.summary.pendingCount} unpaid
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm text-left flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Gross Budget</span>
                      <span className="text-2xl font-bold block text-slate-900 dark:text-white mt-0.5">{money(paymentsData.summary.totalPaid + paymentsData.summary.totalPending)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payments Report Table */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left" id="printable-salary-report">
                <div className="px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">Disbursement Log - {selectedPeriod}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-slate-100/50 dark:bg-slate-800/80 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                        <th className="px-6 py-4">Receipt No.</th>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Basic Base</th>
                        <th className="px-6 py-4">Present/Absent</th>
                        <th className="px-6 py-4">Deduction</th>
                        <th className="px-6 py-4">Amount Paid</th>
                        <th className="px-6 py-4">Payment Date</th>
                        <th className="px-6 py-4 text-right">Slip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paymentsData.payments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-10 text-center text-slate-450 font-bold">
                            No disbursements recorded for this month.
                          </td>
                        </tr>
                      ) : (
                        paymentsData.payments.map((p) => {
                          const teacher = p.teacher_id || {};
                          return (
                            <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-slate-655">{p.receipt_number}</td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-900 dark:text-white block">{teacher.name || "Unknown"}</span>
                                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ID: {teacher.employee_id || "N/A"}</span>
                              </td>
                              <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-350">{money(p.monthly_salary)}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-bold">{p.present_days} / {p.absent_days}</td>
                              <td className="px-6 py-4 font-mono text-rose-500 font-bold">-{money(p.suggested_deduction)}</td>
                              <td className="px-6 py-4 font-mono font-black text-slate-900 dark:text-white">{money(p.final_salary)}</td>
                              <td className="px-6 py-4 font-bold text-slate-500">{fmtDate(p.payment_date)}</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setSelectedSlip(p)}
                                  className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors inline-block"
                                >
                                  <FileText className="w-4 h-4" />
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
            </div>
          )}
        </>
      )}

      {/* MODAL: SETUP SALARY */}
      {setupSalaryTeacher && (
        <Modal isOpen={!!setupSalaryTeacher} onClose={() => setSetupSalaryTeacher(null)} title="Setup Monthly Salary">
          <div className="space-y-4 text-left">
            <p className="text-xs text-slate-500">
              Configure the monthly base salary for <span className="font-bold text-slate-800 dark:text-white">{setupSalaryTeacher.name}</span> ({setupSalaryTeacher.empId}). This base salary will be used for calculations.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Monthly Base Salary Amount (₹)</label>
              <input
                type="number"
                placeholder="Enter base salary, e.g., 35000"
                value={setupSalaryAmount}
                onChange={e => setSetupSalaryAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-900 dark:text-white font-mono rounded-xl outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setSetupSalaryTeacher(null)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSalary}
                disabled={isSettingSalary}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSettingSalary && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Salary
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: SALARY PREVIEW */}
      {previewTeacher && (
        <Modal isOpen={!!previewTeacher} onClose={() => setPreviewTeacher(null)} title="Salary Calculation Preview">
          {isPreviewLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : previewData ? (
            <div className="space-y-5 text-left">
              {!previewData.hasAttendance && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-750 dark:text-rose-400 p-4 rounded-xl text-xs font-bold">
                  ⚠️ No attendance data found for this period in the database. Salary calculations require attendance to be marked first.
                </div>
              )}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-border rounded-xl grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Employee Name</span>
                  <p className="font-bold text-slate-800 dark:text-white mt-1">{previewData.teacherName}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Employee ID</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-white mt-1">{previewData.employeeId}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Monthly Contract Salary</span>
                  <p className="font-bold text-slate-800 dark:text-white mt-1">{money(previewData.monthlySalary)}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Salary Period</span>
                  <p className="font-bold text-slate-800 dark:text-white mt-1">{previewData.salaryPeriod}</p>
                </div>
              </div>

              {/* Attendance metrics */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 font-bold border-b border-border text-xs text-slate-850 dark:text-slate-200">
                  Attendance Metrics Log
                </div>
                <div className="p-4 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg border border-border">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Working Days</span>
                    <span className="text-xl font-bold text-slate-800 dark:text-white mt-1 block">{previewData.workingDays}</span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">Present Days</span>
                    <span className="text-xl font-bold mt-1 block">{previewData.presentDays}</span>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-100 dark:border-rose-500/20 text-rose-800 dark:text-rose-400">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider block">Absent Days</span>
                    <span className="text-xl font-bold mt-1 block">{previewData.absentDays}</span>
                  </div>
                </div>
              </div>

              {/* Calculation metrics */}
              <div className="space-y-3 text-xs border-t border-border pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Monthly Contract Salary</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-white">{money(previewData.monthlySalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Daily Salary (Monthly Salary ÷ 26)</span>
                  <span className="font-bold font-mono text-slate-700 dark:text-slate-350">{money(previewData.dailySalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Payable Days (Present Days)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{previewData.payableDays} days</span>
                </div>
                <div className="flex justify-between text-[14px] font-black border-t border-dashed border-border pt-3">
                  <span className="text-slate-800 dark:text-white">Total Payable Amount</span>
                  <span className="text-primary font-mono font-bold">{money(previewData.totalPayableAmount)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPreviewTeacher(null)}
                  className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-450">Unable to calculate.</div>
          )}
        </Modal>
      )}

      {/* MODAL: PAY SALARY */}
      {payTeacher && (
        <Modal isOpen={!!payTeacher} onClose={() => setPayTeacher(null)} title="Disburse Salary Payroll">
          {isPayLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 text-left">
              {/* Calculation Type Dropdown Selector */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-border rounded-xl">
                <label className="block text-xs font-bold text-slate-500 mb-2">Salary Calculation Type</label>
                <div className="relative">
                  <select
                    value={calculationType}
                    onChange={(e) => handleCalculationTypeChange(e.target.value as "Monthly" | "Day Wise")}
                    className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Day Wise">Day Wise</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Date Selectors for Payout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 border border-border rounded-xl">
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-500 mb-2">Salary Start Date</label>
                  <input
                    type="date"
                    value={paymentStartDate}
                    onChange={(e) => {
                      setPaymentStartDate(e.target.value);
                      recalculatePayPreview(payTeacher.id, e.target.value, paymentEndDate);
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                  />
                </div>
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-500 mb-2">Salary End Date</label>
                  <input
                    type="date"
                    value={paymentEndDate}
                    onChange={(e) => {
                      setPaymentEndDate(e.target.value);
                      recalculatePayPreview(payTeacher.id, paymentStartDate, e.target.value);
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                  />
                </div>
              </div>

              {payValidationMsg ? (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-750 dark:text-rose-400 p-4 rounded-xl text-xs font-bold">
                  ⚠️ {payValidationMsg}
                </div>
              ) : payData && !payData.hasAttendance ? (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-750 dark:text-rose-400 p-4 rounded-xl text-xs font-bold">
                  ⚠️ No attendance data found for this period in the database. Attendance records must exist before disburse.
                </div>
              ) : null}

              {payData ? (
                <>
                  {/* Payment Details overview */}
                  <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Payable Amount</span>
                    <h3 className="text-2xl font-mono font-bold text-emerald-400">{money(payData.totalPayableAmount)}</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-700 pt-3 text-[12px] text-slate-350">
                      <div>Employee: <span className="text-white font-bold">{payData.teacherName}</span></div>
                      <div>ID: <span className="text-white font-bold">{payData.employeeId}</span></div>
                      <div>Monthly Salary: <span className="text-white font-bold">{money(payData.monthlySalary)}</span></div>
                      <div>Period: <span className="text-white font-bold">{payData.salaryPeriod}</span></div>
                    </div>
                  </div>

                  {/* Date Range Payout Details Summary */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-border rounded-xl space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>Calculation Type</span>
                      <span className="font-bold text-slate-900 dark:text-white">{calculationType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Days</span>
                      <span className="font-bold text-slate-900 dark:text-white">{payData.totalDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Working Days</span>
                      <span className="font-bold text-slate-900 dark:text-white">{payData.workingDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Present Days</span>
                      <span className="font-bold text-emerald-600">{payData.presentDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Absent Days</span>
                      <span className="font-bold text-rose-500">{payData.absentDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Salary (Monthly ÷ 30)</span>
                      <span className="font-bold text-slate-900 dark:text-white">{money(payData.dailySalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payable Days</span>
                      <span className="font-bold text-emerald-600">{payData.payableDays} days</span>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-left">
                        <label className="block text-xs font-bold text-slate-500 mb-2">Payment Date</label>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={e => setPaymentDate(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                        />
                      </div>
                      <div className="text-left">
                        <label className="block text-xs font-bold text-slate-500 mb-2">Remarks / Notes</label>
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={paymentRemarks}
                          onChange={e => setPaymentRemarks(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center border border-dashed border-border rounded-xl text-slate-400 dark:text-slate-500 text-xs font-bold">
                  📅 Please select a valid Start Date and End Date to compute salary metrics.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPayTeacher(null)}
                  className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isConfirmingPayment || !payData || !payData.hasAttendance || !!payValidationMsg}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isConfirmingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* MODAL: HISTORICAL PAYMENTS LOG */}
      {historyTeacher && (
        <Modal isOpen={!!historyTeacher} onClose={() => setHistoryTeacher(null)} title={`${historyTeacher.name} - Payout Logs`} size="lg">
          {isHistoryLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 text-left">
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 dark:bg-slate-950 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Payment Date</th>
                      <th className="px-4 py-3">Monthly Salary</th>
                      <th className="px-4 py-3">Present/Absent</th>
                      <th className="px-4 py-3">Final Salary</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-bold">
                          No past salary payments found in records.
                        </td>
                      </tr>
                    ) : (
                      historyPayments.map((p) => {
                        const [py, pm] = p.salary_period.split("-");
                        const periodName = `${getMonthName(parseInt(pm))} ${py}`;
                        return (
                          <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{periodName}</td>
                            <td className="px-4 py-3 font-bold text-slate-500">{fmtDate(p.payment_date)}</td>
                            <td className="px-4 py-3 font-mono">{money(p.monthly_salary)}</td>
                            <td className="px-4 py-3 font-bold text-slate-550">{p.present_days} / {p.absent_days}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{money(p.final_salary)}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-500/20">
                                Paid
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedSlip({
                                    ...p,
                                    teacher_id: {
                                      name: historyTeacher.name,
                                      employee_id: historyTeacher.empId,
                                      designation: historyTeacher.role
                                    }
                                  });
                                }}
                                className="p-1 text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors inline-block"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setHistoryTeacher(null)}
                  className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Close History
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* MODAL: SALARY SLIP VIEW/PRINT */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            
            {/* Slip Header Actions */}
            <div className="flex items-center justify-between p-4 border-b border-border print:hidden">
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Teacher Salary Slip</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
                <button 
                  onClick={() => setSelectedSlip(null)}
                  className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip Container */}
            <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible print:w-full print:absolute print:left-0 print:top-0 text-left font-serif" id="printable-payslip">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * { visibility: hidden; }
                  #printable-payslip, #printable-payslip * { visibility: visible; }
                  #printable-payslip { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
                }
              `}} />

              {/* School Details */}
              <div className="text-center mb-8 border-b-2 border-slate-800 pb-5">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">My School Life</h1>
                <p className="text-slate-500 text-xs dark:text-slate-450 italic">Professional School ERP Document Center</p>
                <div className="mt-4 inline-block bg-slate-900 text-white px-5 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm font-sans">
                  Salary Disbursement Slip
                </div>
              </div>

              {/* Teacher Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 mb-8 text-xs font-sans">
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 w-32">Teacher Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedSlip.teacher_id?.name || "N/A"}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 w-32">Employee ID:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedSlip.teacher_id?.employee_id || "N/A"}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 w-32">Designation:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedSlip.teacher_id?.designation || "Teacher"}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 w-32">Calculation Type:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedSlip.calculation_type || "Monthly"}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1 col-span-2">
                  <span className="font-bold text-slate-500 w-32">Salary Period:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedSlip.salary_period || "—"}
                  </span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 w-32">Receipt Number:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedSlip.receipt_number}</span>
                </div>
                <div className="flex border-b border-dashed border-slate-200 pb-1">
                  <span className="font-bold text-slate-500 w-32">Payment Date:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{fmtDate(selectedSlip.payment_date)}</span>
                </div>
              </div>

              {/* Attendance metrics summary */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 rounded-xl mb-6 text-xs font-sans grid grid-cols-5 gap-4 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Days</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white mt-1 block">
                    {selectedSlip.start_date && selectedSlip.end_date 
                      ? Math.floor((new Date(selectedSlip.end_date).getTime() - new Date(selectedSlip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 
                      : 30} days
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Working Days</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white mt-1 block">{selectedSlip.working_days} days</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Present Days</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-450 mt-1 block">{selectedSlip.present_days} days</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Absent Days</span>
                  <span className="text-sm font-bold text-rose-500 mt-1 block">{selectedSlip.absent_days} days</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payable Days</span>
                  <span className="text-sm font-bold text-emerald-600 mt-1 block">{selectedSlip.present_days} days</span>
                </div>
              </div>

              {/* Payout Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 text-xs font-sans">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-left font-bold text-slate-700">
                      <th className="px-4 py-2.5">Salary Component Description</th>
                      <th className="px-4 py-2.5 text-right">Amount / Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-4 py-3">Monthly Contract Salary</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{money(selectedSlip.monthly_salary)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Daily Salary Rate (Monthly ÷ 30)</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{money(Math.round((selectedSlip.monthly_salary / 30) * 100) / 100)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Payable Days (Present Days)</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{selectedSlip.present_days} days</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900">Total Payable Amount</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-primary">{money(selectedSlip.final_salary)}</td>
                    </tr>
                    {selectedSlip.remarks && (
                      <tr>
                        <td className="px-4 py-3 text-slate-500 italic" colSpan={2}>Remarks: {selectedSlip.remarks}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payout summary strip */}
              <div className="bg-slate-900 text-white rounded-xl p-5 flex items-center justify-between mb-12 font-sans">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daily Salary Rate</span>
                  <div className="text-base font-bold">{money(Math.round((selectedSlip.monthly_salary / 30) * 100) / 100)}</div>
                </div>
                <div className="w-px h-10 bg-slate-800"></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payable Days</span>
                  <div className="text-base font-bold">{selectedSlip.present_days} days</div>
                </div>
                <div className="w-px h-10 bg-slate-800"></div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-450 tracking-wider">Total Salary Paid</span>
                  <div className="text-xl font-black text-emerald-400">{money(selectedSlip.final_salary)}</div>
                </div>
              </div>

              {/* Signature block */}
              <div className="flex justify-between items-end mt-12 pt-8 text-xs font-sans font-bold text-slate-800 dark:text-slate-100">
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1.5">Prepared By</div>
                </div>
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1.5">Employee Signature</div>
                </div>
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1.5">Authorized Signature</div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
