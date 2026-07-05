"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "../../components/ui/modal";
import { useClasses } from "@/app/hooks/useClasses";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import {
  DollarSign,
  Plus,
  CreditCard,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  X,
  History,
  Printer,
  Edit2,
  Trash2,
  ListCollapse,
  Eye,
  SlidersHorizontal
} from "lucide-react";
import Link from "next/link";
import { CollectFeesModal } from "../../components/modals/CollectFeesModal";

interface StudentFeeRow {
  _id: string;
  name: string;
  admission_no: string;
  class_name: string;
  class_id: string;
  totalFees: number;
  totalPaid: number;
  balanceAmount: number;
  lastPaidAmount: number;
  lastPaymentDate: string | null;
  status: "Paid" | "Partial" | "Pending";
}

interface FeeTypeItem {
  name: string;
  amount: number;
  is_enabled: boolean;
}

const DEFAULT_FEE_TYPES = [
  { name: "Academic Fees", amount: 0, is_enabled: true },
  { name: "Tuition Fees", amount: 0, is_enabled: true },
  { name: "Transport Fees", amount: 0, is_enabled: true },
  { name: "Admission Fees", amount: 0, is_enabled: true },
  { name: "Exam Fees", amount: 0, is_enabled: true },
  { name: "Library Fees", amount: 0, is_enabled: true },
  { name: "Computer Fees", amount: 0, is_enabled: true },
  { name: "Other Fees", amount: 0, is_enabled: true }
];

