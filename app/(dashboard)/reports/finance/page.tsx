"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReportTabs from "../ReportTabs";
import { useClasses } from "@/app/hooks/useClasses";
import { getAuthHeaders } from "@/lib/utils/session";
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

export default function FinanceReportPage() {
  const { classes, isLoading: isClassesLoading } = useClasses();

  // Active Tab: student_fees / teacher_salary
  const [activeTab, setActiveTab] = useState<"student_fees" | "teacher_salary">("student_fees");

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Student Dues raw & aggregated stats
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  // Teacher Salary logs
  const [salariesList, setSalariesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [isLoadingSalaries, setIsLoadingSalaries] = useState(true);

  const [isExportOpen, setIsExportOpen] = useState(false);

  // Load all student fees data (fetch large limit to compute summaries locally)
  const fetchStudentFees = useCallback(async () => {
    setIsLoadingStudents(true);
    try {
      const params = new URLSearchParams({
        limit: "10000",
        class_id: selectedClass,
        status: selectedStatus
      });
      const res = await fetch(`/api/fees?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setStudentsList(data.data.students);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClass, selectedStatus]);

  // Load salaries history & teachers list
  const fetchTeacherSalaries = useCallback(async () => {
    setIsLoadingSalaries(true);
    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.set("start_date", startDate);
        params.set("end_date", endDate);
      }
      const salRes = await fetch(`/api/salaries?${params.toString()}`, { headers: getAuthHeaders() });
      const salData = await salRes.json();
      if (salData.success) {
        setSalariesList(salData.data?.payments || salData.data || []);
      }

      // Also get teachers list to sum contract salaries for "Pending Salary"
      const teachers = await TeacherService.getAllTeachers();
      setTeachersList(teachers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSalaries(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (activeTab === "student_fees") {
      fetchStudentFees();
    } else {
      fetchTeacherSalaries();
    }
  }, [activeTab, fetchStudentFees, fetchTeacherSalaries]);

  // Student Fees aggregates (filtered locally by date if selected)
  const studentDuesAggregates = useMemo(() => {
    let list = [...studentsList];

    // Optional local date filtering on lastPaymentDate
    if (startDate || endDate) {
      list = list.filter((s) => {
        if (!s.lastPaymentDate) return false;
        const pDate = new Date(s.lastPaymentDate);
        if (startDate && pDate < new Date(startDate)) return false;
        if (endDate && pDate > new Date(endDate + "T23:59:59")) return false;
        return true;
      });
    }

    const totalFeesCollection = list.reduce((sum, s) => sum + s.totalFees, 0);
    const paidFees = list.reduce((sum, s) => sum + s.totalPaid, 0);
    const pendingFees = list.reduce((sum, s) => sum + s.balanceAmount, 0);

    // Class wise aggregates grouping
    const classSummaryMap = new Map<string, ClassWiseSummary>();
    list.forEach((s) => {
      const classIdStr = s.class_id || "unassigned";
      const classNameStr = s.class_name || "Unassigned";
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
      summary.total_fees += s.totalFees;
      summary.total_paid += s.totalPaid;
      summary.balance_amount += s.balanceAmount;
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
    // Total Salary Paid in range
    const totalPaid = salariesList.reduce((sum, p) => sum + (p.final_salary || 0), 0);

    // Total Monthly Contract salary for all active teachers
    const totalContractSalaries = teachersList
      .filter((t) => t.is_active)
      .reduce((sum, t) => sum + (t.monthly_salary || 0), 0);

    // Pending salary = Contract - Paid (clipped to 0)
    const pendingSalary = Math.max(0, totalContractSalaries - totalPaid);

    return {
      totalPaid,
      pendingSalary,
      historyLogs: salariesList
    };
  }, [salariesList, teachersList]);

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
        p.final_salary || 0,
        new Date(p.payment_date).toLocaleDateString(),
        p.payment_method,
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

  const money = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
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
          <button
            onClick={() => {
              if (activeTab === "student_fees") fetchStudentFees();
              else fetchTeacherSalaries();
            }}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => PrintService.print('printable-area', { pageSize: 'A4' })}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"
            title="Print report layout"
          >
            <Printer className="w-4 h-4" />
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
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left print:hidden shadow-sm">
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

        {activeTab === "student_fees" ? (
          <>
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
                      {cls.name} - {cls.section}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

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
          </>
        ) : (
          <div className="col-span-2 flex items-end">
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="px-4 py-2.5 border border-border bg-slate-50 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
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
                <div className="p-4 border-b border-border font-bold text-slate-800 dark:text-slate-100">
                  Class-wise Fee Collection Summary
                </div>
                <div className="overflow-x-auto">
                  <table className="erp-table text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-border text-slate-500 font-bold">
                        <th className="px-6 py-3.5">Class / Grade Name</th>
                        <th className="px-6 py-3.5 text-center">Student Count</th>
                        <th className="px-6 py-3.5 text-right">Configured Fees</th>
                        <th className="px-6 py-3.5 text-right">Collected Amount</th>
                        <th className="px-6 py-3.5 text-right">Outstanding Balances</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {studentDuesAggregates.classWiseList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-450 font-bold">
                            No class fee summaries generated yet.
                          </td>
                        </tr>
                      ) : (
                        studentDuesAggregates.classWiseList.map((row) => (
                          <tr key={row.class_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-200">{row.class_name}</td>
                            <td className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-350">{row.student_count}</td>
                            <td className="px-6 py-4 text-right font-sans font-bold text-slate-900 dark:text-white">{money(row.total_fees)}</td>
                            <td className="px-6 py-4 text-right font-sans font-bold text-emerald-600">{money(row.total_paid)}</td>
                            <td className="px-6 py-4 text-right font-sans font-bold text-rose-500">{money(row.balance_amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{teachersList.filter(t => t.is_active).length} Teachers</div>
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
                        <th className="px-6 py-3.5">Teacher Name</th>
                        <th className="px-6 py-3.5">Employee ID</th>
                        <th className="px-6 py-3.5">Period range</th>
                        <th className="px-6 py-3.5">Payment Date</th>
                        <th className="px-6 py-3.5">Method</th>
                        <th className="px-6 py-3.5 text-right">Disbursed Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {teacherSalariesAggregates.historyLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-450 font-bold">
                            No salary payments disbursed in this range.
                          </td>
                        </tr>
                      ) : (
                        teacherSalariesAggregates.historyLogs.map((row) => (
                          <tr key={row._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.teacher_id?.name || "N/A"}</td>
                            <td className="px-6 py-4 font-sans font-bold text-slate-700 dark:text-slate-350">{row.teacher_id?.employee_id || "N/A"}</td>
                            <td className="px-6 py-4">{row.salary_period}</td>
                            <td className="px-6 py-4 font-semibold">{new Date(row.payment_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                                {row.payment_method || "Bank Transfer"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-sans font-bold text-emerald-600">{money(row.final_salary || row.amount_paid || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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
