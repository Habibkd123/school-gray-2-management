"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReportTabs from "../ReportTabs";
import { useClasses } from "@/app/hooks/useClasses";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";
import { TeacherService } from "@/app/services/TeacherService";
import {
  BarChart2,
  Calendar,
  Download,
  FileText,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  TrendingUp,
  DollarSign,
  ChevronDown,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { PrintService } from "@/app/lib/print-service";
interface ClassWiseSummary {
  class_id: string;
  class_name: string;
  student_count: number;
  total_fees: number;
  total_paid: number;
  balance_amount: number;
}

interface TeacherSalaryRow {
  _id: string;
  name: string;
  employee_id: string;
  salary_period: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  remarks?: string;
}

// ─── Module Cache Helpers ──────────────────────────────────────────
const SS_FINANCE_FEES_PREFIX = "sm_rep_fin_fees_";
const SS_FINANCE_SALARIES_PREFIX = "sm_rep_fin_sal_";

function getStoredFinanceFees(key: string): any[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_FINANCE_FEES_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < 60_000 && Array.isArray(parsed.data) && parsed.data.length > 0) {
      return parsed.data;
    }
  } catch { }
  return null;
}

function setStoredFinanceFees(key: string, data: any[]) {
  if (typeof window === "undefined" || !Array.isArray(data) || data.length === 0) return;
  try {
    sessionStorage.setItem(SS_FINANCE_FEES_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { }
}

function getStoredFinanceSalaries(key: string): { payments: any[]; teachers: any[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_FINANCE_SALARIES_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < 60_000 && parsed.data) {
      const rawPayments = parsed.data.payments;
      const rawTeachers = parsed.data.teachers;
      const payments = Array.isArray(rawPayments) ? rawPayments : [];
      const teachers = Array.isArray(rawTeachers)
        ? rawTeachers
        : (Array.isArray(rawTeachers?.teachers) ? rawTeachers.teachers : []);
      if (payments.length === 0 && teachers.length === 0) return null;
      return { payments, teachers };
    }
  } catch { }
  return null;
}

function setStoredFinanceSalaries(key: string, data: { payments: any[]; teachers: any[] }) {
  if (typeof window === "undefined") return;
  try {
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const teachers = Array.isArray(data.teachers)
      ? data.teachers
      : (Array.isArray((data.teachers as any)?.teachers) ? (data.teachers as any).teachers : []);
    sessionStorage.setItem(SS_FINANCE_SALARIES_PREFIX + key, JSON.stringify({ data: { payments, teachers }, timestamp: Date.now() }));
  } catch { }
}

export default function FinanceReportPage() {
  const { user } = useAuth();
  const { academicYear: contextAcademicYear } = useAppState();
  const isSuperAdmin = user?.role === "super_admin";
  const [globalSchoolId, setGlobalSchoolId] = useState("all");
  const [topLevelSchools, setTopLevelSchools] = useState<{ _id: string, name: string }[]>([]);
  const { classes, isLoading: isClassesLoading } = useClasses();

  // Active Tab: student_fees / teacher_salary
  const [activeTab, setActiveTab] = useState<"student_fees" | "teacher_salary">("student_fees");

  // Filter states
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const effectiveAcademicYear = selectedAcademicYear || contextAcademicYear || "2026-2027";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const cachedFees = getStoredFinanceFees(`${effectiveAcademicYear}_${globalSchoolId}_all_all`);
  const cachedSal = getStoredFinanceSalaries(`${globalSchoolId}_all_all`);

  // Student Dues raw & aggregated stats
  const [studentsList, setStudentsList] = useState<any[]>(() => {
    return Array.isArray(cachedFees) ? cachedFees : [];
  });
  const [isLoadingStudents, setIsLoadingStudents] = useState(() => !cachedFees || cachedFees.length === 0);

  // Teacher Salary logs
  const [salariesList, setSalariesList] = useState<any[]>(() => {
    return Array.isArray(cachedSal?.payments) ? cachedSal.payments : [];
  });
  const [teachersList, setTeachersList] = useState<any[]>(() => {
    return Array.isArray(cachedSal?.teachers) ? cachedSal.teachers : [];
  });
  const [isLoadingSalaries, setIsLoadingSalaries] = useState(() => cachedSal === null);

  const [isExportOpen, setIsExportOpen] = useState(false);

  const [feesPage, setFeesPage] = useState(1);
  const [salaryPage, setSalaryPage] = useState(1);
  const PAGE_SIZE = 10;

  // Reset pages when filters change
  useEffect(() => {
    setFeesPage(1);
    setSalaryPage(1);
  }, [selectedClass, selectedStatus, startDate, endDate, activeTab, selectedAcademicYear, globalSchoolId]);

  // Load all student fees data (fetch large limit to compute summaries locally)
  const fetchStudentFees = useCallback(async (skipCache = false) => {
    const cacheKey = `${effectiveAcademicYear}_${globalSchoolId}_${selectedClass || "all"}_${selectedStatus || "all"}`;
    if (!skipCache) {
      const cached = getStoredFinanceFees(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setStudentsList(cached);
        setIsLoadingStudents(false);
        return;
      }
    }
    setIsLoadingStudents(true);

    try {
      const params = new URLSearchParams({
        limit: "2500",
        class_id: selectedClass,
        status: selectedStatus,
      });
      if (effectiveAcademicYear && effectiveAcademicYear !== "all") {
        params.set("academic_year", effectiveAcademicYear);
      }
      if (globalSchoolId && globalSchoolId !== "all") {
        params.set("school_id", globalSchoolId);
      }
      const res = await fetch(`/api/fees?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        const students = Array.isArray(data.data.students) ? data.data.students : (Array.isArray(data.data) ? data.data : []);
        setStudentsList(students);
        if (students.length > 0) {
          setStoredFinanceFees(cacheKey, students);
        }
      }
    } catch (e) {
      console.error("[FinanceReport fetchStudentFees Error]", e);
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClass, selectedStatus, globalSchoolId, effectiveAcademicYear]);

  // Load salaries history & teachers list
  const fetchTeacherSalaries = useCallback(async (skipCache = false) => {
    const cacheKey = `${globalSchoolId}_${startDate || "all"}_${endDate || "all"}`;
    if (!skipCache) {
      const cached = getStoredFinanceSalaries(cacheKey);
      if (cached) {
        setSalariesList(cached.payments);
        setTeachersList(cached.teachers);
        setIsLoadingSalaries(false);
        return;
      }
    }
    setIsLoadingSalaries(true);

    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.set("start_date", startDate);
        params.set("end_date", endDate);
      }
      if (globalSchoolId && globalSchoolId !== "all") {
        params.set("school_id", globalSchoolId);
      }
      const [salRes, teachersRes] = await Promise.all([
        fetch(`/api/salaries?${params.toString()}`, { headers: getAuthHeaders() }),
        fetch(`/api/teachers?limit=1000${globalSchoolId !== "all" ? `&school_id=${globalSchoolId}` : ""}`, { headers: getAuthHeaders() }),
      ]);
      const salData = await salRes.json();
      const teachersData = await teachersRes.json();
      const payments = salData.success ? (Array.isArray(salData.data?.payments) ? salData.data.payments : (Array.isArray(salData.data) ? salData.data : [])) : [];
      const teachers = teachersData.success ? (Array.isArray(teachersData.data?.teachers) ? teachersData.data.teachers : (Array.isArray(teachersData.data) ? teachersData.data : [])) : [];
      setSalariesList(payments);
      setTeachersList(teachers);
      if (payments.length > 0 || teachers.length > 0) {
        setStoredFinanceSalaries(cacheKey, { payments, teachers });
      }
    } catch (e) {
      console.error("[FinanceReport fetchTeacherSalaries Error]", e);
    } finally {
      setIsLoadingSalaries(false);
    }
  }, [startDate, endDate, globalSchoolId]);

  useEffect(() => {
    if (activeTab === "student_fees") {
      fetchStudentFees();
    } else {
      fetchTeacherSalaries();
    }
  }, [activeTab, fetchStudentFees, fetchTeacherSalaries]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetch("/api/schools", { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setTopLevelSchools(data.data);
          }
        })
        .catch(console.error);
    }
  }, [isSuperAdmin]);

  // Student Fees aggregates (filtered locally by date if selected)
  const studentDuesAggregates = useMemo(() => {
    let list = Array.isArray(studentsList) ? [...studentsList] : [];

    // Optional local date filtering on lastPaymentDate
    if (startDate || endDate) {
      list = list.filter((s) => {
        if (!s?.lastPaymentDate) return false;
        const pDate = new Date(s.lastPaymentDate);
        if (isNaN(pDate.getTime())) return false;
        if (startDate && pDate < new Date(startDate)) return false;
        if (endDate && pDate > new Date(endDate + "T23:59:59")) return false;
        return true;
      });
    }

    const totalFeesCollection = list.reduce((sum, s) => sum + (Number(s?.totalFees) || 0), 0);
    const paidFees = list.reduce((sum, s) => sum + (Number(s?.totalPaid) || 0), 0);
    const pendingFees = list.reduce((sum, s) => sum + (Number(s?.balanceAmount) || 0), 0);

    // Class wise aggregates grouping
    const classSummaryMap = new Map<string, ClassWiseSummary>();
    list.forEach((s) => {
      if (!s) return;
      const classIdStr = typeof s.class_id === "object" && s.class_id
        ? String(s.class_id._id || s.class_id.id || "unassigned")
        : String(s.class_id || "unassigned");
      const classNameStr = s.class_name || (typeof s.class_id === "object" && s.class_id ? s.class_id.name : "Unassigned");
      let summary = classSummaryMap.get(classIdStr);
      if (!summary) {
        summary = {
          class_id: classIdStr,
          class_name: classNameStr,
          student_count: 0,
          total_fees: 0,
          total_paid: 0,
          balance_amount: 0
        };
      }
      summary.student_count++;
      summary.total_fees += Number(s.totalFees) || 0;
      summary.total_paid += Number(s.totalPaid) || 0;
      summary.balance_amount += Number(s.balanceAmount) || 0;
      classSummaryMap.set(classIdStr, summary);
    });

    return {
      totalFeesCollection,
      paidFees,
      pendingFees,
      classWiseList: Array.from(classSummaryMap.values()),
      filteredStudents: list
    };
  }, [studentsList, startDate, endDate]);

  // Teacher Salary aggregates
  const teacherSalariesAggregates = useMemo(() => {
    const safeSalaries = Array.isArray(salariesList) ? salariesList : [];
    const safeTeachers = Array.isArray(teachersList) ? teachersList : [];

    // Total Salary Paid in range
    const totalPaid = safeSalaries.reduce((sum, p) => sum + (Number(p?.final_salary) || Number(p?.amount_paid) || 0), 0);

    // Total Monthly Contract salary for all active teachers
    const totalContractSalaries = safeTeachers
      .filter((t) => t && t.is_active)
      .reduce((sum, t) => sum + (Number(t.monthly_salary) || Number(t.basic_salary) || 0), 0);

    // Pending salary = Contract - Paid (clipped to 0)
    const pendingSalary = Math.max(0, totalContractSalaries - totalPaid);

    return {
      totalPaid,
      pendingSalary,
      historyLogs: safeSalaries
    };
  }, [salariesList, teachersList]);

  const paginatedClassWise = useMemo(() => {
    const start = (feesPage - 1) * PAGE_SIZE;
    return studentDuesAggregates.classWiseList.slice(start, start + PAGE_SIZE);
  }, [studentDuesAggregates.classWiseList, feesPage]);

  const totalFeesPages = Math.ceil(studentDuesAggregates.classWiseList.length / PAGE_SIZE);

  const paginatedHistoryLogs = useMemo(() => {
    const start = (salaryPage - 1) * PAGE_SIZE;
    return teacherSalariesAggregates.historyLogs.slice(start, start + PAGE_SIZE);
  }, [teacherSalariesAggregates.historyLogs, salaryPage]);

  const totalSalaryPages = Math.ceil(teacherSalariesAggregates.historyLogs.length / PAGE_SIZE);

  // Export to Excel / CSV
  const handleExport = (format: "csv" | "excel") => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "";

    if (activeTab === "student_fees") {
      headers = ["Student Name", "Admission No", "Class", "Total Fees (₹)", "Paid Fees (₹)", "Pending Dues (₹)", "Status"];
      rows = studentDuesAggregates.filteredStudents.map((s) => [
        s.name,
        s.admission_no,
        s.class_name,
        s.totalFees,
        s.totalPaid,
        s.balanceAmount,
        s.status
      ]);
      filename = `fees_collection_report_${new Date().toISOString().slice(0, 10)}`;
    } else {
      headers = ["Teacher Name", "Employee ID", "Designation", "Salary Period", "Amount Paid (₹)", "Payment Date", "Payment Method", "Remarks"];
      rows = teacherSalariesAggregates.historyLogs.map((p) => [
        p.teacher_id?.name || "N/A",
        p.teacher_id?.employee_id || "N/A",
        p.teacher_id?.designation || "Teacher",
        p.salary_period,
        p.final_salary || p.amount_paid || 0,
        p.payment_date && !isNaN(new Date(p.payment_date).getTime()) ? new Date(p.payment_date).toLocaleDateString() : "N/A",
        p.payment_method || "N/A",
        p.remarks || ""
      ]);
      filename = `salary_payroll_report_${new Date().toISOString().slice(0, 10)}`;
    }

    if (rows.length === 0) {
      alert("No data available to export");
      return;
    }

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.${format === "csv" ? "csv" : "xls"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const money = (val: number | null | undefined) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="print:hidden">
        <ReportTabs />
      </div>

      {/* Header Workspace */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Finance Report</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Finance Report</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin && topLevelSchools.length > 0 && (
            <select
              value={globalSchoolId}
              onChange={(e) => setGlobalSchoolId(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg outline-none cursor-pointer"
            >
              <option value="all">All Schools</option>
              {topLevelSchools.map((sch) => (
                <option key={sch._id} value={sch._id}>{sch.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                try {
                  const toRemove: string[] = [];
                  for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && (key.startsWith(SS_FINANCE_FEES_PREFIX) || key.startsWith(SS_FINANCE_SALARIES_PREFIX))) {
                      toRemove.push(key);
                    }
                  }
                  toRemove.forEach((k) => sessionStorage.removeItem(k));
                } catch { }
              }
              if (activeTab === "student_fees") fetchStudentFees(true);
              else fetchTeacherSalaries(true);
            }}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-400" /> Export CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-400" /> Export Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DATE & FILTERS ROW BLOCK */}
      <div className={`bg-white dark:bg-slate-900 border border-border rounded-xl p-4.5 grid grid-cols-1 sm:grid-cols-2 ${activeTab === "student_fees" ? "md:grid-cols-5" : "md:grid-cols-3"} gap-4 text-left print:hidden shadow-sm`}>
        {activeTab === "student_fees" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Academic Year</label>
            <div className="relative">
              <select
                value={selectedAcademicYear || effectiveAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
                <option value="all">All Academic Years</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        )}

        {activeTab === "student_fees" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Class filter</label>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}{cls.section ? ` - ${cls.section}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        )}

        {activeTab === "student_fees" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Status filter</label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-400">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3.5 py-2.5 border border-border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-400">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3.5 py-2.5 border border-border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
          />
        </div>

        {activeTab === "teacher_salary" && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="w-full px-4 py-2.5 border border-border bg-slate-50 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Clear Date Filter
            </button>
          </div>
        )}
      </div>

      {/* FINANCE TABS SELECTOR */}
      <div className="flex gap-2 border-b border-border pb-px print:hidden">
        <button
          onClick={() => setActiveTab("student_fees")}
          className={`px-5 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${activeTab === "student_fees"
            ? "border-primary text-primary"
            : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
        >
          Student Fees Collection
        </button>
        <button
          onClick={() => setActiveTab("teacher_salary")}
          className={`px-5 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${activeTab === "teacher_salary"
            ? "border-primary text-primary"
            : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
        >
          Teacher Salary Disbursements
        </button>
      </div>

      {/* PRINT-ONLY WORKSPACE TITLE */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6 font-serif">
        <h2 className="text-2xl font-black uppercase tracking-wider">My School Life ERP Finance Ledger</h2>
        <p className="text-xs text-slate-500 mt-1">
          {activeTab === "student_fees" ? "Student Fees Collection Audit Report" : "Teacher Salary Disbursement Audit Report"}
        </p>
        {(startDate || endDate) && (
          <p className="text-[10px] text-slate-450 mt-1.5 font-sans">
            Period: {startDate ? fmtDate(startDate) : "Beginning"} — {endDate ? fmtDate(endDate) : "Today"}
          </p>
        )}
      </div>

      {/* REPORT CONTENT RENDERS */}
      {activeTab === "student_fees" ? (
        <div className="space-y-6">
          {/* Student Aggregates Metric cards */}
          {isLoadingStudents ? (
            <div className="h-40 flex items-center justify-center bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Fees Configured</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{money(studentDuesAggregates.totalFeesCollection)}</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paid Dues Collection</span>
                    <div className="text-xl font-bold text-emerald-600 mt-0.5">{money(studentDuesAggregates.paidFees)}</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-500">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Dues Receivable</span>
                    <div className="text-xl font-bold text-rose-500 mt-0.5">{money(studentDuesAggregates.pendingFees)}</div>
                  </div>
                </div>
              </div>

              {/* Class-wise Collection Table */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
                <div className="p-4 border-b border-border font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                  <span>Class-wise Fee Collection Summary</span>
                  <span className="text-xs font-semibold text-slate-500">
                    Total Classes: {studentDuesAggregates.classWiseList.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="erp-table text-xs w-full table-fixed">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-border text-slate-500 font-bold">
                        <th className="px-6 py-3.5 text-center w-1/5" style={{ textAlign: "center" }}>Class / Grade Name</th>
                        <th className="px-6 py-3.5 text-center w-1/5" style={{ textAlign: "center" }}>Student Count</th>
                        <th className="px-6 py-3.5 text-center w-1/5" style={{ textAlign: "center" }}>Configured Fees</th>
                        <th className="px-6 py-3.5 text-center w-1/5" style={{ textAlign: "center" }}>Collected Amount</th>
                        <th className="px-6 py-3.5 text-center w-1/5" style={{ textAlign: "center" }}>Outstanding Balances</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedClassWise.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-450 font-bold" style={{ textAlign: "center" }}>
                            No class fee summaries generated yet.
                          </td>
                        </tr>
                      ) : (
                        paginatedClassWise.map((row) => (
                          <tr key={row.class_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-200 text-center" style={{ textAlign: "center" }}>
                              {row.class_name}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-350 text-center" style={{ textAlign: "center" }}>
                              {row.student_count}
                            </td>
                            <td className="px-6 py-4 font-sans font-bold text-slate-900 dark:text-white text-center" style={{ textAlign: "center" }}>
                              {money(row.total_fees)}
                            </td>
                            <td className="px-6 py-4 font-sans font-bold text-emerald-600 text-center" style={{ textAlign: "center" }}>
                              {money(row.total_paid)}
                            </td>
                            <td className="px-6 py-4 font-sans font-bold text-rose-500 text-center" style={{ textAlign: "center" }}>
                              {money(row.balance_amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Strip */}
                {totalFeesPages > 1 && (
                  <div className="p-4 border-t border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="text-[12px] text-slate-500 font-semibold">
                      Showing {Math.min((feesPage - 1) * PAGE_SIZE + 1, studentDuesAggregates.classWiseList.length)} to {Math.min(feesPage * PAGE_SIZE, studentDuesAggregates.classWiseList.length)} of {studentDuesAggregates.classWiseList.length} entries
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setFeesPage(p => Math.max(p - 1, 1))}
                        disabled={feesPage === 1}
                        className="px-3 py-1.5 bg-white border border-border text-[12px] rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-semibold cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalFeesPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setFeesPage(p)}
                          className={`w-7 h-7 rounded-lg text-[12px] font-bold flex items-center justify-center ${feesPage === p
                            ? "bg-primary text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setFeesPage(p => Math.min(p + 1, totalFeesPages))}
                        disabled={feesPage === totalFeesPages}
                        className="px-3 py-1.5 bg-white border border-border text-[12px] rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-semibold cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Teacher Salary aggregates metrics */}
          {isLoadingSalaries ? (
            <div className="h-40 flex items-center justify-center bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-650">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Salary Disbursed</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{money(teacherSalariesAggregates.totalPaid)}</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-500">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Monthly Dues</span>
                    <div className="text-xl font-bold text-rose-500 mt-0.5">{money(teacherSalariesAggregates.pendingSalary)}</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Staff Members Count</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {(Array.isArray(teachersList) ? teachersList : []).filter(t => t?.is_active).length} Teachers
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary Payment History table */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
                <div className="p-4 border-b border-border font-bold text-slate-800 dark:text-slate-100">
                  Salary Disbursement Transaction Logs
                </div>
                <div className="overflow-x-auto">
                  <table className="erp-table text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-border text-slate-500 font-bold">
                        <th className="px-6 py-3.5 text-left">Teacher Name</th>
                        <th className="px-6 py-3.5 text-center" style={{ textAlign: "center" }}>Employee ID</th>
                        <th className="px-6 py-3.5 text-center" style={{ textAlign: "center" }}>Period range</th>
                        <th className="px-6 py-3.5 text-center" style={{ textAlign: "center" }}>Payment Date</th>
                        <th className="px-6 py-3.5 text-center" style={{ textAlign: "center" }}>Method</th>
                        <th className="px-6 py-3.5 text-right" style={{ textAlign: "right" }}>Disbursed Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedHistoryLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-450 font-bold" style={{ textAlign: "center" }}>
                            No salary payments disbursed in this range.
                          </td>
                        </tr>
                      ) : (
                        paginatedHistoryLogs.map((row) => (
                          <tr key={row._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.teacher_id?.name || "N/A"}</td>
                            <td className="px-6 py-4 font-sans font-bold text-slate-700 dark:text-slate-350 text-center" style={{ textAlign: "center" }}>{row.teacher_id?.employee_id || "N/A"}</td>
                            <td className="px-6 py-4 text-center" style={{ textAlign: "center" }}>{row.salary_period}</td>
                            <td className="px-6 py-4 font-semibold text-center" style={{ textAlign: "center" }}>
                              {row.payment_date && !isNaN(new Date(row.payment_date).getTime()) ? new Date(row.payment_date).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="px-6 py-4 text-center" style={{ textAlign: "center" }}>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                                {row.payment_method || "Bank Transfer"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-sans font-bold text-emerald-600" style={{ textAlign: "right" }}>{money(row.final_salary || row.amount_paid || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Strip */}
                {totalSalaryPages > 1 && (
                  <div className="p-4 border-t border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="text-[12px] text-slate-500 font-semibold">
                      Showing {Math.min((salaryPage - 1) * PAGE_SIZE + 1, teacherSalariesAggregates.historyLogs.length)} to {Math.min(salaryPage * PAGE_SIZE, teacherSalariesAggregates.historyLogs.length)} of {teacherSalariesAggregates.historyLogs.length} entries
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSalaryPage(p => Math.max(p - 1, 1))}
                        disabled={salaryPage === 1}
                        className="px-3 py-1.5 bg-white border border-border text-[12px] rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-semibold cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalSalaryPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setSalaryPage(p)}
                          className={`w-7 h-7 rounded-lg text-[12px] font-bold flex items-center justify-center ${salaryPage === p
                            ? "bg-primary text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200"
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setSalaryPage(p => Math.min(p + 1, totalSalaryPages))}
                        disabled={salaryPage === totalSalaryPages}
                        className="px-3 py-1.5 bg-white border border-border text-[12px] rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-semibold cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