export default function FeesPage() {
  const { classes, isLoading: isClassesLoading } = useClasses();
  const { academicYear } = useAppState();

  const [students, setStudents] = useState<StudentFeeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters and search states
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Setup Fee Structures Modal states
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupClassId, setSetupClassId] = useState("");
  const [feeTypes, setFeeTypes] = useState<FeeTypeItem[]>([]);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [newFeeTypeName, setNewFeeTypeName] = useState("");
  const [newFeeTypeAmount, setNewFeeTypeAmount] = useState("");

  // Individual Student Fee Assignment Modal states
  const [isCustomSetupOpen, setIsCustomSetupOpen] = useState(false);
  const [customSetupStudent, setCustomSetupStudent] = useState<StudentFeeRow | null>(null);
  const [customFeeTypes, setCustomFeeTypes] = useState<FeeTypeItem[]>([]);
  const [isSavingCustomSetup, setIsSavingCustomSetup] = useState(false);
  const [newCustomFeeTypeName, setNewCustomFeeTypeName] = useState("");
  const [newCustomFeeTypeAmount, setNewCustomFeeTypeAmount] = useState("");

  // Pay Fee side modal states
  const [payStudent, setPayStudent] = useState<StudentFeeRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Cheque" | "Bank Transfer" | "Online">("Cash");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Printable Receipt Modal
  const [printedReceipt, setPrintedReceipt] = useState<any | null>(null);

  // Student Payment History Modal
  const [historyStudent, setHistoryStudent] = useState<StudentFeeRow | null>(null);
  const [studentHistoryLogs, setStudentHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load students & totals
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search,
        class_id: classFilter,
        status: statusFilter
      });
      const res = await fetch(`/api/fees?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data.students);
        setTotalItems(data.data.pagination.totalItems);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (e) {
      console.error("Error loading student fees", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, classFilter, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Load configuration when selected class changes in Fee Setup
  useEffect(() => {
    if (!isSetupOpen || !setupClassId) return;

    const loadClassFees = async () => {
      try {
        const res = await fetch(`/api/fees?class_id=${setupClassId}&academic_year=${academicYear || "2026"}`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        // Since api/fees returns students in standard GET, let's fetch class configurations directly
        const configRes = await fetch(`/api/classes/${setupClassId}`, { headers: getAuthHeaders() });
        // Let's create an endpoint or config loader. We can also fetch the ClassFee structures from a simple query:
        // Wait, does the API return ClassFee inside api/fees? The POST accepts class fee configuration.
        // Let's retrieve the structure of a specific class. Let's make a call to a ClassFee query
        const structRes = await fetch(`/api/fees?class_id=${setupClassId}`, { headers: getAuthHeaders() });
        // Wait! We can just fetch all setup fees or create a helper query.
        // Actually, let's just make a fetch call directly to load the class fees config from DB!
        // Where can we query the configured ClassFee?
        // Let's see: we can query the backend with a parameter `type=config` or make a custom fetch.
        // Let's make GET /api/fees with a query parameter `config_only=true` or just fetch the class configurations!
        // In our route GET, we had:
        // `const classFeesList = await ClassFee.find({ school_id: schoolId }).lean();`
        // We can create a dedicated endpoint /api/fees/config/route.ts or simply return it in GET when config=true!
        // Wait! Let's check how we wrote GET in app/api/fees/route.ts:
        // It fetches computed list. Let's add a check inside it or fetch the config from `/api/fees?class_id=XYZ` if we want, or fetch `/api/classes/XYZ`.
        // Let's make a GET request to `/api/fees` and if a query param `config_only=true` is set, return the ClassFee object!
        // Wait! Let's modify app/api/fees/route.ts to support `config_only=true`!
        // That is extremely simple. Let's do that or query it. Let's write a fetch and if we get nothing, default to DEFAULT_FEE_TYPES.
        const cRes = await fetch(`/api/fees?config_only=true&class_id=${setupClassId}&academic_year=${academicYear || "2026"}`, {
          headers: getAuthHeaders()
        });
        const cData = await cRes.json();
        if (cData.success && cData.data?.fee_types) {
          setFeeTypes(cData.data.fee_types);
        } else {
          setFeeTypes(DEFAULT_FEE_TYPES.map(ft => ({ ...ft })));
        }
      } catch (e) {
        console.error(e);
        setFeeTypes(DEFAULT_FEE_TYPES.map(ft => ({ ...ft })));
      }
    };
    loadClassFees();
  }, [setupClassId, isSetupOpen, academicYear]);

  // Load custom fee structure when student is selected for Custom Fee Assignment
  useEffect(() => {
    if (!isCustomSetupOpen || !customSetupStudent) return;

    const loadCustomStudentFees = async () => {
      try {
        const studentId = customSetupStudent._id;
        const classId = customSetupStudent.class_id;
        const res = await fetch(
          `/api/fees?config_only=true&student_id=${studentId}&class_id=${classId}&academic_year=${academicYear || "2026"}`,
          { headers: getAuthHeaders() }
        );
        const data = await res.json();
        if (data.success && data.data?.fee_types) {
          setCustomFeeTypes(data.data.fee_types);
        } else {
          setCustomFeeTypes(DEFAULT_FEE_TYPES.map(ft => ({ ...ft })));
        }
      } catch (e) {
        console.error(e);
        setCustomFeeTypes(DEFAULT_FEE_TYPES.map(ft => ({ ...ft })));
      }
    };
    loadCustomStudentFees();
  }, [customSetupStudent, isCustomSetupOpen, academicYear]);

  const handleToggleCustomFeeType = (index: number) => {
    setCustomFeeTypes((prev) =>
      prev.map((ft, idx) => (idx === index ? { ...ft, is_enabled: !ft.is_enabled } : ft))
    );
  };

  const handleUpdateCustomFeeTypeAmount = (index: number, amt: number) => {
    setCustomFeeTypes((prev) =>
      prev.map((ft, idx) => (idx === index ? { ...ft, amount: amt } : ft))
    );
  };

  const handleRemoveCustomFeeType = (index: number) => {
    setCustomFeeTypes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCustomFeeTypeItem = () => {
    if (!newCustomFeeTypeName.trim()) return;
    const newItem: FeeTypeItem = {
      name: newCustomFeeTypeName.trim(),
      amount: Number(newCustomFeeTypeAmount || 0),
      is_enabled: true,
    };
    setCustomFeeTypes((prev) => [...prev, newItem]);
    setNewCustomFeeTypeName("");
    setNewCustomFeeTypeAmount("");
  };

  const handleSaveCustomSetup = async () => {
    if (!customSetupStudent) return;
    setIsSavingCustomSetup(true);
    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          student_id: customSetupStudent._id,
          fee_types: customFeeTypes,
          academic_year: academicYear || "2026",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCustomSetupOpen(false);
        setCustomSetupStudent(null);
        fetchStudents();
      } else {
        alert(data.message || "Failed to update custom fee structure");
      }
    } catch (e) {
      console.error(e);
      alert("Network connection failure");
    } finally {
      setIsSavingCustomSetup(false);
    }
  };

  const totalCustomConfiguredFees = customFeeTypes
    .filter((ft) => ft.is_enabled)
    .reduce((sum, ft) => sum + Number(ft.amount || 0), 0);

  // Load history logs for selected student
  const fetchHistoryLogs = async (studentId: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/fees/payments?student_id=${studentId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setStudentHistoryLogs(data.data.payments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenHistory = (student: StudentFeeRow) => {
    setHistoryStudent(student);
    setStudentHistoryLogs([]);
    fetchHistoryLogs(student._id);
  };

  const handleOpenPay = (student: StudentFeeRow) => {
    setPayStudent(student);
    setPayAmount(student.balanceAmount.toString());
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Cash");
    setPaymentRemarks("");
  };

  const handleAddCustomFeeType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeTypeName.trim() || !newFeeTypeAmount) return;
    const item: FeeTypeItem = {
      name: newFeeTypeName.trim(),
      amount: Number(newFeeTypeAmount),
      is_enabled: true
    };
    setFeeTypes([...feeTypes, item]);
    setNewFeeTypeName("");
    setNewFeeTypeAmount("");
  };

  const handleRemoveFeeType = (index: number) => {
    const list = [...feeTypes];
    list.splice(index, 1);
    setFeeTypes(list);
  };

  const handleToggleFeeType = (index: number) => {
    const list = [...feeTypes];
    list[index].is_enabled = !list[index].is_enabled;
    setFeeTypes(list);
  };

  const handleUpdateFeeTypeAmount = (index: number, val: number) => {
    const list = [...feeTypes];
    list[index].amount = Math.max(0, val);
    setFeeTypes(list);
  };

  const handleSaveSetup = async () => {
    if (!setupClassId) return;
    setIsSavingSetup(true);
    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          class_id: setupClassId,
          fee_types: feeTypes,
          academic_year: academicYear || "2026"
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsSetupOpen(false);
        fetchStudents();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payStudent || !payAmount || Number(payAmount) <= 0) return;
    setIsRecordingPayment(true);
    try {
      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          student_id: payStudent._id,
          amount_paid: Number(payAmount),
          payment_method: paymentMethod,
          payment_date: paymentDate,
          remarks: paymentRemarks
        })
      });
      const data = await res.json();
      if (data.success) {
        setPayStudent(null);
        fetchStudents();
        // Immediately show printable receipt
        setPrintedReceipt(data.data.payment);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecordingPayment(false);
    }
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

  // Setup total fees configuration sum
  const totalConfiguredFees = feeTypes.filter(f => f.is_enabled).reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Desk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="page-title">Billing Ledger Desk</h1>
          <p className="page-desc mt-1">
            Track student fee payments, invoice balances, and record collections.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setSetupClassId(classes[0]?._id || "");
              setIsSetupOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-slate-700 bg-white border border-border dark:bg-slate-900 dark:text-slate-350 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Class Fee Setup</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 text-left shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, admission no..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <div className="relative w-full sm:w-44">
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
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

          {/* Status Filter */}
          <div className="relative w-full sm:w-44">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
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
      </div>

      {/* STUDENT FEES LIST TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-850/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="px-6 py-4">Student Info</th>
                <th className="px-6 py-4">Admission No</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4 text-right">Total Fees</th>
                <th className="px-6 py-4 text-right">Total Paid</th>
                <th className="px-6 py-4 text-right">Balance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-slate-500 mt-3 font-bold">Loading student billing ledgers...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-450 font-bold">
                    No student dues records found matching these criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">{student.name}</span>
                        {student.lastPaymentDate && (
                          <span className="text-[10px] text-slate-450 mt-0.5">
                            Last Paid: {money(student.lastPaidAmount)} ({fmtDate(student.lastPaymentDate)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {student.admission_no}
                    </td>
                    <td className="px-6 py-4 text-slate-655 font-bold">
                      {student.class_name}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {money(student.totalFees)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                      {money(student.totalPaid)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-rose-500">
                      {money(student.balanceAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        student.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : student.status === "Partial"
                          ? "bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-500/10 dark:text-amber-400"
                          : "bg-rose-50 text-rose-700 border border-rose-250 dark:bg-rose-500/10 dark:text-rose-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          student.status === "Paid" ? "bg-emerald-500" : student.status === "Partial" ? "bg-amber-500" : "bg-rose-500"
                        }`} />
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPay(student)}
                          disabled={student.totalFees === 0 || student.balanceAmount === 0}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay
                        </button>
                        <button
                          onClick={() => handleOpenHistory(student)}
                          className="p-1.5 border border-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                          title="Payment History Logs"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCustomSetupStudent(student);
                            setIsCustomSetupOpen(true);
                          }}
                          className="p-1.5 border border-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 rounded-lg transition-all cursor-pointer flex items-center"
                          title="Assign Custom Fees Override"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/fees/${student._id}`}
                          className="p-1.5 border border-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 rounded-lg transition-all cursor-pointer flex items-center"
                          title="Dedicated Payment Page"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Total Records: {totalItems}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-border rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-3 py-1">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-border rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CLASS FEE SETUP */}
      {isSetupOpen && (
        <Modal isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} title="Configure Class Fees Structure">
          <div className="space-y-5 text-left">
            {/* Class Metadata card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-border rounded-xl grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">Class Selection</label>
                <div className="relative">
                  <select
                    value={setupClassId}
                    onChange={(e) => setSetupClassId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer focus:border-primary/50 transition-colors"
                  >
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name} - {cls.section}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">Academic Session</label>
                <input
                  type="text"
                  value={academicYear || "2026"}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-border text-slate-500 text-xs font-bold rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Fee Types List Editor */}
            <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Configure Fee Amounts</h3>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setFeeTypes(feeTypes.map(f => ({ ...f, is_enabled: true })))}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Enable All
                  </button>
                  <span className="text-[10px] text-slate-300">|</span>
                  <button 
                    type="button" 
                    onClick={() => setFeeTypes(feeTypes.map(f => ({ ...f, is_enabled: false })))}
                    className="text-[10px] font-bold text-slate-450 hover:underline cursor-pointer"
                  >
                    Disable All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {feeTypes.map((ft, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-950/40 border border-border/80 p-2.5 rounded-xl hover:border-border transition-colors">
                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() => handleToggleFeeType(index)}
                      className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors focus:outline-none shrink-0 ${
                        ft.is_enabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white dark:bg-slate-900 rounded-full absolute top-0.5 shadow-sm transition-transform ${
                        ft.is_enabled ? "left-[18px]" : "left-0.5"
                      }`} />
                    </button>

                    <span className={`text-xs font-bold flex-1 ${ft.is_enabled ? "text-slate-850 dark:text-white" : "text-slate-400 line-through"}`}>
                      {ft.name}
                    </span>
                    <input
                      type="number"
                      value={ft.amount}
                      disabled={!ft.is_enabled}
                      onChange={(e) => handleUpdateFeeTypeAmount(index, Number(e.target.value))}
                      className="w-24 px-2.5 py-1 border border-border bg-white dark:bg-slate-900 font-mono font-bold text-xs rounded-lg outline-none text-right focus:border-primary/50"
                    />
                    {/* Delete Custom Fee item if not a default key item */}
                    {index >= DEFAULT_FEE_TYPES.length && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFeeType(index)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Type Field Form */}
              <div className="pt-3 border-t border-border flex gap-2">
                <input
                  type="text"
                  placeholder="Custom Fee Name (e.g. Activity Fee)"
                  value={newFeeTypeName}
                  onChange={(e) => setNewFeeTypeName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none focus:border-primary/30"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newFeeTypeAmount}
                  onChange={(e) => setNewFeeTypeAmount(e.target.value)}
                  className="w-20 px-2 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none font-mono focus:border-primary/30"
                />
                <button
                  type="button"
                  onClick={handleAddCustomFeeType}
                  className="px-3 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Total display summary card (premium gradient design) */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Class Fees Invoice</span>
                <p className="text-[11px] text-slate-350 mt-0.5">Calculated based on active enabled fee types</p>
              </div>
              <span className="text-xl font-mono font-bold text-emerald-400">{money(totalConfiguredFees)}</span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsSetupOpen(false)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSetup}
                disabled={isSavingSetup || !setupClassId}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
              >
                {isSavingSetup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Setup Structure
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: INDIVIDUAL CUSTOM STUDENT FEE SETUP */}
      {isCustomSetupOpen && customSetupStudent && (
        <Modal 
          isOpen={isCustomSetupOpen} 
          onClose={() => { setIsCustomSetupOpen(false); setCustomSetupStudent(null); }} 
          title="Configure Individual Student Fees Structure"
        >
          <div className="space-y-5 text-left">
            {/* Student context preview card */}
            <div className="p-4 bg-slate-905 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-extrabold leading-tight">{customSetupStudent.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold tracking-wide mt-0.5">
                  Class: {customSetupStudent.class_name} • Admission No: {customSetupStudent.admission_no}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Current Dues</span>
                <p className="text-[13px] font-mono font-bold text-emerald-400 mt-0.5">{money(customSetupStudent.totalFees)}</p>
              </div>
            </div>

            {/* Custom Fee Types Checklist Editor */}
            <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Configure Individual Fee Overrides</h3>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setCustomFeeTypes(customFeeTypes.map(f => ({ ...f, is_enabled: true })))}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Enable All
                  </button>
                  <span className="text-[10px] text-slate-300">|</span>
                  <button 
                    type="button" 
                    onClick={() => setCustomFeeTypes(customFeeTypes.map(f => ({ ...f, is_enabled: false })))}
                    className="text-[10px] font-bold text-slate-450 hover:underline cursor-pointer"
                  >
                    Disable All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {customFeeTypes.map((ft, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-950/40 border border-border/80 p-2.5 rounded-xl hover:border-border transition-colors">
                    {/* Toggle button switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleCustomFeeType(index)}
                      className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors focus:outline-none shrink-0 ${
                        ft.is_enabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white dark:bg-slate-900 rounded-full absolute top-0.5 shadow-sm transition-transform ${
                        ft.is_enabled ? "left-[18px]" : "left-0.5"
                      }`} />
                    </button>

                    <span className={`text-xs font-bold flex-1 ${ft.is_enabled ? "text-slate-850 dark:text-white" : "text-slate-400 line-through"}`}>
                      {ft.name}
                    </span>
                    <input
                      type="number"
                      value={ft.amount}
                      disabled={!ft.is_enabled}
                      onChange={(e) => handleUpdateCustomFeeTypeAmount(index, Number(e.target.value))}
                      className="w-24 px-2.5 py-1 border border-border bg-white dark:bg-slate-900 font-mono font-bold text-xs rounded-lg outline-none text-right focus:border-primary/50"
                    />
                    {/* Delete Custom Fee item if not a default key item */}
                    {index >= DEFAULT_FEE_TYPES.length && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomFeeType(index)}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Type Field Form */}
              <div className="pt-3 border-t border-border flex gap-2">
                <input
                  type="text"
                  placeholder="Custom Fee Name (e.g. Lab Fee)"
                  value={newCustomFeeTypeName}
                  onChange={(e) => setNewCustomFeeTypeName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none focus:border-primary/30"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newCustomFeeTypeAmount}
                  onChange={(e) => setNewCustomFeeTypeAmount(e.target.value)}
                  className="w-20 px-2 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none font-mono focus:border-primary/30"
                />
                <button
                  type="button"
                  onClick={handleAddCustomFeeTypeItem}
                  className="px-3 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Total display summary card (premium gradient design) */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Custom Student Fees</span>
                <p className="text-[11px] text-slate-350 mt-0.5">Overrides default class-wise setup for this student</p>
              </div>
              <span className="text-xl font-mono font-bold text-emerald-400">{money(totalCustomConfiguredFees)}</span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => { setIsCustomSetupOpen(false); setCustomSetupStudent(null); }}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white hover:bg-slate-50 text-slate-750 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomSetup}
                disabled={isSavingCustomSetup}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
              >
                {isSavingCustomSetup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Student Overrides
              </button>
            </div>
          </div>
        </Modal>
      )}
            {/* MODAL: RECORD STUDENT PAYMENT */}
      <CollectFeesModal
        isOpen={!!payStudent}
        onClose={() => {
          setPayStudent(null);
          fetchStudents();
        }}
        student={payStudent}
      />

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

              {/* Fee Breakdown list */}
              {printedReceipt.fee_breakdown && printedReceipt.fee_breakdown.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-5 font-sans">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <th className="px-4 py-2">Fee Type Item</th>
                        <th className="px-4 py-2 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {printedReceipt.fee_breakdown.map((ft: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-semibold text-slate-700">{ft.name}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{money(ft.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Transaction amounts summary card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 font-sans space-y-2 mb-8 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-450 font-bold">Total Fees Invoice:</span>
                  <span className="font-mono font-bold text-slate-900">{money(printedReceipt.totalFees || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-800">
                  <span>Amount Paid Now ({printedReceipt.payment_method}):</span>
                  <span className="font-mono text-emerald-600">{money(printedReceipt.amount_paid || printedReceipt.total_amount)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 font-bold text-slate-900 text-xs">
                  <span>Outstanding Balance Due:</span>
                  <span className="font-mono text-rose-500">{money(printedReceipt.balanceAmount || 0)}</span>
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

      {/* MODAL: STUDENT HISTORY LOGS QUICKVIEW */}
      {historyStudent && (
        <Modal isOpen={!!historyStudent} onClose={() => setHistoryStudent(null)} title={`Payment Ledger - ${historyStudent.name}`}>
          <div className="space-y-4 text-left">
            {isLoadingHistory ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : studentHistoryLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-450 font-bold text-xs">
                No past transactions recorded for this student.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-border text-slate-500 font-bold">
                      <th className="px-4 py-3">Receipt No</th>
                      <th className="px-4 py-3">Payment Date</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {studentHistoryLogs.map((log: any) => (
                      <tr key={log._id}>
                        <td className="px-4 py-3 font-mono font-bold text-primary">{log.receipt_no}</td>
                        <td className="px-4 py-3 font-semibold">{fmtDate(log.payment_date)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                            {log.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{money(log.total_amount)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              // We can simulate breakdown from the class config or just print simple totals
                              setPrintedReceipt({
                                ...log,
                                student_id: {
                                  name: historyStudent.name,
                                  admission_no: historyStudent.admission_no,
                                  class_id: {
                                    name: historyStudent.class_name.split(" - ")[0],
                                    section: historyStudent.class_name.split(" - ")[1] || ""
                                  }
                                }
                              });
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end border-t border-border pt-3.5">
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close Logs
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
