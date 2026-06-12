"use client";

import React, { useState } from "react";
import { useStudents, ApiStudent } from "../../hooks/useStudents";
import { useClasses } from "../../hooks/useClasses";
import { useAppState } from "../../context/store";
import { Modal } from "../../components/ui/modal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollectFeesModal } from "../../components/modals/CollectFeesModal";
import { LoginDetailsModal } from "../../components/modals/LoginDetailsModal";
import { ResetPasswordModal } from "../../components/modals/ResetPasswordModal";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
import { Loader2, AlertCircle, Lock } from "lucide-react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  GraduationCap,
  Calendar,
  CheckCircle,
  XCircle,
  FileText,
  RefreshCcw,
  Printer,
  Download,
  LayoutGrid,
  List,
  MessageSquare,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown
} from "lucide-react";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { PaginationBar } from "@/app/components/ui/pagination-bar";

export default function StudentsPage() {
  const { academicYear } = useAppState();
  const { students, total, isLoading, error, createStudent, updateStudent: updateStudentApi, deleteStudent: deleteStudentApi, fetchStudents } = useStudents({ skip: true });
  const { classes } = useClasses();

  const router = useRouter();
  const activeRole = "admin";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedStudent, setSelectedStudent] = useState<ApiStudent | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCollectFeesOpen, setIsCollectFeesOpen] = useState(false);
  const [isLoginDetailsOpen, setIsLoginDetailsOpen] = useState(false);
  const [loginModalTarget, setLoginModalTarget] = useState<"student" | "parent">("student");
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [resetPassTarget, setResetPassTarget] = useState<{ userId: string | undefined; name: string; email: string } | null>(null);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "academics" | "billing">("profile");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("All Time");
  const [selectedSort, setSelectedSort] = useState("Ascending");

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Debounce search input to limit API calls
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load paginated data when dependencies change
  React.useEffect(() => {
    fetchStudents({
      search: debouncedSearch,
      classId: classFilter,
      gender: genderFilter,
      status: statusFilter,
      dateRange: selectedDateRange,
      sort: selectedSort,
      page,
      limit: 10,
      academic_year: academicYear,
    });
  }, [fetchStudents, debouncedSearch, classFilter, genderFilter, statusFilter, selectedDateRange, selectedSort, page, academicYear]);

  const handleClassFilterChange = (val: string) => {
    setClassFilter(val);
    setPage(1);
  };
  const handleGenderFilterChange = (val: string) => {
    setGenderFilter(val);
    setPage(1);
  };
  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };
  const handleDateRangeChange = (val: string) => {
    setSelectedDateRange(val);
    setPage(1);
  };
  const handleSortChange = (val: string) => {
    setSelectedSort(val);
    setPage(1);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? tableData.filter(s => selectedIds.includes(s.id))
      : tableData;

    if (dataToExport.length === 0) {
      alert("No student records available to export.");
      return;
    }

    // Convert to CSV format
    const headers = ["Admission No", "Roll No", "Name", "Class", "Section", "Gender", "Status", "Date of Join", "DOB"];
    const rows = dataToExport.map(s => [
      s.displayId,
      s.roll_no || "",
      s.name,
      s.classNameStr,
      s.section,
      s.gender,
      s.status,
      s.joinDateStr,
      s.dobStr
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState("c1");
  const [rollNo, setRollNo] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentContact, setParentContact] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  const openEdit = (student: ApiStudent) => {
    setSelectedStudent(student);
    setName(student.name);
    setEmail(student.email || "");
    setClassId(typeof student?.class_id === "object" ? student?.class_id?._id : student?.class_id);
    setRollNo(student.roll_no || "");
    setParentName(student.guardian_name || "");
    setParentContact(student.guardian_phone || "");
    setFormError("");
    setIsEditOpen(true);
  };

  const openView = (student: ApiStudent) => {
    setSelectedStudent(student);
    setActiveTab("profile");
    setIsViewOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSaving(true);
    const result = await createStudent({
      name,
      email,
      class_id: classId,
      roll_no: rollNo || undefined,
      guardian_name: parentName || undefined,
      guardian_phone: parentContact || undefined,
    });
    setIsSaving(false);
    if (result.success) {
      setName(""); setRollNo(""); setParentName(""); setParentContact("");
      setIsAddOpen(false);
    } else {
      setFormError(result.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setFormError("");
    setIsSaving(true);
    const result = await updateStudentApi(selectedStudent._id, {
      name,
      email,
      class_id: classId,
      roll_no: rollNo || undefined,
      guardian_name: parentName || undefined,
      guardian_phone: parentContact || undefined,
    });
    setIsSaving(false);
    if (result.success) {
      setIsEditOpen(false);
    } else {
      setFormError(result.message);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteStudentApi(id);
  };

  const getClassName = (student: ApiStudent) => {
    if (typeof student?.class_id === "object") {
      return `${student.class_id?.name} ${student.class_id?.section}`;
    }
    return classes.find((c) => c._id === student.class_id)?.name || "Unknown";
  };

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const getSection = (id: string) => id.includes("1") ? "A" : id.includes("2") ? "B" : "C";
  const getGender = (name: string) => name.toLowerCase().match(/^[a-m]/) ? "Female" : "Male";
  const getAvatar = (name: string) => name.toLowerCase().match(/^[a-m]/) ? "/asset 12.webp" : "/asset 14.webp";
  const formatDate = (dateString: string) => {
    if (!dateString) return "10 Jan 2015";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  const getDob = (id: string) => id.includes("1") ? "10 Jan 2015" : id.includes("2") ? "19 Aug 2014" : "05 Dec 2017";

  const tableData = React.useMemo(() => {
    return students.map((student) => ({
      ...student,
      id: student._id,
      displayId: student.admission_no || `AD${student._id?.slice(-6).toUpperCase()}`,
      avatar: student.photo_url || getAvatar(student.name),
      classNameStr: getClassName(student),
      section: typeof student.class_id === "object" ? student.class_id?.section : "A",
      gender: student.gender || getGender(student.name),
      joinDateStr: formatDate(student.admission_date || student.createdAt || ""),
      dobStr: student.dob ? formatDate(student.dob) : "N/A",
      status: student.is_active ? "Active" : "Inactive",
    }));
  }, [students]);

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns: ColumnDef<typeof tableData[0]>[] = [
    { header: "Admission No", accessorKey: "displayId", render: (s) => <span className="font-semibold text-[#F59E0B]">{s.displayId}</span> },
    { header: "Roll No", accessorKey: "roll_no" },
    {
      header: "Name", accessorKey: "name", render: (s) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/students/${s.id}`)}>
          <img src={s.avatar} className="w-8 h-8 rounded-full object-cover" alt="Avatar" />
          <span className="font-semibold text-slate-900 dark:text-white group-hover:text-[#F59E0B] transition-colors">{s.name}</span>
        </div>
      )
    },
    { header: "Class", accessorKey: "classNameStr" },
    { header: "Section", accessorKey: "section" },
    { header: "Gender", accessorKey: "gender" },
    {
      header: "Status", accessorKey: "status", render: (s) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold ${s.status === "Active" ? "bg-[#E8F8E8] text-[#1D7F2C]" : "bg-[#FFEBF0] text-[#FF4A6B]"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.status === "Active" ? "bg-[#1DD04A]" : "bg-[#FF4A6B]"}`} />
          {s.status}
        </span>
      )
    },
    { header: "Date of Join", accessorKey: "joinDateStr" },
    { header: "DOB", accessorKey: "dobStr" },
    {
      header: "Action", sortable: false, render: (s) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedStudent(s as ApiStudent); setIsCollectFeesOpen(true); }}
            className="px-3 py-1.5 rounded bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors"
          >
            Collect Fees
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdown(activeDropdown === s._id ? null : s._id);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-[#F59E0B] text-white hover:bg-[#D97706]`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {activeDropdown === s._id && (
              <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-border py-2 z-50">
                <button onClick={() => { router.push(`/students/${s.id}`); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" /> View Student
                </button>
                <button onClick={() => { router.push(`/students/add?edit=${s.id}`); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                  <Edit className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Edit
                </button>
                <button onClick={() => { setSelectedStudent(s as ApiStudent); setLoginModalTarget("student"); setIsLoginDetailsOpen(true); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Login Details
                </button>
                <button onClick={() => {
                  const studentUser = s.user_id;
                  const sUid = studentUser && typeof studentUser === "object" ? studentUser._id : undefined;
                  const sEmail = studentUser && typeof studentUser === "object" ? studentUser.email : s.email || "";
                  setResetPassTarget({ userId: sUid, name: s.name, email: sEmail });
                  setIsResetPassModalOpen(true);
                  setActiveDropdown(null);
                }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Reset Password
                </button>
                <button onClick={() => { setSelectedStudent(s as ApiStudent); setIsDisableOpen(true); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                  <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Disable
                </button>
                <button onClick={() => { router.push(`/students/student-promotion?studentId=${s._id}`); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Promote Student
                </button>
                <button onClick={() => { setSelectedStudent(s as ApiStudent); setIsDeleteOpen(true); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50 flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-rose-400" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-[14px] font-medium">Loading students...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-rose-500" />
          </div>
          <p className="text-[14px] font-semibold text-slate-700">{error}</p>
          <button onClick={() => fetchStudents()} className="px-4 py-2 text-[13px] font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] rounded-lg transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6" onClick={() => setActiveDropdown(null)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Students List</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Students</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">All Students</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          {activeRole === "admin" && (
            <Link
              href="/students/add"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">

        {/* Filters Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Students List</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-[13px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="whitespace-nowrap">{selectedDateRange}</span>
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["All Time", "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year"].map((item) => (
                      <button onClick={() => { handleDateRangeChange(item); setIsDateRangeOpen(false); }} key={item} className={`w-full px-4 py-2 text-[13px] text-left transition-colors ${item === selectedDateRange ? "bg-[#F59E0B] text-white font-semibold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <div
                className={`flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-[13px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 cursor-pointer transition-colors ${isFilterOpen ? "bg-slate-100 dark:bg-slate-800 border-slate-300" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="whitespace-nowrap">Filter</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </div>

              {/* Filter Dropdown Popover */}
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-11 w-full sm:w-[380px] bg-white dark:bg-slate-900 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border z-50 overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Filter</h3>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 text-left col-span-2">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Class</label>
                        <select
                          value={classFilter}
                          onChange={(e) => handleClassFilterChange(e.target.value)}
                          className="w-full px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 border border-border rounded-lg outline-none cursor-pointer bg-white dark:bg-slate-900"
                        >
                          <option value="all">All Classes</option>
                          {classes.map((c) => (
                            <option key={c._id} value={c._id}>{c.name} - {c.section}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Gender</label>
                        <select
                          value={genderFilter}
                          onChange={(e) => handleGenderFilterChange(e.target.value)}
                          className="w-full px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 border border-border rounded-lg outline-none cursor-pointer bg-white dark:bg-slate-900"
                        >
                          <option value="all">All Genders</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => handleStatusFilterChange(e.target.value)}
                          className="w-full px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 border border-border rounded-lg outline-none cursor-pointer bg-white dark:bg-slate-900"
                        >
                          <option value="all">All Statuses</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                      <button
                        onClick={() => {
                          setClassFilter("all");
                          setGenderFilter("all");
                          setStatusFilter("all");
                          setPage(1);
                          setIsFilterOpen(false);
                        }}
                        className="px-5 py-2 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Reset
                      </button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] transition-colors shadow-sm">
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sort Popover */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-[13px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="whitespace-nowrap">Sort by A-Z</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Ascending", "Descending", "Recently Added"].map((item) => (
                      <button onClick={() => { handleSortChange(item); setIsSortOpen(false); }} key={item} className={`w-full px-4 py-2.5 text-[14px] text-left transition-colors font-medium cursor-pointer ${item === selectedSort ? "bg-[#F59E0B] text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center border border-border rounded-lg bg-white dark:bg-slate-900 p-1">
              <button onClick={() => setViewMode("grid")} className={`p-1 rounded ${viewMode === 'grid' ? 'bg-[#F59E0B] text-white' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode("list")} className={`p-1 rounded ${viewMode === 'list' ? 'bg-[#F59E0B] text-white' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><List className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Search & Pagination Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[13px] text-slate-500 dark:text-slate-400">
          <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
            Showing{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}` : "0"}
            </span>{" "}of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {total}
            </span>{" "}students
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search Name/Roll/Admission No"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[250px] pl-3 pr-4 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all"
            />
          </div>
        </div>

        {viewMode === "list" ? (
          <>
            <DataTable
              columns={columns}
              data={tableData}
              selectionHeader={
                <input
                  type="checkbox"
                  checked={tableData.length > 0 && tableData.every(s => selectedIds.includes(s.id))}
                  onChange={() => {
                    const allChecked = tableData.length > 0 && tableData.every(s => selectedIds.includes(s.id));
                    if (allChecked) {
                      setSelectedIds(prev => prev.filter(id => !tableData.some(s => s.id === id)));
                    } else {
                      setSelectedIds(prev => {
                        const toAdd = tableData.filter(s => !prev.includes(s.id)).map(s => s.id);
                        return [...prev, ...toAdd];
                      });
                    }
                  }}
                  className="rounded border-slate-300 w-4 h-4 accent-[#F59E0B]"
                />
              }
              renderSelection={(student) => (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={() => {
                    setSelectedIds(prev =>
                      prev.includes(student.id)
                        ? prev.filter(id => id !== student.id)
                        : [...prev, student.id]
                    );
                  }}
                  className="rounded border-slate-300 w-4 h-4 accent-[#F59E0B]"
                />
              )}
              noDataMessage="No students registered or matching filters."
            />
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        ) : (
          <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20 min-h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {students.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500">
                  No students registered or matching filters.
                </div>
              ) : (
                students.map((student) => (
                  <div key={student._id} className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm p-5 relative group flex flex-col hover:border-[#F59E0B]/50 transition-colors">
                    {/* Top Row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(student._id)}
                          onChange={() => {
                            setSelectedIds(prev =>
                              prev.includes(student._id)
                                ? prev.filter(id => id !== student._id)
                                : [...prev, student._id]
                            );
                          }}
                          className="rounded border-slate-300 w-3.5 h-3.5 accent-[#F59E0B]"
                        />
                        <span className="text-[13px] font-bold text-[#F59E0B]">{student.admission_no || `AD${student._id.slice(-6).toUpperCase()}`}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${student.is_active ? "bg-[#E8F8E8] text-[#1D7F2C] dark:bg-[#1D7F2C]/20 dark:text-[#1DD04A]" : "bg-[#FFEBF0] text-[#FF4A6B] dark:bg-[#FF4A6B]/20"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${student.is_active ? "bg-[#1DD04A]" : "bg-[#FF4A6B]"}`} /> {student.is_active ? "Active" : "Inactive"}
                        </span>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === student._id ? null : student._id); }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {activeDropdown === student._id && (
                            <div className="absolute right-0 top-6 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-border py-2 z-50">
                              <button onClick={() => { router.push(`/students/${student._id}`); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                                <FileText className="w-4 h-4 text-slate-400" /> View Student
                              </button>
                              <button onClick={() => { router.push(`/students/add?edit=${student._id}`); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                                <Edit className="w-4 h-4 text-slate-400" /> Edit
                              </button>
                              <button onClick={() => { setSelectedStudent(student); setLoginModalTarget("student"); setIsLoginDetailsOpen(true); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                                <User className="w-4 h-4 text-slate-400" /> Login Details
                              </button>
                              <button onClick={() => {
                                const studentUser = student.user_id;
                                const sUid = studentUser && typeof studentUser === "object" ? studentUser._id : undefined;
                                const sEmail = studentUser && typeof studentUser === "object" ? studentUser.email : student.email || "";
                                setResetPassTarget({ userId: sUid, name: student.name, email: sEmail });
                                setIsResetPassModalOpen(true);
                                setActiveDropdown(null);
                              }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                                <Lock className="w-4 h-4 text-slate-400" /> Reset Password
                              </button>
                              <button onClick={() => { setSelectedStudent(student); setIsDisableOpen(true); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                                <XCircle className="w-4 h-4 text-slate-400" /> Disable
                              </button>
                              <button onClick={() => { router.push(`/students/student-promotion?studentId=${student._id}`); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                                <GraduationCap className="w-4 h-4 text-slate-400" /> Promote Student
                              </button>
                              <button onClick={() => { setSelectedStudent(student); setIsDeleteOpen(true); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3">
                                <Trash2 className="w-4 h-4 text-rose-400" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Profile info */}
                    <div className="flex items-center gap-4 mb-5 cursor-pointer" onClick={() => router.push(`/students/${student._id}`)}>
                      <img src={student.photo_url || getAvatar(student.name)} alt="Avatar" className="w-12 h-12 rounded-full object-cover shadow-sm border border-border" />
                      <div>
                        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white group-hover:text-[#F59E0B] transition-colors">{student.name}</h3>
                        <p className="text-[12px] font-medium text-slate-500">{getClassName(student)}</p>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5 border-t border-b border-slate-100 dark:border-slate-700/50 py-4">
                      <div>
                        <p className="text-[11px] text-slate-500 mb-1">Roll No</p>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">{student.roll_no || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 mb-1">Gender</p>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">{student.gender || getGender(student.name)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 mb-1">Joined On</p>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">{formatDate(student.admission_date || student.createdAt || "")}</p>
                      </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-wrap items-center gap-2">
                        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><MessageSquare className="w-3.5 h-3.5" /></button>
                        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><Phone className="w-3.5 h-3.5" /></button>
                        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><Mail className="w-3.5 h-3.5" /></button>
                      </div>
                      <button onClick={() => { setSelectedStudent(student); setIsCollectFeesOpen(true); }} className="px-3 py-1.5 rounded bg-[#F1F5F9] dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        Add Fees
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              className="mt-4 border-t-0"
            />
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
          REGISTER MODAL
          ---------------------------------------------------- */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register Student">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Full Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex@gmail.com"
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Assign Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} - {c.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Roll Number</label>
              <input
                required
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 05"
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="w-full h-px bg-border my-2" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Parent/Guardian Name</label>
              <input
                required
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Robert Watson"
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Parent Contact Info</label>
              <input
                required
                type="text"
                value={parentContact}
                onChange={(e) => setParentContact(e.target.value)}
                placeholder="e.g. +1 (555) 123-4567"
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer"
            >
              Register Student
            </button>
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------
          EDIT MODAL
          ---------------------------------------------------- */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modify Student Info">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Full Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Assign Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} - {c.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Roll Number</label>
              <input
                required
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Parent/Guardian Name</label>
              <input
                required
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Parent Contact Info</label>
              <input
                required
                type="text"
                value={parentContact}
                onChange={(e) => setParentContact(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Enrollment Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
              className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm cursor-pointer"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------
          STUDENT DETAIL TAB VIEW MODAL
          ---------------------------------------------------- */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={selectedStudent ? `${selectedStudent.name}'s Profile` : "Student Profile"}
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Header Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-3 text-[13px] font-bold border-b-2 -mb-px transition-all cursor-pointer ${activeTab === "profile"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                  }`}
              >
                Profile Details
              </button>
              <button
                onClick={() => setActiveTab("academics")}
                className={`px-4 py-3 text-[13px] font-bold border-b-2 -mb-px transition-all cursor-pointer ${activeTab === "academics"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                  }`}
              >
                Academics & Grades
              </button>
              <button
                onClick={() => setActiveTab("billing")}
                className={`px-4 py-3 text-[13px] font-bold border-b-2 -mb-px transition-all cursor-pointer ${activeTab === "billing"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                  }`}
              >
                Invoices & Billing
              </button>
            </div>

            {/* TAB: PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Class Cohort</p>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-0.5">
                          {getClassName(selectedStudent)} (Roll #{selectedStudent.roll_no || "N/A"})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-0.5">
                          {selectedStudent.guardian_email || selectedStudent.phone || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Enrollment Date</p>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-0.5">
                          {formatDate(selectedStudent.admission_date || selectedStudent.createdAt || "")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Parent/Guardian</p>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-0.5">
                          {selectedStudent.guardian_name || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Emergency Contact</p>
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-0.5">
                          {selectedStudent.guardian_phone || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ACADEMICS */}
            {activeTab === "academics" && (
              <div className="space-y-4 text-left">
                <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white">Report Card (Recent Term Results)</h4>
                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                        <th className="px-5 py-3.5">Subject</th>
                        <th className="px-5 py-3.5">Exam Term</th>
                        <th className="px-5 py-3.5">Score Achieved</th>
                        <th className="px-5 py-3.5">Grade Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white dark:bg-slate-900">
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                          No grade records posted for this student.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: BILLING */}
            {activeTab === "billing" && (
              <div className="space-y-4 text-left">
                <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white">Financial Invoices</h4>
                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                        <th className="px-5 py-3.5">Invoice Description</th>
                        <th className="px-5 py-3.5">Due Date</th>
                        <th className="px-5 py-3.5">Amount Due</th>
                        <th className="px-5 py-3.5">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white dark:bg-slate-900">
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                          No billing invoice data exists.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}



            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      <CollectFeesModal
        isOpen={isCollectFeesOpen}
        onClose={() => setIsCollectFeesOpen(false)}
        student={selectedStudent as unknown as Parameters<typeof CollectFeesModal>[0]['student']}
      />

      <LoginDetailsModal
        isOpen={isLoginDetailsOpen}
        onClose={() => setIsLoginDetailsOpen(false)}
        student={selectedStudent}
        target={loginModalTarget}
      />

      <ResetPasswordModal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        userId={resetPassTarget?.userId}
        userName={resetPassTarget?.name || ""}
        userEmail={resetPassTarget?.email || ""}
      />

      <ConfirmModal
        isOpen={isDisableOpen}
        onClose={() => setIsDisableOpen(false)}
        title="Disable Student"
        message={`Are you sure you want to disable ${selectedStudent?.name}? They will no longer be able to log in.`}
        confirmText="Disable Student"
        onConfirm={async () => {
          if (selectedStudent) {
            await updateStudentApi(selectedStudent._id, { is_active: false });
            setIsDisableOpen(false);
          }
        }}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Student"
        message={`Are you sure you want to remove ${selectedStudent?.name}? They will be deactivated.`}
        confirmText="Delete"
        onConfirm={async () => {
          if (selectedStudent) {
            await deleteStudentApi(selectedStudent._id);
            setIsDeleteOpen(false);
          }
        }}
      />
    </div>
  );
}
