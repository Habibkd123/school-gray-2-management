"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTeachers } from "@/app/hooks/useTeachers";
import {
  DollarSign,
  Users,
  TrendingUp,
  Search,
  Check,
  FileText,
  Loader2,
  CreditCard,
  Printer,
  ChevronDown,
  X,
  Calendar,
  Clock,
  History,
  AlertCircle,
  Edit2,
  Trash2,
  PlusCircle,
  Filter,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { getPersistedPageSize, PaginationBar } from "@/app/components/ui/pagination-bar";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { getAuthHeaders } from "@/lib/utils/session";
import { GenerateDocumentWizard } from "@/app/components/document-builder/GenerateDocumentWizard";

export default function SalaryDashboardPage() {
  const { teachers, isLoading: isTeachersLoading, fetchTeachers } = useTeachers();

  // Tab/Search State
  const [activeTab, setActiveTab] = useState<"desk" | "reports">("desk");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Month-wise Period Picker (Default to current month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return String(new Date().getMonth() + 1).padStart(2, "0");
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear());
  });

  const selectedPeriod = useMemo(() => {
    return `${selectedYear}-${selectedMonth}`;
  }, [selectedMonth, selectedYear]);

  // Backend Payments Data State
  const [paymentsData, setPaymentsData] = useState<{
    payments: any[];
    summary: { totalPaid: number; totalPending: number; pendingCount: number; count: number };
  }>({
    payments: [],
    summary: { totalPaid: 0, totalPending: 0, pendingCount: 0, count: 0 }
  });

  const [allPayments, setAllPayments] = useState<any[]>([]); // To compute Last Paid Date globally
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(10));

  // Modal States
  const [setupTeacher, setSetupTeacher] = useState<any | null>(null);
  const [setupAmount, setSetupAmount] = useState("");
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  const [editPayrollRecord, setEditPayrollRecord] = useState<any | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit / Disbursement fields
  const [workingDays, setWorkingDays] = useState(30);
  const [presentDays, setPresentDays] = useState(30);
  const [absentDays, setAbsentDays] = useState(0);
  const [lateDays, setLateDays] = useState(0);
  const [halfDays, setHalfDays] = useState(0);
  const [leaveDays, setLeaveDays] = useState(0);
  const [holidayDays, setHolidayDays] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [overtimeAmount, setOvertimeAmount] = useState(0);
  const [taxDeduction, setTaxDeduction] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payrollStatus, setPayrollStatus] = useState<"Draft" | "Approved" | "Paid">("Draft");
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [finalSalaryOverride, setFinalSalaryOverride] = useState(0);

  const [historyTeacher, setHistoryTeacher] = useState<any | null>(null);
  const [historyPayments, setHistoryPayments] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Bulk operation states
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState("");

  // Document Wizard
  const [isGenerateWizardOpen, setIsGenerateWizardOpen] = useState(false);
  const [generateSlipId, setGenerateSlipId] = useState<string | null>(null);
  const [generateTeacherName, setGenerateTeacherName] = useState("");

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (!isTeachersLoading && !isBulkLoading && !isPaymentsLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isTeachersLoading, isBulkLoading, isPaymentsLoading]);

  // ─── Fetch API Payments ─────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setIsPaymentsLoading(true);
    try {
      const res = await fetch(`/api/salaries?period=${selectedPeriod}&_t=${Date.now()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setPaymentsData(data.data);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setIsPaymentsLoading(false);
    }
  }, [selectedPeriod]);

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

  // Compute Last Paid Date and current status for each teacher for the active month
  const salaryList = useMemo(() => {
    return teachers.map((t) => {
      const baseSalary = t.basic_salary || 0;

      // Find latest payout globally for "Last Paid Date" column
      const teacherPayouts = allPayments.filter(
        p => p.teacher_id && (p.teacher_id._id === t._id || p.teacher_id === t._id)
      );

      let lastPaid = "Never";
      if (teacherPayouts.length > 0) {
        const sorted = [...teacherPayouts].sort(
          (a, b) => new Date(b.payment_date || b.createdAt).getTime() - new Date(a.payment_date || a.createdAt).getTime()
        );
        const latest = sorted[0];
        lastPaid = latest.payment_date
          ? new Date(latest.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "Draft Generated";
      }

      // Check active period payout record in paymentsData
      const periodPayout = paymentsData.payments.find(
        p => p.teacher_id && (p.teacher_id._id === t._id || p.teacher_id === t._id)
      );

      let status = "Unpaid";
      if (baseSalary === 0) status = "Pending";
      else if (periodPayout) status = periodPayout.status; // Draft, Approved, Paid

      return {
        id: t._id,
        name: t.name,
        empId: t.employee_id || "EMP-N/A",
        role: (t as any).designation || t.department || "Teacher",
        basic: baseSalary,
        lastPaid,
        status,
        payoutRecord: periodPayout || null
      };
    });
  }, [teachers, allPayments, paymentsData.payments]);

  // Search & Status filters
  const filteredSalaries = useMemo(() => {
    return salaryList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.empId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || s.status === selectedStatus;
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

  // ─── Setup Base Salary ──────────────────────────────────────────
  const openSetupSalary = (teacher: any) => {
    setSetupTeacher(teacher);
    setSetupAmount(teacher.basic ? String(teacher.basic) : "");
  };

  const handleSaveSetup = async () => {
    const amt = Number(setupAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid salary amount.");
      return;
    }

    setIsSavingSetup(true);
    try {
      const res = await fetch(`/api/teachers/${setupTeacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ basic_salary: amt }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchTeachers();
        setSetupTeacher(null);
      } else {
        alert(result.message || "Failed to configure base salary.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving salary config.");
    } finally {
      setIsSavingSetup(false);
    }
  };

  // ─── Generate Single Draft Payroll ─────────────────────────────
  const handleGenerateSingleDraft = async (teacher: any) => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          bulk: true,
          salary_period: selectedPeriod,
          teacher_ids: [teacher.id]
        })
      });
      const result = await res.json();
      if (result.success) {
        await fetchPayments();
        await fetchAllPayments();
      } else {
        alert(result.message || "Failed to generate draft.");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating draft payroll.");
    } finally {
      setIsBulkLoading(false);
    }
  };

  // ─── Edit / Disburse Single Payroll Modal ───────────────────────
  const openEditPayroll = async (teacher: any) => {
    let record = teacher.payoutRecord;

    // If not generated, fetch preview first to pre-fill calculations
    if (!record) {
      setIsPaymentsLoading(true);
      try {
        const previewRes = await fetch(`/api/salaries/preview?teacher_id=${teacher.id}&period=${selectedPeriod}`, { headers: getAuthHeaders() });
        const previewJson = await previewRes.json();
        if (previewJson.success) {
          const d = previewJson.data;
          record = {
            teacher_id: { _id: teacher.id, name: teacher.name, employee_id: teacher.empId, designation: teacher.role },
            monthly_salary: d.monthlySalary,
            working_days: d.workingDays,
            present_days: d.presentDays,
            absent_days: d.absentDays,
            late_days: d.lateDays,
            half_days: d.halfDays,
            leave_days: d.leaveDays,
            holiday_days: d.holidayDays,
            suggested_deduction: d.suggestedDeduction,
            payable_amount: d.totalPayableAmount,
            bonus: 0,
            deduction: 0,
            overtime_amount: 0,
            tax_deduction: 0,
            remarks: "",
            status: "Draft",
            calculation_type: "Monthly"
          };
        } else {
          alert(previewJson.message || "Failed to load calculation preview.");
          setIsPaymentsLoading(false);
          return;
        }
      } catch (err) {
        console.error(err);
        alert("Error fetching preview.");
        setIsPaymentsLoading(false);
        return;
      } finally {
        setIsPaymentsLoading(false);
      }
    }

    setEditPayrollRecord(record);
    setWorkingDays(record.working_days);
    setPresentDays(record.present_days);
    setAbsentDays(record.absent_days);
    setLateDays(record.late_days || 0);
    setHalfDays(record.half_days || 0);
    setLeaveDays(record.leave_days || 0);
    setHolidayDays(record.holiday_days || 0);
    setBonus(record.bonus || 0);
    setDeduction(record.deduction || 0);
    setOvertimeAmount(record.overtime_amount || 0);
    setTaxDeduction(record.tax_deduction || 0);
    setRemarks(record.remarks || "");
    setPaymentMethod(record.payment_method || "Bank Transfer");
    setPaymentDate(record.payment_date ? record.payment_date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setPayrollStatus(record.status || "Draft");
    setIsManualOverride(false);
    setFinalSalaryOverride(record.final_salary || record.payable_amount);
  };

  // Re-calculate suggested deduction and payable amount based on inputs
  const calculatedSuggestedDeduction = useMemo(() => {
    if (!editPayrollRecord) return 0;
    const dailyRate = Math.round((editPayrollRecord.monthly_salary / 30) * 100) / 100;
    return Math.round((absentDays * dailyRate) * 100) / 100;
  }, [editPayrollRecord, absentDays]);

  const calculatedPayableAmount = useMemo(() => {
    if (!editPayrollRecord) return 0;
    return Math.max(0, Math.round((editPayrollRecord.monthly_salary - calculatedSuggestedDeduction) * 100) / 100);
  }, [editPayrollRecord, calculatedSuggestedDeduction]);

  const calculatedFinalSalary = useMemo(() => {
    if (isManualOverride) return finalSalaryOverride;
    return Math.max(0, Math.round((calculatedPayableAmount + Number(bonus) - Number(deduction) + Number(overtimeAmount) - Number(taxDeduction)) * 100) / 100);
  }, [isManualOverride, finalSalaryOverride, calculatedPayableAmount, bonus, deduction, overtimeAmount, taxDeduction]);

  const handleSavePayroll = async () => {
    if (!editPayrollRecord) return;

    setIsSavingEdit(true);
    try {
      const payload = {
        teacher_id: editPayrollRecord.teacher_id._id || editPayrollRecord.teacher_id,
        salary_period: selectedPeriod,
        monthly_salary: editPayrollRecord.monthly_salary,
        working_days: Number(workingDays),
        present_days: Number(presentDays),
        absent_days: Number(absentDays),
        late_days: Number(lateDays),
        half_days: Number(halfDays),
        leave_days: Number(leaveDays),
        holiday_days: Number(holidayDays),
        suggested_deduction: calculatedSuggestedDeduction,
        payable_amount: calculatedPayableAmount,
        bonus: Number(bonus),
        deduction: Number(deduction),
        overtime_amount: Number(overtimeAmount),
        tax_deduction: Number(taxDeduction),
        final_salary: calculatedFinalSalary,
        payment_date: payrollStatus === "Paid" ? paymentDate : undefined,
        payment_method: paymentMethod,
        remarks,
        status: payrollStatus,
        calculation_type: "Monthly"
      };

      let res;
      if (editPayrollRecord._id) {
        // Update existing record
        res = await fetch(`/api/salaries/${editPayrollRecord._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new record (disburse without generating draft first)
        res = await fetch("/api/salaries", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload)
        });
      }

      const result = await res.json();
      if (result.success) {
        await fetchPayments();
        await fetchAllPayments();
        setEditPayrollRecord(null);

        // If paid, open the slip in a new window automatically
        if (payrollStatus === "Paid" && (result.data?._id || editPayrollRecord._id)) {
          window.open(`/salary/print/${result.data?._id || editPayrollRecord._id}`, "_blank");
        }
      } else {
        alert(result.message || "Failed to process payroll.");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing payroll.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ─── Cancel Payout / Delete Record ─────────────────────────────
  const handleCancelPayment = async (record: any) => {
    if (!window.confirm("Are you sure you want to cancel this payroll? This will permanently delete the payout record.")) return;

    setIsPaymentsLoading(true);
    try {
      const res = await fetch(`/api/salaries/${record._id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        await fetchPayments();
        await fetchAllPayments();
      } else {
        alert(data.message || "Failed to cancel payroll.");
      }
    } catch (err) {
      console.error(err);
      alert("Error canceling payroll.");
    } finally {
      setIsPaymentsLoading(false);
    }
  };

  // ─── Bulk Operations Trigger ────────────────────────────────────
  const handleBulkOperation = async (op: string) => {
    if (!op) return;
    setBulkAction("");

    const actionLabels: any = {
      generate: "Bulk Generate Draft payroll records for all unpaid teachers",
      approve: "Bulk Approve all Draft payroll records",
      pay: "Bulk Pay and disburse all Approved & Draft records"
    };

    if (!window.confirm(`Are you sure you want to run: ${actionLabels[op]} for period ${selectedPeriod}?`)) {
      return;
    }

    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          bulk: true,
          salary_period: selectedPeriod,
          action: op
        })
      });
      const data = await res.json();
      alert(data.message || "Bulk operation completed.");
      await fetchPayments();
      await fetchAllPayments();
    } catch (err) {
      console.error(err);
      alert("Error processing bulk operation.");
    } finally {
      setIsBulkLoading(false);
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
      }
    } catch (err) {
      console.error(err);
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

  // Column definitions for Salary Desk Table
  const deskColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      header: "Employee",
      render: (s) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.role}</span>
        </div>
      )
    },
    {
      header: "Emp ID",
      accessorKey: "empId",
      render: (s) => <span className="font-sans font-bold text-slate-600 dark:text-slate-400">{s.empId}</span>
    },
    {
      header: "Base Contract",
      render: (s) => (
        s.basic > 0 ? (
          <span className="font-sans font-bold text-slate-800 dark:text-slate-200">{money(s.basic)}</span>
        ) : (
          <button
            onClick={() => openSetupSalary(s)}
            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-250 bg-slate-100 dark:bg-slate-850 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 border border-border"
          >
            Configure Salary
          </button>
        )
      )
    },
    {
      header: "Attendance Stats",
      render: (s) => (
        s.payoutRecord ? (
          <span className="font-bold text-slate-600 dark:text-slate-400">{s.payoutRecord.present_days} Pres / {s.payoutRecord.absent_days} Abs</span>
        ) : (
          <span className="text-slate-400 text-xs">Not generated</span>
        )
      )
    },
    {
      header: "Last Payout",
      accessorKey: "lastPaid",
      render: (s) => <span className="font-bold text-slate-500 dark:text-slate-400">{s.lastPaid}</span>
    },
    {
      header: "Status",
      render: (s) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
          s.status === "Paid"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-500/20"
            : s.status === "Approved"
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-450 dark:border-blue-500/20"
              : s.status === "Draft"
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-450 dark:border-amber-500/20"
                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-450 dark:border-rose-500/20"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            s.status === "Paid"
              ? "bg-emerald-500"
              : s.status === "Approved"
                ? "bg-blue-500"
                : s.status === "Draft"
                  ? "bg-amber-500"
                  : "bg-rose-500"
          }`} />
          {s.status}
        </span>
      )
    },
    {
      header: "Process",
      className: "text-center",
      render: (s) => (
        s.status === "Pending" ? (
          <span className="text-slate-400 text-xs">—</span>
        ) : s.status === "Unpaid" ? (
          <button
            onClick={() => handleGenerateSingleDraft(s)}
            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-border rounded-lg transition-all"
          >
            Generate Draft
          </button>
        ) : (
          <button
            onClick={() => openEditPayroll(s)}
            className="px-2.5 py-1 text-[11px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 transition-all flex items-center gap-1 mx-auto"
          >
            Pay
          </button>
        )
      )
    },
    {
      header: "Actions",
      className: "text-right",
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          {s.payoutRecord && s.status === "Paid" && (
            <>
              <button
                onClick={() => window.open(`/salary/print/${s.payoutRecord._id}`, "_blank")}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                title="Print Salary Slip"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setGenerateSlipId(s.payoutRecord._id);
                  setGenerateTeacherName(s.name);
                  setIsGenerateWizardOpen(true);
                }}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                title="Generate Document PDF"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCancelPayment(s.payoutRecord)}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                title="Cancel Payment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {s.payoutRecord && s.status !== "Paid" && (
            <button
              onClick={() => handleCancelPayment(s.payoutRecord)}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-all"
              title="Delete Draft Payout"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => openHistory(s)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
            title="Salary Logs History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], [money, openSetupSalary, handleGenerateSingleDraft, openEditPayroll, handleCancelPayment, openHistory]);

  // Column definitions for Reports Payouts Table
  const reportsColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      header: "Receipt No.",
      accessorKey: "receipt_number",
      render: (p) => <span className="font-sans font-bold text-slate-655">{p.receipt_number}</span>
    },
    {
      header: "Employee",
      render: (p) => {
        const teacher = p.teacher_id || {};
        return (
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">{teacher.name || "Unknown"}</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ID: {teacher.employee_id || "N/A"}</span>
          </div>
        );
      }
    },
    {
      header: "Contract Base",
      accessorKey: "monthly_salary",
      render: (p) => <span className="font-sans text-slate-700 dark:text-slate-350">{money(p.monthly_salary)}</span>
    },
    {
      header: "Present/Absent",
      render: (p) => <span className="text-slate-600 dark:text-slate-400 font-bold">{p.present_days} / {p.absent_days}</span>
    },
    {
      header: "Deduction",
      render: (p) => <span className="font-sans text-rose-500 font-bold">-{money(p.suggested_deduction)}</span>
    },
    {
      header: "Amount Paid",
      accessorKey: "final_salary",
      render: (p) => <span className="font-sans font-black text-slate-900 dark:text-white">{money(p.final_salary)}</span>
    },
    {
      header: "Payment Date",
      accessorKey: "payment_date",
      render: (p) => <span className="font-bold text-slate-500">{fmtDate(p.payment_date)}</span>
    },
    {
      header: "Slip",
      className: "text-right",
      render: (p) => (
        <button
          onClick={() => window.open(`/salary/print/${p._id}`, "_blank")}
          className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors inline-block"
        >
          <FileText className="w-4 h-4" />
        </button>
      )
    }
  ], [money, fmtDate]);

  // Export to CSV
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
        `"${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "Pending"}"`,
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
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" /> Subject Syllabus & Payroll Hub
          </h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span>Finance</span>
            <span>/</span>
            <span className="text-slate-905 dark:text-white font-medium">Salaries</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {["desk", "reports"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${activeTab === tab
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-300"
                }`}
            >
              {tab} Desk
            </button>
          ))}
        </div>
      </div>

      {(isTeachersLoading || isBulkLoading) && isInitialLoad ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs text-slate-500 font-bold">Processing Payroll Data...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-12 text-center text-slate-455 font-bold">
          No employee records found. Please configure Teachers profile first.
        </div>
      ) : (
        <div className={`relative transition-opacity duration-200 ${(isTeachersLoading || isBulkLoading || isPaymentsLoading) && !isInitialLoad ? "opacity-60 pointer-events-none" : ""}`}>
          {(isTeachersLoading || isBulkLoading || isPaymentsLoading) && !isInitialLoad && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-border shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Syncing Payroll...</span>
            </div>
          )}
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Disbursed Budget</span>
                  <span className="text-lg font-extrabold block text-slate-900 dark:text-white mt-0.5">{money(paymentsData.summary.totalPaid)}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/20 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                {paymentsData.summary.count} Paid
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Pending Budget</span>
                  <span className="text-lg font-extrabold block text-slate-900 dark:text-white mt-0.5">{money(paymentsData.summary.totalPending)}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded-md">
                {paymentsData.summary.pendingCount} Unpaid
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Staff Size</span>
                  <span className="text-lg font-extrabold block text-slate-900 dark:text-white mt-0.5">{teachers.length} Employees</span>
                </div>
              </div>
            </div>
          </div>

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
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Salary Month</label>
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                      >
                        {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((m) => (
                          <option key={m} value={m}>{getMonthName(parseInt(m))}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Salary Year</label>
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                      >
                        {["2025", "2026", "2027", "2028", "2029", "2030"].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Filter and Bulk Operations Options */}
                <div className="flex flex-wrap items-center justify-between border-t border-border pt-4 gap-4">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-border">
                    {["all", "Draft", "Approved", "Paid", "Unpaid", "Pending"].map((st) => (
                      <button
                        key={st}
                        onClick={() => { setSelectedStatus(st); setCurrentPage(1); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedStatus === st
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-border"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                          }`}
                      >
                        {st === "all" ? "All Statuses" : st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <select
                        value={bulkAction}
                        onChange={(e) => handleBulkOperation(e.target.value)}
                        className="pl-3 pr-8 py-1.5 bg-primary text-white text-xs font-bold rounded-lg outline-none appearance-none cursor-pointer shadow-sm hover:bg-primary/90"
                      >
                        <option value="">⚡ Bulk Operations</option>
                        <option value="generate">Generate Drafts</option>
                        <option value="approve">Approve Drafts</option>
                        <option value="pay">Disburse (Pay)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-white absolute right-2.5 top-2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Desk */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
                <DataTable
                  columns={deskColumns}
                  data={pagedSalaries}
                  noDataMessage="No employee records match the filter criteria."
                  minWidth="1000px"
                />
              </div>

              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {/* TAB 2: REPORTS DESK */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="bg-white dark:bg-slate-900 border border-border p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Salary Month</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                    >
                      {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((m) => (
                        <option key={m} value={m}>{getMonthName(parseInt(m))}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Salary Year</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                    >
                      {["2025", "2026", "2027", "2028", "2029", "2030"].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="btn btn-outline"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV Report
                  </button>
                  <button
                    onClick={() => { import("@/app/lib/print-service").then(m => m.PrintService.print("printable-salary-report", { pageSize: "A4", margin: "10mm" })) }}
                    className="btn btn-primary"
                  >
                    <Printer className="w-4 h-4" /> Print / Export PDF
                  </button>
                </div>
              </div>

              {/* Payments Report Table */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden" id="printable-salary-report" data-print-zone="true">
                <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 text-left">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">Disbursement Log - {getMonthName(parseInt(selectedMonth))} {selectedYear}</h3>
                </div>
                <DataTable
                  columns={reportsColumns}
                  data={paymentsData.payments}
                  noDataMessage="No disbursements recorded for this month."
                  minWidth="1000px"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: SETUP BASE CONTRACT SALARY */}
      {setupTeacher && (
        <Modal isOpen={!!setupTeacher} onClose={() => setSetupTeacher(null)} title="Setup Base Contract Salary">
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Configure the monthly basic starting contract salary for <span className="font-bold text-slate-800 dark:text-white">{setupTeacher.name}</span>.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Monthly Base Salary (₹)</label>
              <input
                type="number"
                placeholder="Enter base salary, e.g., 35000"
                value={setupAmount}
                onChange={e => setSetupAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-900 dark:text-white font-sans rounded-xl outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setSetupTeacher(null)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSetup}
                disabled={isSavingSetup}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSavingSetup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Salary
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: EDIT / PROCESS PAYROLL RECORD */}
      {editPayrollRecord && (
        <Modal isOpen={!!editPayrollRecord} onClose={() => setEditPayrollRecord(null)} title="Process Payroll Slip" size="lg">
          <div className="space-y-4 text-left">
            <div className="p-4 bg-slate-900 text-white rounded-xl grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Employee Name</span>
                <p className="font-bold text-white mt-1">{editPayrollRecord.teacher_id?.name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Employee ID</span>
                <p className="font-sans font-bold text-white mt-1">{editPayrollRecord.teacher_id?.employee_id || "EMP-N/A"}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Monthly Contract Base</span>
                <p className="font-bold text-white mt-1">{money(editPayrollRecord.monthly_salary)}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Salary Period</span>
                <p className="font-bold text-white mt-1">{selectedPeriod}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Working Days</label>
                <input
                  type="number"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Present Days</label>
                <input
                  type="number"
                  value={presentDays}
                  onChange={(e) => setPresentDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold text-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Absent Days</label>
                <input
                  type="number"
                  value={absentDays}
                  onChange={(e) => setAbsentDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold text-rose-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Late Days</label>
                <input
                  type="number"
                  value={lateDays}
                  onChange={(e) => setLateDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Half Days</label>
                <input
                  type="number"
                  value={halfDays}
                  onChange={(e) => setHalfDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Holiday/Leave Days</label>
                <input
                  type="number"
                  value={leaveDays + holidayDays}
                  onChange={(e) => {
                    setLeaveDays(Number(e.target.value));
                    setHolidayDays(0);
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white border-b pb-1">Earnings & Additions</h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Bonus (₹)</label>
                    <input
                      type="number"
                      value={bonus}
                      onChange={(e) => setBonus(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg text-emerald-600 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Overtime (₹)</label>
                    <input
                      type="number"
                      value={overtimeAmount}
                      onChange={(e) => setOvertimeAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg text-emerald-600 font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white border-b pb-1">Deductions & Adjustments</h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Deduction (₹)</label>
                    <input
                      type="number"
                      value={deduction}
                      onChange={(e) => setDeduction(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg text-rose-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Tax Withheld (₹)</label>
                    <input
                      type="number"
                      value={taxDeduction}
                      onChange={(e) => setTaxDeduction(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg text-rose-500 font-sans"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Log */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-border rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Daily Salary Rate (Monthly contract ÷ 30)</span>
                <span className="font-bold text-slate-800 dark:text-white">{money(Math.round((editPayrollRecord.monthly_salary / 30) * 100) / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span>Absence Deduction ({absentDays} days)</span>
                <span className="font-bold text-rose-500">-{money(calculatedSuggestedDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Auto-Calculated Payable</span>
                <span className="font-bold text-slate-800 dark:text-white">{money(calculatedPayableAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t pt-2 mt-2">
                <span>Final Formula-based Net Salary</span>
                <span className="text-primary">{money(calculatedFinalSalary)}</span>
              </div>
            </div>

            {/* Manual Override Option */}
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 px-4 py-2 border border-border rounded-xl text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isManualOverride}
                  onChange={(e) => setIsManualOverride(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="font-bold text-slate-700 dark:text-slate-350">Manual Override Net Pay</span>
              </label>
              {isManualOverride && (
                <input
                  type="number"
                  value={finalSalaryOverride}
                  onChange={(e) => setFinalSalaryOverride(Number(e.target.value))}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-border rounded-md text-xs font-bold text-primary font-sans w-32"
                />
              )}
            </div>

            {/* Payment Meta Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
                <div className="relative">
                  <select
                    value={payrollStatus}
                    onChange={(e) => setPayrollStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Approved">Approved</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Method</label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              {payrollStatus === "Paid" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg font-bold"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Remarks / Remarks</label>
              <input
                type="text"
                placeholder="Disbursement notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-xs rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setEditPayrollRecord(null)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePayroll}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
              >
                {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {payrollStatus === "Paid" ? "Confirm Disbursement" : "Save Payroll Details"}
              </button>
            </div>
          </div>
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
              <div className="erp-table-wrap overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Payment Date</th>
                      <th>Monthly Salary</th>
                      <th>Present/Absent</th>
                      <th>Final Salary</th>
                      <th>Status</th>
                      <th className="col-right">Slip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="table-empty">
                          No past salary payments found in records.
                        </td>
                      </tr>
                    ) : (
                      historyPayments.map((p) => {
                        const [py, pm] = p.salary_period.split("-");
                        const periodName = `${getMonthName(parseInt(pm))} ${py}`;
                        return (
                          <tr key={p._id}>
                            <td className="font-bold text-slate-800 dark:text-slate-100">{periodName}</td>
                            <td className="font-bold text-slate-500">{fmtDate(p.payment_date)}</td>
                            <td className="font-sans">{money(p.monthly_salary)}</td>
                            <td className="font-bold text-slate-550">{p.present_days} / {p.absent_days}</td>
                            <td className="font-sans font-bold text-slate-900 dark:text-white">{money(p.final_salary)}</td>
                            <td>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.status === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-500/20"
                                : p.status === "Approved"
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="col-right">
                              <button
                                onClick={() => window.open(`/salary/print/${p._id}`, "_blank")}
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

      {/* Generate Salary Slip Wizard */}
      <GenerateDocumentWizard
        open={isGenerateWizardOpen}
        onClose={() => setIsGenerateWizardOpen(false)}
        defaultModule="salary"
        defaultReferenceId={generateSlipId || undefined}
        defaultReferenceLabel={generateTeacherName ? `Salary Slip — ${generateTeacherName}` : undefined}
      />
    </div>
  );
}
