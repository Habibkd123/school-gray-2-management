"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "../../components/ui/modal";
import { useClasses } from "@/app/hooks/useClasses";
import { useTeachers } from "@/app/hooks/useTeachers";
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
  Trash2,
  Eye,
  SlidersHorizontal,
  Download,
  Users,
  Building2,
  TrendingUp,
  Activity,
  Layers
} from "lucide-react";
import { PrintButton } from "@/app/components/ui/PrintButton";
import Link from "next/link";
import { CollectFeesModal } from "../../components/modals/CollectFeesModal";

interface StudentFeeRow {
  _id: string;
  name: string;
  admission_no: string;
  class_name: string;
  class_id: string;
  section: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  fee_structure: string[];
  totalFees: number;
  totalPaid: number;
  balanceAmount: number;
  lastPaidAmount: number;
  lastPaymentDate: string | null;
  status: "Paid" | "Partial" | "Pending";
  dueStatus: "No Due" | "Overdue" | "Due";
  academic_year: string;
}

interface FeeTypeItem {
  name: string;
  amount: number;
  frequency?: "One Time" | "Monthly" | "Quarterly" | "Half Yearly" | "Yearly";
  is_mandatory?: boolean;
  is_enabled: boolean;
}

const DEFAULT_FEE_TYPES: FeeTypeItem[] = [
  { name: "Academic Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
  { name: "Tuition Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true },
  { name: "Transport Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true },
  { name: "Admission Fees", amount: 0, frequency: "One Time", is_mandatory: true, is_enabled: true },
  { name: "Exam Fees", amount: 0, frequency: "Quarterly", is_mandatory: true, is_enabled: true },
  { name: "Library Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
  { name: "Computer Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true },
  { name: "Other Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true }
];

export default function FeesPage() {
  const { classes, isLoading: isClassesLoading } = useClasses();
  const { teachers, isLoading: isTeachersLoading } = useTeachers();
  const { academicYear } = useAppState();

  const [activeTab, setActiveTab] = useState<"ledger" | "reports">("ledger");
  const [students, setStudents] = useState<StudentFeeRow[]>([]);
  const [allStudentsForReports, setAllStudentsForReports] = useState<StudentFeeRow[]>([]);
  const [allPaymentsForReports, setAllPaymentsForReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters and search states
  const [search, setSearch] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState(academicYear || "2026");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [feeTypeFilter, setFeeTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dueStatusFilter, setDueStatusFilter] = useState("");

  // Teacher dropdown search popover states
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [teacherSearchText, setTeacherSearchText] = useState("");

  // Row selection checkbox states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Bulk Operations modals state
  const [isBulkCollectOpen, setIsBulkCollectOpen] = useState(false);
  const [bulkCollectMethod, setBulkCollectMethod] = useState<"Cash" | "Cheque" | "Bank Transfer" | "Online" | "UPI">("Cash");
  const [bulkCollectRemarks, setBulkCollectRemarks] = useState("");
  const [bulkCollectDate, setBulkCollectDate] = useState(new Date().toISOString().split("T")[0]);
  const [isProcessingBulkCollect, setIsProcessingBulkCollect] = useState(false);

  // Setup Fee Structures Modal states
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupClassId, setSetupClassId] = useState("");
  const [feeTypes, setFeeTypes] = useState<FeeTypeItem[]>([]);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [newFeeTypeName, setNewFeeTypeName] = useState("");
  const [newFeeTypeAmount, setNewFeeTypeAmount] = useState("");
  const [newFeeTypeFrequency, setNewFeeTypeFrequency] = useState<"One Time" | "Monthly" | "Quarterly" | "Half Yearly" | "Yearly">("Monthly");
  const [newFeeTypeIsMandatory, setNewFeeTypeIsMandatory] = useState(true);

  // Individual Student Fee Assignment Modal states
  const [isCustomSetupOpen, setIsCustomSetupOpen] = useState(false);
  const [customSetupStudent, setCustomSetupStudent] = useState<StudentFeeRow | null>(null);
  const [customFeeTypes, setCustomFeeTypes] = useState<FeeTypeItem[]>([]);
  const [isSavingCustomSetup, setIsSavingCustomSetup] = useState(false);
  const [newCustomFeeTypeName, setNewCustomFeeTypeName] = useState("");
  const [newCustomFeeTypeAmount, setNewCustomFeeTypeAmount] = useState("");
  const [newCustomFeeTypeFrequency, setNewCustomFeeTypeFrequency] = useState<"One Time" | "Monthly" | "Quarterly" | "Half Yearly" | "Yearly">("Monthly");
  const [newCustomFeeTypeIsMandatory, setNewCustomFeeTypeIsMandatory] = useState(true);

  // Pay Fee modal state — CollectFeesModal manages its own internal state
  const [payStudent, setPayStudent] = useState<StudentFeeRow | null>(null);

  // Student Payment History Modal
  const [historyStudent, setHistoryStudent] = useState<StudentFeeRow | null>(null);
  const [studentHistoryLogs, setStudentHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Auto-extract distinct sections from classes list
  const sectionsList = useMemo(() => {
    return Array.from(new Set(classes.map((cls) => cls.section).filter(Boolean)));
  }, [classes]);

  // Enriched fee types names for the dropdown
  const feeTypeNames = [
    "Academic Fees",
    "Tuition Fees",
    "Transport Fees",
    "Admission Fees",
    "Exam Fees",
    "Library Fees",
    "Computer Fees",
    "Other Fees"
  ];

  // Resolve selected teacher details object
  const selectedTeacherDetails = useMemo(() => {
    return teachers.find((t) => t._id === teacherFilter);
  }, [teachers, teacherFilter]);

  // Filtered teachers list inside dropdown
  const filteredTeachersForDropdown = useMemo(() => {
    return teachers.filter((t) => {
      const query = teacherSearchText.toLowerCase();
      return (
        t.name.toLowerCase().includes(query) ||
        (t.employee_id || "").toLowerCase().includes(query)
      );
    });
  }, [teachers, teacherSearchText]);

  // Load students & totals with pagination & filters
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search,
        academic_year: academicYearFilter,
        class_id: classFilter,
        section: sectionFilter,
        teacher_id: teacherFilter,
        fee_type: feeTypeFilter,
        status: statusFilter,
        due_status: dueStatusFilter
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
  }, [currentPage, search, academicYearFilter, classFilter, sectionFilter, teacherFilter, feeTypeFilter, statusFilter, dueStatusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Load all students and payments for reports tab
  const fetchReportsData = async () => {
    setIsReportsLoading(true);
    try {
      // Get all students for stats
      const studentsRes = await fetch(`/api/fees?limit=100000&academic_year=${academicYearFilter}`, {
        headers: getAuthHeaders()
      });
      const studentsData = await studentsRes.json();
      if (studentsData.success) {
        setAllStudentsForReports(studentsData.data.students);
      }

      // Get all payments for daily/monthly statistics
      const paymentsRes = await fetch("/api/fees/payments", { headers: getAuthHeaders() });
      const paymentsData = await paymentsRes.json();
      if (paymentsData.success) {
        setAllPaymentsForReports(paymentsData.data.payments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReportsData();
    }
  }, [activeTab, academicYearFilter]);

  // Load configuration when selected class changes in Fee Setup
  useEffect(() => {
    if (!isSetupOpen || !setupClassId) return;

    const loadClassFees = async () => {
      try {
        const cRes = await fetch(`/api/fees?config_only=true&class_id=${setupClassId}&academic_year=${academicYearFilter}`, {
          headers: getAuthHeaders()
        });
        const cData = await cRes.json();
        if (cData.success && cData.data?.fee_types) {
          setFeeTypes(cData.data.fee_types.map((ft: any) => ({
            ...ft,
            frequency: ft.frequency || "Monthly",
            is_mandatory: ft.is_mandatory !== false
          })));
        } else {
          setFeeTypes(DEFAULT_FEE_TYPES.map(ft => ({ ...ft })));
        }
      } catch (e) {
        console.error(e);
        setFeeTypes(DEFAULT_FEE_TYPES.map(ft => ({ ...ft })));
      }
    };
    loadClassFees();
  }, [setupClassId, isSetupOpen, academicYearFilter]);

  // Load custom fee structure when student is selected for Custom Fee Assignment
  useEffect(() => {
    if (!isCustomSetupOpen || !customSetupStudent) return;

    const loadCustomStudentFees = async () => {
      try {
        const studentId = customSetupStudent._id;
        const classId = customSetupStudent.class_id;
        const res = await fetch(
          `/api/fees?config_only=true&student_id=${studentId}&class_id=${classId}&academic_year=${academicYearFilter}`,
          { headers: getAuthHeaders() }
        );
        const data = await res.json();
        if (data.success && data.data?.fee_types) {
          setCustomFeeTypes(data.data.fee_types.map((ft: any) => ({
            ...ft,
            frequency: ft.frequency || "Monthly",
            is_mandatory: ft.is_mandatory !== false
          })));
        } else {
          setCustomFeeTypes(DEFAULT_FEE_TYPES.map(ft => ({ ...ft })));
        }
      } catch (e) {
        console.error(e);
        setCustomFeeTypes(DEFAULT_FEE_TYPES.map(ft => ({ ...ft })));
      }
    };
    loadCustomStudentFees();
  }, [customSetupStudent, isCustomSetupOpen, academicYearFilter]);

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

  const handleUpdateCustomFeeTypeFrequency = (index: number, freq: any) => {
    setCustomFeeTypes((prev) =>
      prev.map((ft, idx) => (idx === index ? { ...ft, frequency: freq } : ft))
    );
  };

  const handleToggleCustomFeeTypeMandatory = (index: number) => {
    setCustomFeeTypes((prev) =>
      prev.map((ft, idx) => (idx === index ? { ...ft, is_mandatory: !ft.is_mandatory } : ft))
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
      frequency: newCustomFeeTypeFrequency,
      is_mandatory: newCustomFeeTypeIsMandatory,
      is_enabled: true,
    };
    setCustomFeeTypes((prev) => [...prev, newItem]);
    setNewCustomFeeTypeName("");
    setNewCustomFeeTypeAmount("");
    setNewCustomFeeTypeFrequency("Monthly");
    setNewCustomFeeTypeIsMandatory(true);
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
          academic_year: academicYearFilter,
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
  };

  const handleAddCustomFeeType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeTypeName.trim() || !newFeeTypeAmount) return;
    const item: FeeTypeItem = {
      name: newFeeTypeName.trim(),
      amount: Number(newFeeTypeAmount),
      frequency: newFeeTypeFrequency,
      is_mandatory: newFeeTypeIsMandatory,
      is_enabled: true
    };
    setFeeTypes([...feeTypes, item]);
    setNewFeeTypeName("");
    setNewFeeTypeAmount("");
    setNewFeeTypeFrequency("Monthly");
    setNewFeeTypeIsMandatory(true);
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

  const handleUpdateFeeTypeFrequency = (index: number, freq: any) => {
    const list = [...feeTypes];
    list[index].frequency = freq;
    setFeeTypes(list);
  };

  const handleToggleFeeTypeMandatory = (index: number) => {
    const list = [...feeTypes];
    list[index].is_mandatory = !list[index].is_mandatory;
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
          academic_year: academicYearFilter
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

  // Row Checkbox Helpers
  const handleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s._id));
    }
  };

  // Bulk Operations Handlers
  const handleBulkCollectSubmit = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsProcessingBulkCollect(true);

    try {
      let successCount = 0;
      for (const studentId of selectedStudentIds) {
        // Find student details to calculate their current balance
        const studentInfo = students.find(s => s._id === studentId);
        if (!studentInfo || studentInfo.balanceAmount <= 0) continue;

        // Auto-resolve billing periods from today back 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        const res = await fetch("/api/fees/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            student_id: studentId,
            amount_paid: studentInfo.balanceAmount,
            payment_method: bulkCollectMethod,
            remarks: `${bulkCollectRemarks || "Bulk Collection Dues Payment"}`,
            payment_date: bulkCollectDate,
            start_date: start.toISOString().split("T")[0],
            end_date: end.toISOString().split("T")[0],
            collection_type: "Monthly",
            fee_breakdown: [{ name: "Tuition Fees", amount_paid: studentInfo.balanceAmount }]
          })
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        }
      }
      alert(`Bulk Payment successful: recorded collections for ${successCount} student(s).`);
      setIsBulkCollectOpen(false);
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Error recording bulk payment transaction.");
    } finally {
      setIsProcessingBulkCollect(false);
    }
  };

  const handleBulkPrint = () => {
    alert("Bulk printable queue generated. Preparing PDF window...");
    const printWin = window.open("", "_blank", "width=820,height=950");
    if (!printWin) {
      alert("Popup blocked! Please allow popups for this site.");
      return;
    }

    let contents = `
      <html>
        <head>
          <title>Bulk Fee Receipts</title>
          <style>
            @media print { .page-break { page-break-after: always; } }
            body { font-family: sans-serif; padding: 20px; color: #333; }
          </style>
        </head>
        <body>
          <h2 style="text-align:center">Bulk Fees Receipt Documents Bundle</h2>
    `;

    selectedStudentIds.forEach(id => {
      const s = students.find(item => item._id === id);
      if (s) {
        contents += `
          <div style="border: 2px solid #333; padding: 30px; margin: 40px 0; border-radius: 12px;" class="page-break">
            <h1 style="text-align:center; margin-bottom:5px">My School ERP Receipt</h1>
            <p style="text-align:center; font-size:11px; margin-bottom:20px">Bulk Invoice Statement Verification</p>
            <p><strong>Student Name:</strong> ${s.name}</p>
            <p><strong>Admission Number:</strong> ${s.admission_no}</p>
            <p><strong>Class Name:</strong> ${s.class_name}</p>
            <p><strong>Total Session Fees:</strong> ${money(s.totalFees)}</p>
            <p><strong>Total Paid Amount:</strong> ${money(s.totalPaid)}</p>
            <p><strong>Outstanding Balance:</strong> ${money(s.balanceAmount)}</p>
            <p><strong>Status:</strong> ${s.status}</p>
          </div>
        `;
      }
    });

    contents += `</body></html>`;
    printWin.document.write(contents);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 500);
  };

  const handleBulkExport = () => {
    // Generate CSV string
    let csv = "Student Name,Admission No,Class,Guardian Name,Guardian Phone,Total Fees,Total Paid,Balance,Status,Due Status\n";
    selectedStudentIds.forEach(id => {
      const s = students.find(item => item._id === id);
      if (s) {
        csv += `"${s.name}","${s.admission_no}","${s.class_name}","${s.guardian_name}","${s.guardian_phone}",${s.totalFees},${s.totalPaid},${s.balanceAmount},"${s.status}","${s.dueStatus}"\n`;
      }
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fees_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reports calculations
  const reportStats = useMemo(() => {
    const totalInvoiced = allStudentsForReports.reduce((sum, s) => sum + s.totalFees, 0);
    const totalPaid = allStudentsForReports.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalPending = allStudentsForReports.reduce((sum, s) => sum + s.balanceAmount, 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const dailyCollection = allPaymentsForReports
      .filter((p) => new Date(p.payment_date).toISOString().split("T")[0] === todayStr)
      .reduce((sum, p) => sum + p.amount_paid, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyCollection = allPaymentsForReports
      .filter((p) => {
        const d = new Date(p.payment_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.amount_paid, 0);

    return { totalInvoiced, totalPaid, totalPending, dailyCollection, monthlyCollection };
  }, [allStudentsForReports, allPaymentsForReports]);

  // Class-wise collections stats
  const classWiseCollections = useMemo(() => {
    const map = new Map<string, { className: string; teacherName: string; invoiced: number; paid: number; balance: number }>();

    // Seed classes
    classes.forEach(c => {
      map.set(c._id, {
        className: `${c.name} - ${c.section}`,
        teacherName: c.class_teacher_id?.name || "Unassigned",
        invoiced: 0,
        paid: 0,
        balance: 0
      });
    });

    allStudentsForReports.forEach(s => {
      const cid = s.class_id;
      if (map.has(cid)) {
        const item = map.get(cid)!;
        item.invoiced += s.totalFees;
        item.paid += s.totalPaid;
        item.balance += s.balanceAmount;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className));
  }, [classes, allStudentsForReports]);

  // Teacher-wise collections stats
  const teacherWiseCollections = useMemo(() => {
    const map = new Map<string, { teacherName: string; className: string; invoiced: number; paid: number; balance: number }>();

    classes.forEach(c => {
      if (c.class_teacher_id) {
        const tid = c.class_teacher_id._id;
        const tname = c.class_teacher_id.name;
        if (!map.has(tid)) {
          map.set(tid, {
            teacherName: tname,
            className: `${c.name} - ${c.section}`,
            invoiced: 0,
            paid: 0,
            balance: 0
          });
        }
      }
    });

    allStudentsForReports.forEach(s => {
      const cid = s.class_id;
      const targetClass = classes.find(c => c._id === cid);
      if (targetClass && targetClass.class_teacher_id) {
        const tid = targetClass.class_teacher_id._id;
        const item = map.get(tid)!;
        item.invoiced += s.totalFees;
        item.paid += s.totalPaid;
        item.balance += s.balanceAmount;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }, [classes, allStudentsForReports]);

  // Setup total fees configuration sum
  const totalConfiguredFees = feeTypes.filter(f => f.is_enabled).reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header Desk */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing Ledger Desk</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span className="hover:text-primary">Finance</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Fees</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setSetupClassId(classes[0]?._id || "");
              setIsSetupOpen(true);
            }}
            className="btn btn-outline flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Class Fee Setup</span>
          </button>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="border-b border-border flex gap-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`pb-2.5 transition-colors border-b-2 outline-none ${activeTab === "ledger" ? "border-primary text-primary" : "border-transparent hover:text-slate-800"
            }`}
        >
          Dues Ledger
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-2.5 transition-colors border-b-2 outline-none ${activeTab === "reports" ? "border-primary text-primary" : "border-transparent hover:text-slate-800"
            }`}
        >
          Finance Reports
        </button>
      </div>

      {activeTab === "ledger" && (
        <>
          {/* SEARCH AND FILTERS */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex flex-col gap-4 text-left shadow-sm">

            {/* Top row: search & academic session */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student, adm no, guardian, receipt no..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                />
              </div>

              {/* Academic Year Filter */}
              <div className="relative w-full md:w-44">
                <select
                  value={academicYearFilter}
                  onChange={(e) => {
                    setAcademicYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="2026">Session 2026</option>
                  <option value="2027">Session 2027</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Bottom Row Filters */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {/* Class Filter */}
              <div className="relative w-full">
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} - {cls.section}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Section Filter */}
              <div className="relative w-full">
                <select
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">All Sections</option>
                  {sectionsList.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Teacher Dropdown Custom filter select */}
              <div className="relative w-full col-span-2 md:col-span-2">
                <div
                  onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer flex items-center justify-between outline-none"
                >
                  {selectedTeacherDetails ? (
                    <span className="truncate">{selectedTeacherDetails.name} ({selectedTeacherDetails.employee_id || "No ID"})</span>
                  ) : (
                    <span className="text-slate-400 font-bold">Filter By Teacher</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>

                {isTeacherDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsTeacherDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-border rounded-xl shadow-2xl z-50 p-2.5 max-h-[250px] flex flex-col gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search Teacher name/ID..."
                          value={teacherSearchText}
                          onChange={(e) => setTeacherSearchText(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs outline-none bg-slate-50 dark:bg-slate-900 text-foreground font-bold"
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 divide-y divide-border pr-1 max-h-[160px] text-xs">
                        <div
                          onClick={() => {
                            setTeacherFilter("");
                            setIsTeacherDropdownOpen(false);
                            setTeacherSearchText("");
                            setCurrentPage(1);
                          }}
                          className={`p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-slate-500`}
                        >
                          Clear Teacher Filter
                        </div>
                        {filteredTeachersForDropdown.length === 0 ? (
                          <p className="text-slate-400 text-center py-4 font-bold">No active teachers found.</p>
                        ) : (
                          filteredTeachersForDropdown.map((t) => (
                            <div
                              key={t._id}
                              onClick={() => {
                                setTeacherFilter(t._id);
                                setIsTeacherDropdownOpen(false);
                                setTeacherSearchText("");
                                setCurrentPage(1);
                              }}
                              className={`p-2 rounded-lg cursor-pointer transition-colors flex justify-between items-center ${teacherFilter === t._id ? "bg-primary/10 text-primary" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                                }`}
                            >
                              <div className="text-left">
                                <p className="font-extrabold text-slate-800 dark:text-slate-200">{t.name}</p>
                                <p className="text-[10px] text-slate-450 mt-0.5">{t.employee_id || "No ID"} • {t.department || "No Dept"}</p>
                              </div>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${t.is_active ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                                {t.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Fee Type Filter */}
              <div className="relative w-full">
                <select
                  value={feeTypeFilter}
                  onChange={(e) => {
                    setFeeTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">All Fee Types</option>
                  {feeTypeNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative w-full">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Due Status Filter */}
              <div className="relative w-full">
                <select
                  value={dueStatusFilter}
                  onChange={(e) => {
                    setDueStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">All Dues Status</option>
                  <option value="Overdue">Overdue Dues</option>
                  <option value="Due">Due Dues</option>
                  <option value="No Due">No Dues Outstanding</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
          </div>

          {/* STUDENT FEES LIST TABLE */}
          <div className="erp-table-wrap text-left relative">
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="w-10 col-center">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && selectedStudentIds.length === students.length}
                        onChange={handleSelectAllStudents}
                        className="w-4 h-4 accent-primary cursor-pointer rounded"
                      />
                    </th>
                    <th>Student</th>
                    <th>Admission</th>
                    <th>Class</th>
                    {/* <th className="px-6 py-4">Guardian Details</th> */}
                    <th>Fee Structure</th>
                    <th className="col-right">Total Fees</th>
                    <th className="col-right">Amount Paid</th>
                    <th className="col-right">Balance</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="col-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="table-empty">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                        <p className="text-slate-500 mt-3 font-bold">Loading student billing ledgers...</p>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="table-empty">
                        No student dues records found matching these criteria.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const isSelected = selectedStudentIds.includes(student._id);
                      return (
                        <tr key={student._id} className={isSelected ? "bg-primary/5 dark:bg-primary/10" : ""}>
                          <td className="col-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectStudent(student._id)}
                              className="w-4 h-4 accent-primary cursor-pointer rounded"
                            />
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white">{student.name}</span>
                              {student.lastPaymentDate && (
                                <span className="text-[10px] text-slate-455 mt-0.5">
                                  Last Paid: {money(student.lastPaidAmount)} ({fmtDate(student.lastPaymentDate)})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="font-mono font-bold text-slate-700 dark:text-slate-350">
                            {student.admission_no}
                          </td>
                          <td className="text-slate-655 font-bold">
                            {student.class_name}
                          </td>
                          {/* <td className="px-6 py-4 text-slate-500">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-300">{student.guardian_name} ({student.guardian_relation})</span>
                              <span className="text-[10px] text-slate-455 mt-0.5">{student.guardian_phone}</span>
                            </div>
                          </td> */}
                          <td className="max-w-[200px] truncate">
                            <div className="flex flex-wrap gap-1">
                              {student.fee_structure.slice(0, 3).map((item, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded font-bold text-slate-600 dark:text-slate-300">
                                  {item.split(" (")[0]}
                                </span>
                              ))}
                              {student.fee_structure.length > 3 && (
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded font-bold text-slate-455">
                                  +{student.fee_structure.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="col-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {money(student.totalFees)}
                          </td>
                          <td className="col-right font-mono font-bold text-emerald-600">
                            {money(student.totalPaid)}
                          </td>
                          <td className="col-right font-mono font-bold text-rose-500">
                            {money(student.balanceAmount)}
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${student.dueStatus === "No Due"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : student.dueStatus === "Overdue"
                                ? "bg-rose-50 text-rose-700 border border-rose-250 dark:bg-rose-950/20"
                                : "bg-amber-50 text-amber-700 border border-amber-250"
                              }`}>
                              {student.dueStatus}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${student.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-255 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : student.status === "Partial"
                                ? "bg-amber-50 text-amber-700 border border-amber-255 dark:bg-amber-500/10 dark:text-amber-400"
                                : "bg-rose-50 text-rose-700 border border-rose-255 dark:bg-rose-500/10 dark:text-rose-400"
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${student.status === "Paid" ? "bg-emerald-500" : student.status === "Partial" ? "bg-amber-500" : "bg-rose-500"
                                }`} />
                              {student.status}
                            </span>
                          </td>
                          <td className="col-right">
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div></div>

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

          {/* FLOATING BULK ACTIONS BAR (PART 9) */}
          {selectedStudentIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 z-50 animate-bounce-short font-sans text-xs">
              <div>
                <span className="font-black text-emerald-400">{selectedStudentIds.length}</span> students selected
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsBulkCollectOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Bulk Collect
                </button>
                <button
                  onClick={handleBulkPrint}
                  className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Bulk Print Receipts
                </button>
                <button
                  onClick={handleBulkExport}
                  className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button
                  onClick={() => setSelectedStudentIds([])}
                  className="px-3 py-2 border border-slate-700 hover:border-slate-655 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "reports" && (
        <div className="space-y-6">
          {isReportsLoading ? (
            <div className="h-60 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-bold">Compiling collection statistics...</span>
            </div>
          ) : (
            <>
              {/* Reports Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-left">
                <div className="bg-white border border-border p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Activity className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Today Collection</span>
                    <strong className="text-lg font-mono text-slate-800 mt-0.5 block">{money(reportStats.dailyCollection)}</strong>
                  </div>
                </div>

                <div className="bg-white border border-border p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 bg-violet-50 text-violet-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Month Collection</span>
                    <strong className="text-lg font-mono text-slate-800 mt-0.5 block">{money(reportStats.monthlyCollection)}</strong>
                  </div>
                </div>

                <div className="bg-white border border-border p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Total Received</span>
                    <strong className="text-lg font-mono text-emerald-600 mt-0.5 block">{money(reportStats.totalPaid)}</strong>
                  </div>
                </div>

                <div className="bg-white border border-border p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><XCircle className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Total Outstanding</span>
                    <strong className="text-lg font-mono text-rose-550 mt-0.5 block">{money(reportStats.totalPending)}</strong>
                  </div>
                </div>

                <div className="bg-white border border-border p-4 rounded-xl flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Building2 className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Total Invoiced</span>
                    <strong className="text-lg font-mono text-indigo-600 mt-0.5 block">{money(reportStats.totalInvoiced)}</strong>
                  </div>
                </div>
              </div>

              {/* Class-wise Collections Table */}
              <div className="erp-table-wrap text-left">
                <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">Class-wise Collections Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Class Name</th>
                        <th>Class Teacher</th>
                        <th className="col-right">Invoiced Amount</th>
                        <th className="col-right">Paid Amount</th>
                        <th className="col-right">Outstanding Dues</th>
                        <th className="col-center">Collection %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classWiseCollections.map((c, idx) => {
                        const pct = c.invoiced > 0 ? ((c.paid / c.invoiced) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={idx}>
                            <td className="font-bold text-slate-800 dark:text-slate-100">{c.className}</td>
                            <td className="font-semibold text-slate-655">{c.teacherName}</td>
                            <td className="col-right font-mono font-bold text-slate-700 dark:text-slate-300">{money(c.invoiced)}</td>
                            <td className="col-right font-mono font-bold text-emerald-600">{money(c.paid)}</td>
                            <td className="col-right font-mono font-bold text-rose-500">{money(c.balance)}</td>
                            <td className="col-center">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-black text-blue-700">
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Teacher-wise Collections Table */}
              <div className="erp-table-wrap text-left">
                <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">Teacher-wise Collections Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Teacher Name</th>
                        <th>Assigned Class</th>
                        <th className="col-right">Total Invoiced</th>
                        <th className="col-right">Total Paid</th>
                        <th className="col-right">Outstanding Dues</th>
                        <th className="col-center">Collection %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherWiseCollections.map((t, idx) => {
                        const pct = t.invoiced > 0 ? ((t.paid / t.invoiced) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={idx}>
                            <td className="font-bold text-slate-800 dark:text-slate-100">{t.teacherName}</td>
                            <td className="font-semibold text-slate-655">{t.className}</td>
                            <td className="col-right font-mono font-bold text-slate-700 dark:text-slate-300">{money(t.invoiced)}</td>
                            <td className="col-right font-mono font-bold text-emerald-650">{money(t.paid)}</td>
                            <td className="col-right font-mono font-bold text-rose-500">{money(t.balance)}</td>
                            <td className="col-center">
                              <span className="px-2 py-0.5 rounded bg-violet-50 text-[10px] font-black text-violet-700">
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL: BULK RECORD PAYMENT COLLECTION */}
      {isBulkCollectOpen && (
        <Modal isOpen={isBulkCollectOpen} onClose={() => setIsBulkCollectOpen(false)} title="Record Bulk Payments Collection">
          <div className="space-y-4 text-left text-xs font-sans">
            <div className="p-3 bg-amber-50 border border-amber-250 text-amber-700 rounded-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <span>You are recording full outstanding dues collection for {selectedStudentIds.length} student(s).</span>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="font-bold text-slate-500">Collection Date</label>
              <input
                type="date"
                value={bulkCollectDate}
                onChange={(e) => setBulkCollectDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="font-bold text-slate-500">Payment Method</label>
              <select
                value={bulkCollectMethod}
                onChange={(e) => setBulkCollectMethod(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white outline-none cursor-pointer"
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="font-bold text-slate-500">Remarks / Reference</label>
              <textarea
                value={bulkCollectRemarks}
                onChange={(e) => setBulkCollectRemarks(e.target.value)}
                placeholder="Remarks for this bulk transaction log..."
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white outline-none min-h-[60px]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsBulkCollectOpen(false)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkCollectSubmit}
                disabled={isProcessingBulkCollect}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
              >
                {isProcessingBulkCollect && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Collection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: CLASS FEE SETUP */}
      {isSetupOpen && (
        <Modal size="lg" isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} title="Configure Class Fees Structure">
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
                  value={academicYearFilter}
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

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {feeTypes.map((ft, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-950/40 border border-border/80 p-2.5 rounded-xl hover:border-border transition-colors">
                    {/* Toggle button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleFeeType(index)}
                        className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors focus:outline-none ${ft.is_enabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                          }`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white dark:bg-slate-900 rounded-full absolute top-0.5 shadow-sm transition-transform ${ft.is_enabled ? "left-[18px]" : "left-0.5"
                          }`} />
                      </button>
                      <span className={`text-xs font-bold w-32 truncate ${ft.is_enabled ? "text-slate-850 dark:text-white" : "text-slate-400 line-through"}`} title={ft.name}>
                        {ft.name}
                      </span>
                    </div>

                    {/* Amount Input */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                      <span className="text-[10px] text-slate-500 font-bold">Amount:</span>
                      <input
                        type="number"
                        value={ft.amount}
                        disabled={!ft.is_enabled}
                        onChange={(e) => handleUpdateFeeTypeAmount(index, Number(e.target.value))}
                        className="w-full px-2 py-1 border border-border bg-white dark:bg-slate-900 font-mono font-bold text-xs rounded-lg outline-none text-right focus:border-primary/50"
                      />
                    </div>

                    {/* Frequency Dropdown */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-500 font-bold">Freq:</span>
                      <select
                        value={ft.frequency || "Monthly"}
                        disabled={!ft.is_enabled}
                        onChange={(e) => handleUpdateFeeTypeFrequency(index, e.target.value as any)}
                        className="px-2 py-1 border border-border bg-white dark:bg-slate-900 font-bold text-xs rounded-lg outline-none cursor-pointer focus:border-primary/50"
                      >
                        <option value="One Time">One Time</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half Yearly">Half Yearly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>

                    {/* Mandatory Switch */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-500 font-bold">Mandatory:</span>
                      <input
                        type="checkbox"
                        checked={ft.is_mandatory !== false}
                        disabled={!ft.is_enabled}
                        onChange={() => handleToggleFeeTypeMandatory(index)}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer"
                      />
                    </div>

                    {/* Delete Custom Fee item if not a default key item */}
                    {index >= DEFAULT_FEE_TYPES.length && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFeeType(index)}
                        className="p-1 text-rose-500 hover:bg-rose-550/10 rounded transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Type Field Form */}
              <div className="pt-3 border-t border-border flex flex-wrap gap-2.5 items-center">
                <input
                  type="text"
                  placeholder="Custom Fee Name (e.g. Activity Fee)"
                  value={newFeeTypeName}
                  onChange={(e) => setNewFeeTypeName(e.target.value)}
                  className="flex-1 min-w-[150px] px-3 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none focus:border-primary/30"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newFeeTypeAmount}
                  onChange={(e) => setNewFeeTypeAmount(e.target.value)}
                  className="w-20 px-2 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none font-mono focus:border-primary/30"
                />
                <select
                  value={newFeeTypeFrequency}
                  onChange={(e) => setNewFeeTypeFrequency(e.target.value as any)}
                  className="px-2 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none cursor-pointer"
                >
                  <option value="One Time">One Time</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half Yearly">Half Yearly</option>
                  <option value="Yearly">Yearly</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-655 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFeeTypeIsMandatory}
                    onChange={(e) => setNewFeeTypeIsMandatory(e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary"
                  />
                  <span>Mandatory</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddCustomFeeType}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
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
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
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
                    className="text-[10px] font-bold text-slate-455 hover:underline cursor-pointer"
                  >
                    Disable All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {customFeeTypes.map((ft, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-950/40 border border-border/80 p-2.5 rounded-xl hover:border-border transition-colors">
                    {/* Toggle button switch */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCustomFeeType(index)}
                        className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors focus:outline-none ${ft.is_enabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                          }`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white dark:bg-slate-900 rounded-full absolute top-0.5 shadow-sm transition-transform ${ft.is_enabled ? "left-[18px]" : "left-0.5"
                          }`} />
                      </button>
                      <span className={`text-xs font-bold w-32 truncate ${ft.is_enabled ? "text-slate-850 dark:text-white" : "text-slate-400 line-through"}`} title={ft.name}>
                        {ft.name}
                      </span>
                    </div>

                    {/* Amount Input */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                      <span className="text-[10px] text-slate-500 font-bold">Amount:</span>
                      <input
                        type="number"
                        value={ft.amount}
                        disabled={!ft.is_enabled}
                        onChange={(e) => handleUpdateCustomFeeTypeAmount(index, Number(e.target.value))}
                        className="w-full px-2 py-1 border border-border bg-white dark:bg-slate-900 font-mono font-bold text-xs rounded-lg outline-none text-right focus:border-primary/50"
                      />
                    </div>

                    {/* Frequency Dropdown */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-500 font-bold">Freq:</span>
                      <select
                        value={ft.frequency || "Monthly"}
                        disabled={!ft.is_enabled}
                        onChange={(e) => handleUpdateCustomFeeTypeFrequency(index, e.target.value as any)}
                        className="px-2 py-1 border border-border bg-white dark:bg-slate-900 font-bold text-xs rounded-lg outline-none cursor-pointer focus:border-primary/50"
                      >
                        <option value="One Time">One Time</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half Yearly">Half Yearly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>

                    {/* Mandatory Switch */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-500 font-bold">Mandatory:</span>
                      <input
                        type="checkbox"
                        checked={ft.is_mandatory !== false}
                        disabled={!ft.is_enabled}
                        onChange={() => handleToggleCustomFeeTypeMandatory(index)}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer"
                      />
                    </div>

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
              <div className="pt-3 border-t border-border flex flex-wrap gap-2.5 items-center">
                <input
                  type="text"
                  placeholder="Custom Fee Name (e.g. Lab Fee)"
                  value={newCustomFeeTypeName}
                  onChange={(e) => setNewCustomFeeTypeName(e.target.value)}
                  className="flex-1 min-w-[150px] px-3 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none focus:border-primary/30"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newCustomFeeTypeAmount}
                  onChange={(e) => setNewCustomFeeTypeAmount(e.target.value)}
                  className="w-20 px-2 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none font-mono focus:border-primary/30"
                />
                <select
                  value={newCustomFeeTypeFrequency}
                  onChange={(e) => setNewCustomFeeTypeFrequency(e.target.value as any)}
                  className="px-2 py-1.5 border border-border bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-lg outline-none cursor-pointer"
                >
                  <option value="One Time">One Time</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half Yearly">Half Yearly</option>
                  <option value="Yearly">Yearly</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-655 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCustomFeeTypeIsMandatory}
                    onChange={(e) => setNewCustomFeeTypeIsMandatory(e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary"
                  />
                  <span>Mandatory</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddCustomFeeTypeItem}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
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
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white hover:bg-slate-50 text-slate-755 transition-colors"
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

      {/* MODAL: STUDENT HISTORY LOGS QUICKVIEW */}
      {historyStudent && (
        <Modal isOpen={!!historyStudent} onClose={() => setHistoryStudent(null)} title={`Payment Ledger - ${historyStudent.name}`}>
          <div className="space-y-4 text-left">
            {isLoadingHistory ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : studentHistoryLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-455 font-bold text-xs">
                No past transactions recorded for this student.
              </div>
            ) : (
              <div className="erp-table-wrap overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Receipt No</th>
                      <th>Payment Date</th>
                      <th>Method</th>
                      <th className="col-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistoryLogs.map((log: any) => (
                      <tr key={log._id}>
                        <td className="font-mono font-bold text-primary">{log.receipt_number || log.receipt_no}</td>
                        <td className="font-semibold">{fmtDate(log.payment_date)}</td>
                        <td>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                            {log.payment_method}
                          </span>
                        </td>
                        <td className="col-right font-mono font-bold text-emerald-600">{money(log.amount_paid || log.total_amount)}</td>
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
