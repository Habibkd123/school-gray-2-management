"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeachers, ApiTeacher } from "../../hooks/useTeachers";
import { useAppState } from "@/app/context/store";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { Loader2, AlertCircle } from "lucide-react";
import { PaginationBar } from "@/app/components/ui/pagination-bar";
import { LoginDetailsModal } from "../../components/modals/LoginDetailsModal";
import { ResetPasswordModal } from "../../components/modals/ResetPasswordModal";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  GraduationCap,
  Calendar,
  BookOpen,
  Briefcase,
  ChevronDown,
  RefreshCcw,
  Printer,
  Download,
  Filter,
  Grid,
  List,
  ArrowDownAZ,
  MoreVertical,
  AlignLeft,
  Lock,
  ToggleRight,
  FileText,
  Upload,
  CheckSquare
} from "lucide-react";

function getAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=D2232A&color=fff&bold=true`;
}

export default function TeachersPage() {
  const router = useRouter();
  const { academicYear } = useAppState();
  const {
    teachers,
    total,
    isLoading,
    error,
    deleteTeacher: deleteTeacherApi,
    updateTeacher,
    fetchTeachers
  } = useTeachers({ skip: true });

  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  React.useEffect(() => {
    if (!isLoading && isInitialLoad) setIsInitialLoad(false);
  }, [isLoading]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [desgFilter, setDesgFilter] = useState("all");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");

  const [selectedTeacher, setSelectedTeacher] = useState<ApiTeacher | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [isLoginDetailsOpen, setIsLoginDetailsOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [resetPassTarget, setResetPassTarget] = useState<{ userId: string | undefined; name: string; email: string } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  // Popover states
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("All Time");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Ascending");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const activeRole = "admin" as "admin" | "teacher" | "student";

  // Dynamic filter options state
  const [filterOptions, setFilterOptions] = useState<{
    academicYears: string[];
    departments: string[];
    designations: string[];
    statuses: string[];
  }>({
    academicYears: [],
    departments: [],
    designations: [],
    statuses: []
  });

  // Fetch unique filter values from backend on mount
  useEffect(() => {
    fetch("/api/teachers/filters", { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setFilterOptions(res.data);
        }
      })
      .catch(err => console.error("Error loading filters:", err));
  }, []);

  // Debounce search input to limit API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load paginated data when dependencies change
  useEffect(() => {
    fetchTeachers({
      search: debouncedSearch,
      status: statusFilter,
      dateRange: selectedDateRange,
      sort: selectedSort,
      page,
      limit: 12,
      academic_year: academicYearFilter === "all" ? academicYear : academicYearFilter,
      department: deptFilter,
      designation: desgFilter,
    });
  }, [fetchTeachers, debouncedSearch, statusFilter, selectedDateRange, selectedSort, page, academicYear, deptFilter, desgFilter, academicYearFilter]);

  const handleDateRangeChange = (val: string) => {
    setSelectedDateRange(val);
    setPage(1);
  };

  const handleSortChange = (val: string) => {
    setSelectedSort(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to dismiss/delete this teacher?")) {
      const res = await deleteTeacherApi(id);
      if (!res.success) {
        alert(res.message || "Failed to delete teacher");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected teachers?`)) {
      let successCount = 0;
      let failCount = 0;
      for (const id of selectedIds) {
        const res = await deleteTeacherApi(id);
        if (res.success) successCount++;
        else failCount++;
      }
      alert(`Successfully deleted ${successCount} teachers.${failCount > 0 ? ` Failed to delete ${failCount} teachers.` : ""}`);
      setSelectedIds([]);
      setBulkSelectMode(false);
      fetchTeachers({
        search: debouncedSearch,
        status: statusFilter,
        dateRange: selectedDateRange,
        sort: selectedSort,
        page,
        limit: 12,
        academic_year: academicYearFilter === "all" ? academicYear : academicYearFilter,
        department: deptFilter,
        designation: desgFilter,
      });
    }
  };

  const handleBulkStatusChange = async (newStatus: boolean) => {
    if (confirm(`Change status of ${selectedIds.length} selected teachers to ${newStatus ? "Active" : "Inactive"}?`)) {
      let successCount = 0;
      let failCount = 0;
      for (const id of selectedIds) {
        const res = await updateTeacher(id, { is_active: newStatus });
        if (res.success) successCount++;
        else failCount++;
      }
      alert(`Successfully updated status for ${successCount} teachers.${failCount > 0 ? ` Failed for ${failCount} teachers.` : ""}`);
      setSelectedIds([]);
      setBulkSelectMode(false);
      fetchTeachers({
        search: debouncedSearch,
        status: statusFilter,
        dateRange: selectedDateRange,
        sort: selectedSort,
        page,
        limit: 12,
        academic_year: academicYearFilter === "all" ? academicYear : academicYearFilter,
        department: deptFilter,
        designation: desgFilter,
      });
    }
  };

  const getClassName = (teacher: ApiTeacher) => {
    if (teacher.class_ids && Array.isArray(teacher.class_ids) && teacher.class_ids.length > 0) {
      return teacher.class_ids
        .map((cls: any) => {
          if (typeof cls === "object" && cls) {
            return cls.section ? `${cls.name} - ${cls.section}` : cls.name;
          }
          return "Class";
        })
        .join(", ");
    }
    if (teacher.class_id && typeof teacher.class_id === "object") {
      return teacher.class_id.section 
        ? `${teacher.class_id.name} - ${teacher.class_id.section}`
        : teacher.class_id.name;
    }
    return "None / Floating";
  };

  // Prepare data for DataTable
  const tableData = useMemo(() => {
    return teachers.map((teacher) => ({
      ...teacher,
      id: teacher._id,
      displayId: teacher.employee_id || "—",
      phoneStr: teacher.phone || "—",
      joinDateStr: teacher.join_date ? new Date(teacher.join_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—",
      classNameStr: getClassName(teacher),
      subject: teacher.subject_specialization || "—",
      status: teacher.is_active ? "Active" : "Inactive"
    }));
  }, [teachers]);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? tableData.filter(t => selectedIds.includes(t.id))
      : tableData;

    if (dataToExport.length === 0) {
      alert("No faculty records available to export.");
      return;
    }

    // Convert to CSV format
    const headers = ["Employee ID", "Name", "Class", "Subject", "Email", "Phone", "Date of Join", "Status"];
    const rows = dataToExport.map(t => [
      t.displayId,
      t.name,
      t.classNameStr,
      t.subject,
      t.email || "",
      t.phoneStr,
      t.joinDateStr,
      t.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teachers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns: ColumnDef<typeof tableData[0]>[] = [
    { header: "ID", accessorKey: "displayId", render: (t) => <span className="font-semibold text-primary cursor-pointer hover:underline">{t.displayId}</span> },
    { header: "Name", accessorKey: "name", render: (t) => (
        <div className="flex flex-wrap items-center gap-3">
          <img src={t.photo_url || getAvatar(t.name)} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800" alt={t.name} loading="lazy" decoding="async" />
          <span className="font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer">{t.name}</span>
        </div>
    ) },
    { header: "Class", accessorKey: "classNameStr" },
    { header: "Subject", accessorKey: "subject" },
    { header: "Email", accessorKey: "email", render: (t) => t.email ? t.email.toLowerCase() : "—" },
    { header: "Phone", accessorKey: "phoneStr" },
    { header: "Date of Join", accessorKey: "joinDateStr" },
    { header: "Status", accessorKey: "status", render: (t) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${t.status === "Active" ? "bg-success/10 text-success" : "bg-[#FFEBEB] text-[#E02424]"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${t.status === "Active" ? "bg-success" : "bg-[#E02424]"}`} />
          {t.status}
        </span>
    ) },
    { header: "Action", sortable: false, className: "text-center relative", render: (t) => (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center">
            <button
              onClick={() => setActionMenuId(actionMenuId === t.id ? null : t.id)}
              className={`p-1.5 rounded-lg transition-colors ${actionMenuId === t.id ? "bg-primary text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          {actionMenuId === t.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
              <div className="absolute right-12 top-10 w-44 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                <button onClick={() => { router.push(`/teachers/${t.id}`); setActionMenuId(null); }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                  <AlignLeft className="w-4 h-4 text-foreground dark:text-slate-100" /> View Teacher
                </button>
                <button onClick={() => { router.push(`/teachers/${t.id}/edit`); setActionMenuId(null); }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                  <Edit className="w-4 h-4 text-foreground dark:text-slate-100" /> Edit
                </button>
                <button onClick={() => { setSelectedTeacher(t as unknown as ApiTeacher); setIsLoginDetailsOpen(true); setActionMenuId(null); }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                  <Lock className="w-4 h-4 text-foreground dark:text-slate-100" /> Login Details
                </button>
                <button onClick={() => { 
                  const teacherUser = t.user_id;
                  const tUid = teacherUser && typeof teacherUser === "object" ? teacherUser._id : undefined;
                  const tEmail = teacherUser && typeof teacherUser === "object" ? teacherUser.email : t.email || "";
                  setResetPassTarget({ userId: tUid, name: t.name, email: tEmail }); 
                  setIsResetPassModalOpen(true); 
                  setActionMenuId(null); 
                }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                  <Lock className="w-4 h-4 text-foreground dark:text-slate-100" /> Reset Password
                </button>
                <button onClick={() => { handleDelete(t.id); setActionMenuId(null); }} className="w-full px-4 py-2.5 text-[14px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 font-medium transition-colors">
                  <Trash2 className="w-4 h-4 text-rose-400" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
    )}
  ];

  if (isLoading && isInitialLoad) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading teachers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center px-4">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Failed to Load Teachers</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">{error}</p>
        <button onClick={() => fetchTeachers()} className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 -m-6 p-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Teacher List</h1>
          <div className="flex items-center gap-2 text-[14px] leading-[21px] text-[#68718a] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span>Peoples</span>
            <span>/</span>
            <span className="text-foreground dark:text-slate-100">Teacher List</span>
          </div>
        </div>

        {activeRole === "admin" && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => fetchTeachers({ academic_year: academicYearFilter === "all" ? academicYear : academicYearFilter, department: deptFilter, designation: desgFilter, status: statusFilter })} className="btn btn-outline p-2 w-9 h-9">
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button className="btn btn-outline p-2 w-9 h-9">
              <Printer className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="btn btn-outline"
              >
                <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </button>
              {isExportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                    <button onClick={() => { handleExport(); setIsExportOpen(false); }} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors">
                      <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as CSV
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => router.push('/teachers/import')}
              className="btn btn-outline"
            >
              <Upload className="w-4 h-4" />
              <span>Bulk Import</span>
            </button>
            <button
              onClick={() => router.push('/teachers/add')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Add Teacher</span>
            </button>
          </div>
        )}
      </div>

      {/* Directory Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow text-left p-5">
        {/* Top Actions in Card */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-5">
          <h2 className="text-[16px] font-semibold text-foreground dark:text-slate-100">{viewMode === "list" ? "Teachers List" : "Teachers Grid"}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="btn btn-outline flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                {selectedDateRange}
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["All Time", "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year"].map((item) => (
                      <button key={item} onClick={() => { handleDateRangeChange(item); setIsDateRangeOpen(false); }} className={`w-full px-4 py-2 text-[13px] text-left transition-colors ${item === selectedDateRange ? "bg-primary text-white font-semibold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="btn btn-outline flex items-center gap-2"
              >
                <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Filter <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-foreground dark:text-slate-100">Filter</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Department Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Department</label>
                        <div className="relative">
                          <select 
                            value={deptFilter}
                            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                          >
                            <option value="all">All Departments</option>
                            {filterOptions.departments.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* Designation Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Designation</label>
                        <div className="relative">
                          <select 
                            value={desgFilter}
                            onChange={(e) => { setDesgFilter(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                          >
                            <option value="all">All Designations</option>
                            {filterOptions.designations.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* Status Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Status</label>
                        <div className="relative">
                          <select 
                            value={statusFilter}
                            onChange={(e) => handleStatusFilterChange(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                          >
                            <option value="all">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* Academic Year Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Academic Year</label>
                        <div className="relative">
                          <select 
                            value={academicYearFilter}
                            onChange={(e) => { setAcademicYearFilter(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                          >
                            <option value="all">Current ({academicYear})</option>
                            {filterOptions.academicYears.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 bg-white dark:bg-slate-900 rounded-b-lg pt-2">
                      <button onClick={() => { setStatusFilter("all"); setDeptFilter("all"); setDesgFilter("all"); setAcademicYearFilter("all"); setPage(1); setIsFilterOpen(false); }} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg transition-colors cursor-pointer">
                        Reset
                      </button>

                      <button onClick={() => setIsFilterOpen(false)} className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer">
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                setBulkSelectMode(!bulkSelectMode);
                setSelectedIds([]);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm ${
                bulkSelectMode
                  ? "bg-primary border-primary text-white"
                  : "border-border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>{bulkSelectMode ? "Cancel Select" : "Select"}</span>
            </button>

            <div className="flex items-center border border-border rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800/50">
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded shadow-sm transition-colors cursor-pointer ${viewMode === "list" ? "bg-primary text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-350"}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded shadow-sm transition-colors cursor-pointer ${viewMode === "grid" ? "bg-primary text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-350"}`}><Grid className="w-4 h-4" /></button>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="btn btn-outline flex items-center gap-2"
              >
                <ArrowDownAZ className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Sort: {selectedSort} <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Ascending", "Descending", "Recently Added", "Recently Viewed"].map((item) => (
                      <button 
                        key={item} 
                        onClick={() => { handleSortChange(item); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[14px] text-left transition-colors font-medium cursor-pointer ${item === selectedSort ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Rows and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-border pb-5">
          <div className="card-subtitle flex items-center gap-2 text-[13px] text-left">
            Showing{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}` : "0"}
            </span>{" "}of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {total}
            </span>{" "}teachers
          </div>
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search Name, ID, Email, Phone, Dept, Desg..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2 border border-border rounded-lg text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* List/Grid View */}
        {viewMode === "list" ? (
          <div className={`relative transition-opacity duration-200 ${isLoading && !isInitialLoad ? "opacity-60 pointer-events-none" : ""}`}>
            {isLoading && !isInitialLoad && (
              <div className="absolute top-2 right-4 z-10 flex items-center gap-2 text-[12px] font-medium text-slate-500 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-md border border-border shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Syncing...</span>
              </div>
            )}

            <div className="erp-table-wrap">
              <DataTable 
                columns={columns} 
                data={tableData} 
                onRowClick={(item) => router.push(`/teachers/${item.id}`)}
                selectionHeader={
                  <input
                    type="checkbox"
                    checked={tableData.length > 0 && tableData.every(t => selectedIds.includes(t.id))}
                    onChange={() => {
                      const allChecked = tableData.length > 0 && tableData.every(t => selectedIds.includes(t.id));
                      if (allChecked) {
                        setSelectedIds(prev => prev.filter(id => !tableData.some(t => t.id === id)));
                      } else {
                        setSelectedIds(prev => {
                          const toAdd = tableData.filter(t => !prev.includes(t.id)).map(t => t.id);
                          return [...prev, ...toAdd];
                        });
                      }
                    }}
                    className="rounded border-slate-300 w-4 h-4 accent-primary cursor-pointer"
                  />
                }
                renderSelection={(t) => (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.id)}
                    onChange={() => {
                      setSelectedIds(prev =>
                        prev.includes(t.id)
                          ? prev.filter(id => id !== t.id)
                          : [...prev, t.id]
                      );
                    }}
                    className="rounded border-slate-300 w-4 h-4 accent-primary cursor-pointer"
                  />
                )}
                noDataMessage="No faculty records matching filter."
              />
            </div>
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <div className={`relative transition-opacity duration-200 ${isLoading && !isInitialLoad ? "opacity-60 pointer-events-none" : ""}`}>
            {isLoading && !isInitialLoad && (
              <div className="absolute top-2 right-4 z-10 flex items-center gap-2 text-[12px] font-medium text-slate-500 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-md border border-border shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Syncing...</span>
              </div>
            )}
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {teachers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                  No faculty records matching filter.
                </div>
              ) : (
                teachers.map((teacher) => {
                  const displayId = teacher.employee_id || "—";
                  const phoneStr = teacher.phone || "—";
                  const status = teacher.is_active ? "Active" : "Inactive";
                  const subject = teacher.subject_specialization || "—";

                  return (
                    <div key={teacher._id} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/50 transition-all duration-300 relative text-left flex flex-col hover:border-primary/50">
                      {/* Top row: ID, Checkbox, Status, Actions */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {bulkSelectMode && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(teacher._id)}
                              onChange={() => {
                                setSelectedIds(prev =>
                                  prev.includes(teacher._id)
                                    ? prev.filter(id => id !== teacher._id)
                                    : [...prev, teacher._id]
                                );
                              }}
                              className="rounded border-slate-300 w-3.5 h-3.5 accent-primary cursor-pointer"
                            />
                          )}
                          <span className="text-primary font-semibold text-[13px] hover:underline cursor-pointer" onClick={() => router.push(`/teachers/${teacher._id}`)}>{displayId}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${status === "Active" ? "bg-success/10 text-success" : "bg-[#FFEBEB] text-[#E02424]"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status === "Active" ? "bg-success" : "bg-[#E02424]"}`} />
                            {status}
                          </span>
                          <div className="relative">
                            <button onClick={() => setActionMenuId(actionMenuId === teacher._id ? null : teacher._id)} className={`p-1.5 rounded-lg transition-colors ${actionMenuId === teacher._id ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}>
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {actionMenuId === teacher._id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                                <div className="absolute right-0 top-10 w-44 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                                  <button onClick={() => { router.push(`/teachers/${teacher._id}`); setActionMenuId(null); }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                                    <AlignLeft className="w-4 h-4 text-foreground dark:text-slate-100" /> View Teacher
                                  </button>
                                  <button onClick={() => { router.push(`/teachers/${teacher._id}/edit`); setActionMenuId(null); }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                                    <Edit className="w-4 h-4 text-foreground dark:text-slate-100" /> Edit
                                  </button>
                                  <button onClick={() => { setSelectedTeacher(teacher); setIsLoginDetailsOpen(true); setActionMenuId(null); }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                                    <Lock className="w-4 h-4 text-foreground dark:text-slate-100" /> Login Details
                                  </button>
                                  <button onClick={() => { 
                                    const teacherUser = teacher.user_id;
                                    const tUid = teacherUser && typeof teacherUser === "object" ? teacherUser._id : undefined;
                                    const tEmail = teacherUser && typeof teacherUser === "object" ? teacherUser.email : teacher.email || "";
                                    setResetPassTarget({ userId: tUid, name: teacher.name, email: tEmail }); 
                                    setIsResetPassModalOpen(true); 
                                    setActionMenuId(null); 
                                  }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                                    <Lock className="w-4 h-4 text-foreground dark:text-slate-100" /> Reset Password
                                  </button>
                                  <button onClick={() => { handleDelete(teacher._id); setActionMenuId(null); }} className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors">
                                    <Trash2 className="w-4 h-4 text-foreground dark:text-slate-100" /> Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Avatar & Info */}
                      <div className="flex items-center gap-3 mb-5 cursor-pointer" onClick={() => router.push(`/teachers/${teacher._id}`)}>
                        <img src={teacher.photo_url || getAvatar(teacher.name)} className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-800" alt={teacher.name} />
                        <div>
                          <h3 className="font-bold text-foreground dark:text-slate-100 text-[14px] group-hover:text-primary transition-colors">{teacher.name}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-[12px] font-medium">{getClassName(teacher)}</p>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="space-y-3 mb-5 text-[12px]">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-0.5">Email</p>
                          <p className="text-foreground dark:text-slate-100 font-medium">{teacher.email ? teacher.email.toLowerCase() : "No Email"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 mb-0.5">Phone</p>
                          <p className="text-foreground dark:text-slate-100 font-medium">{phoneStr}</p>
                        </div>
                      </div>

                      {/* Bottom: Department, Designation & Button */}
                      <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                        <span className="px-2 py-1 bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-bold rounded">
                          {teacher.department || "Academic"}
                        </span>
                        <button
                          onClick={() => router.push(`/teachers/${teacher._id}`)}
                          className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })
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

      {/* Reusable Login Details Modal */}
      <LoginDetailsModal
        isOpen={isLoginDetailsOpen}
        onClose={() => setIsLoginDetailsOpen(false)}
        teacher={selectedTeacher}
        target="teacher"
      />

      <ResetPasswordModal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        userId={resetPassTarget?.userId}
        userName={resetPassTarget?.name || ""}
        userEmail={resetPassTarget?.email || ""}
        onSuccess={() => fetchTeachers({ search: debouncedSearch, status: statusFilter, dateRange: selectedDateRange, sort: selectedSort, page, limit: 12, academic_year: academicYearFilter === "all" ? academicYear : academicYearFilter, department: deptFilter, designation: desgFilter })}
      />

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-[60] backdrop-blur-md border border-slate-700/60 transition-all duration-300 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[14px] font-bold tracking-wide">{selectedIds.length} Selected</span>
          </div>
          
          <div className="h-4 w-px bg-slate-700" />
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleBulkStatusChange(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer"
            >
              <span>Activate</span>
            </button>
            <button
              onClick={() => handleBulkStatusChange(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer"
            >
              <span>Deactivate</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
          
          <div className="h-4 w-px bg-slate-700" />
          
          <button
            onClick={() => setSelectedIds([])}
            className="text-[13px] text-slate-400 hover:text-slate-200 transition-colors font-medium cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
