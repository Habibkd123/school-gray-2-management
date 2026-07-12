"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import { useClasses } from "@/app/hooks/useClasses";
import { useSubjects } from "@/app/hooks/useSubjects";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { PaginationBar } from "@/app/components/ui/pagination-bar";
import {
  Plus, Search, Filter, Eye, Edit, Trash2, CheckCircle, ClipboardList,
  Loader2, AlertCircle, BookOpen, BarChart2, RefreshCw, Printer, Download,
  ChevronDown, Calendar, FileText, CheckCircle2, MoreVertical, List, GraduationCap,
  LayoutGrid, Table
} from "lucide-react";
import { PrintService } from "@/app/lib/print-service";
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-slate-500/10", text: "text-slate-500", label: "Draft" },
  scheduled: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Scheduled" },
  ongoing: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "Ongoing" },
  completed: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", label: "Completed" },
  published: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Published" },
};

const STATUS_OPTIONS = ["All", "draft", "scheduled", "ongoing", "completed", "published"];

const DATE_RANGES = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "This Year", "All Time", "Custom Range"] as const;

function getDateRangeDates(range: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (range) {
    case "Today":
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "Yesterday":
      from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1); to.setHours(23, 59, 59, 999);
      break;
    case "Last 7 Days":
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "Last 30 Days":
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "This Month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "This Year":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "All Time":
      return { from: null, to: null };
    default:
      return { from: null, to: null };
  }
  return { from, to };
}

interface Test {
  _id: string;
  title: string;
  class_id: { _id: string; name: string; section: string } | null;
  subject_id: { _id: string; name: string } | null;
  teacher_id: { _id: string; name: string } | null;
  test_date: string;
  start_time: string;
  end_time: string;
  total_marks: number;
  passing_marks: number;
  is_published: boolean;
  computedStatus: string;
}

export default function AssessmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "school_admin";
  const isTeacher = user?.role === "teacher";
  const canCreate = isAdmin || isTeacher;
  const { enableSections } = useAcademicConfig();

  const params = useParams<{ classId: string }>();
  const routeClassId = params?.classId || "all";

  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState(routeClassId);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  // Fetch metadata hooks
  const { classes } = useClasses();
  const { subjects, loading: subjectsLoading } = useSubjects(classFilter !== "all" ? classFilter : undefined);
  const { teachers } = useTeachers();

  // Date range states
  const [selectedRange, setSelectedRange] = useState("All Time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [activeFrom, setActiveFrom] = useState<Date | null>(null);
  const [activeTo, setActiveTo] = useState<Date | null>(null);

  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Recently Added");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, bottom: false, right: false });

  // Close action menu on scroll to prevent detached fixed positioning
  useEffect(() => {
    const handleScroll = () => {
      if (actionMenuId) setActionMenuId(null);
    };
    if (actionMenuId) {
      window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    }
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [actionMenuId]);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (actionMenuId === id) {
      setActionMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;

    setMenuPos({
      top: spaceBelow < 280 ? rect.top - 8 : rect.bottom + 8,
      left: spaceRight < 220 ? rect.right : rect.left,
      bottom: spaceBelow < 280,
      right: spaceRight < 220
    });
    setActionMenuId(id);
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (classFilter && classFilter !== "all") params.set("class_id", classFilter);
      if (subjectFilter && subjectFilter !== "all") params.set("subject_id", subjectFilter);

      const res = await fetch(`/api/assessments?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setTests(data.data);
      }
    } catch {
      showToast("error", "Failed to load tests");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, classFilter, subjectFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Reset section and subject filter when class selection changes
  useEffect(() => {
    setSectionFilter("all");
    setSubjectFilter("all");
  }, [classFilter]);

  const applyDateRange = (range: string) => {
    if (range === "Custom Range") {
      setIsCustom(true);
      return;
    }
    setIsCustom(false);
    const { from, to } = getDateRangeDates(range);
    setActiveFrom(from);
    setActiveTo(to);
    setSelectedRange(range);
    setIsDateRangeOpen(false);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    setActiveFrom(new Date(customFrom));
    setActiveTo(new Date(customTo));
    setSelectedRange(`${customFrom} — ${customTo}`);
    setIsCustom(false);
    setIsDateRangeOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assessments/${deleteId}`, {
        method: "DELETE", headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Test deleted successfully");
        fetchTests();
      } else {
        showToast("error", data.message || "Delete failed");
      }
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handlePublish = async (id: string) => {
    setPublishingId(id);
    try {
      const res = await fetch(`/api/assessments/${id}/publish`, {
        method: "POST", headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Results published successfully!");
        fetchTests();
      } else {
        showToast("error", data.message || "Publish failed");
      }
    } finally {
      setPublishingId(null);
      setActionMenuId(null);
    }
  };

  const handleExport = (type: "pdf" | "excel") => {
    alert(`Exporting assessments as ${type.toUpperCase()}...`);
    setIsExportOpen(false);
  };

  // Derive active sections for dropdown
  const classSections = useMemo(() => {
    if (classFilter === "all") {
      const allSecs = classes.map(c => c.section).filter(Boolean);
      return Array.from(new Set(allSecs));
    }
    const matched = classes.filter(c => c._id === classFilter);
    return Array.from(new Set(matched.map(c => c.section).filter(Boolean)));
  }, [classes, classFilter]);

  // Frontend local filtering & sorting
  const filteredTests = useMemo(() => {
    let result = [...tests];

    // Filter by Section
    if (sectionFilter && sectionFilter !== "all") {
      result = result.filter(t => t.class_id?.section === sectionFilter);
    }

    // Filter by Teacher
    if (teacherFilter && teacherFilter !== "all") {
      result = result.filter(t => t.teacher_id?._id === teacherFilter);
    }

    // Filter by Date Range
    if (activeFrom && activeTo) {
      result = result.filter(t => {
        const d = new Date(t.test_date);
        return d >= activeFrom && d <= activeTo;
      });
    }

    // Filter by Upcoming & Today only if active
    if (upcomingOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result = result.filter(t => {
        const d = new Date(t.test_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime();
      });
    }

    // Sorting
    if (selectedSort === "Ascending") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (selectedSort === "Descending") {
      result.sort((a, b) => b.title.localeCompare(a.title));
    } else if (selectedSort === "Recently Added") {
      result.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
    }

    return result;
  }, [tests, sectionFilter, teacherFilter, activeFrom, activeTo, selectedSort, upcomingOnly]);

  // Group assessments class-wise
  const groupedAssessments = useMemo(() => {
    const groups: Record<string, { classId: string; className: string; tests: Test[] }> = {};

    filteredTests.forEach(t => {
      const classId = t.class_id?._id || "unassigned";
      const className = t.class_id
        ? `${t.class_id.name}${t.class_id.section ? ` — ${t.class_id.section}` : ""}`
        : "Unassigned Class";

      if (!groups[classId]) {
        groups[classId] = {
          classId,
          className,
          tests: []
        };
      }
      groups[classId].tests.push(t);
    });

    // Sort classes alphabetically
    return Object.values(groups).sort((a, b) => a.className.localeCompare(b.className));
  }, [filteredTests]);

  // Paginated class groups
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedAssessments.slice(start, start + pageSize);
  }, [groupedAssessments, currentPage]);

  // Paginated flat tests for Table view
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTests.slice(start, start + pageSize);
  }, [filteredTests, currentPage]);

  const totalPages = useMemo(() => {
    const totalCount = viewMode === "grid" ? groupedAssessments.length : filteredTests.length;
    return Math.ceil(totalCount / pageSize) || 1;
  }, [viewMode, groupedAssessments.length, filteredTests.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, classFilter, sectionFilter, subjectFilter, teacherFilter, activeFrom, activeTo, selectedSort, viewMode, upcomingOnly]);

  // Compute live statistics counts
  const stats = useMemo(() => {
    return {
      total: tests.length,
      scheduled: tests.filter(t => t.computedStatus === "scheduled").length,
      completed: tests.filter(t => t.computedStatus === "completed" || t.computedStatus === "published" || t.computedStatus === "ongoing").length,
      draft: tests.filter(t => t.computedStatus === "draft").length
    };
  }, [tests]);

  const dateRangeLabel = (activeFrom && activeTo && !isCustom)
    ? `${activeFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} — ${activeTo.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
    : selectedRange;

  const triggerCls = (open: boolean) =>
    `flex items-center gap-2 px-3 py-2 border rounded-lg text-[13px] font-semibold bg-white dark:bg-slate-900 shadow-sm transition-colors cursor-pointer
     ${open
      ? "border-primary text-primary"
      : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  const handlePrint = () => {
    PrintService.print('printable-area', { pageSize: 'A4' });
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Toast notifications */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-[80] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium transition-all ${toastMsg.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
            : "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400"
          }`}>
          {toastMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toastMsg.text}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-[70] overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Delete Assessment?</h2>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              This will permanently delete the assessment and all associated student marks. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-rose-500 text-white text-[14px] font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {classes.find(c => c._id === routeClassId) ? (
              `${classes.find(c => c._id === routeClassId)?.name} ${classes.find(c => c._id === routeClassId)?.section ? `- ${classes.find(c => c._id === routeClassId)?.section}` : ""}`
            ) : "Class Assessments"}
          </h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <Link href="/assessments" className="hover:text-primary transition-colors">Assessments</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Class Details</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchTests()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handlePrint} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button onClick={() => handleExport("pdf")} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button onClick={() => handleExport("excel")} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>

          {canCreate && (
            <Link
              href="/assessments/create"
              className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Assessment
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="section-title leading-none">{stats.total}</h3>
            <p className="card-subtitle text-[13px] mt-1.5">Total Assessments</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="section-title leading-none">{stats.scheduled}</h3>
            <p className="card-subtitle text-[13px] mt-1.5">Scheduled</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="section-title leading-none">{stats.completed}</h3>
            <p className="card-subtitle text-[13px] mt-1.5">Completed</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="section-title leading-none">{stats.draft}</h3>
            <p className="card-subtitle text-[13px] mt-1.5">Draft</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left">

        {/* Table Header & Controls Section */}
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Assessment List (Class-wise)</h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Switch */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "grid" ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "table" ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-slate-400 hover:text-slate-655 dark:hover:text-slate-350"}`}
                title="Table View"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>

            {/* Upcoming Only Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-border bg-white dark:bg-slate-900 rounded-lg shadow-sm">
              <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Upcoming Only</span>
              <button
                type="button"
                onClick={() => setUpcomingOnly(!upcomingOnly)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${upcomingOnly ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${upcomingOnly ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
            {/* Class selection dropdown removed (we are in Class details view) */}

            {/* Date Range dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsDateRangeOpen(!isDateRangeOpen)} className={triggerCls(isDateRangeOpen)}>
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="max-w-full sm:w-[120px] truncate">{dateRangeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDateRangeOpen ? "rotate-180" : ""}`} />
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1">
                    {DATE_RANGES.map((range) => (
                      <button
                        key={range}
                        onClick={() => applyDateRange(range)}
                        className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer
                          ${selectedRange === range ? "bg-primary/10 dark:bg-primary/20 text-[var(--primary-hover)] dark:text-primary font-semibold" : "text-slate-700 dark:text-slate-300"}`}
                      >
                        {range}
                      </button>
                    ))}
                    {isCustom && (
                      <div className="px-4 py-3 border-t border-border bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="space-y-2">
                          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                            className="w-full text-[12px] px-2 py-1.5 border border-border rounded outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200" />
                          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                            className="w-full text-[12px] px-2 py-1.5 border border-border rounded outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200" />
                          <button onClick={applyCustomRange} disabled={!customFrom || !customTo}
                            className="w-full py-1.5 mt-1 text-[12px] font-bold text-white bg-primary hover:bg-[var(--primary-hover)] rounded transition-colors disabled:opacity-50 cursor-pointer">
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                    {(activeFrom || activeTo) && !isCustom && (
                      <div className="px-4 pt-2 pb-1 border-t border-border mt-1">
                        <button onClick={() => { setActiveFrom(null); setActiveTo(null); setSelectedRange("All Time"); setIsDateRangeOpen(false); }}
                          className="w-full text-[12px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer">
                          Clear Filter
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Advanced Filters Trigger */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={triggerCls(isFilterOpen)}>
                <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="whitespace-nowrap">Filter</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-foreground dark:text-slate-100">Advanced Filters</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Section (only shown if sections are enabled) */}
                      {enableSections && (
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Section</label>
                          <div className="relative">
                            <select
                              value={sectionFilter}
                              onChange={e => setSectionFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                            >
                              <option value="all">All Sections</option>
                              {classSections.map(sec => (
                                <option key={sec} value={sec}>{sec}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {/* Subject */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Subject</label>
                        <div className="relative">
                          <select
                            value={subjectFilter}
                            onChange={e => setSubjectFilter(e.target.value)}
                            disabled={subjectsLoading}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer disabled:opacity-50"
                          >
                            <option value="all">{subjectsLoading ? "Loading..." : "All Subjects"}</option>
                            {subjects.map(sub => (
                              <option key={sub._id} value={sub._id}>{sub.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* Teacher (Admin only) */}
                      {isAdmin && (
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Teacher</label>
                          <div className="relative">
                            <select
                              value={teacherFilter}
                              onChange={e => setTeacherFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                            >
                              <option value="all">All Teachers</option>
                              {teachers.map(t => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Status</label>
                        <div className="relative">
                          <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>
                                {opt === "All" ? "All Status" : STATUS_STYLES[opt]?.label || opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 bg-white dark:bg-slate-900 rounded-b-lg border-t border-border mt-2">
                      <button
                        onClick={() => {
                          setSectionFilter("all");
                          setSubjectFilter("all");
                          setTeacherFilter("all");
                          setStatusFilter("All");
                        }}
                        className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsSortOpen(!isSortOpen)} className={triggerCls(isSortOpen)}>
                <List className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Sort by: {selectedSort}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Recently Added", "Ascending", "Descending"].map((item) => (
                      <button
                        key={item}
                        onClick={() => { setSelectedSort(item); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[13px] text-left transition-colors cursor-pointer
                          ${selectedSort === item ? "bg-primary/10 dark:bg-primary/20 text-[var(--primary-hover)] dark:text-primary font-semibold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
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

        {/* Filter / Search Info bar */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
          <div className="card-subtitle flex items-center gap-2 text-[13px]">
            <span>Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredTests.length}</span> assessments</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Grouped Class list */}
        {/* Grouped Class list */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span>Loading assessments...</span>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 border border-border">
                <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">No assessments found</p>
              <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1 max-w-[280px]">
                {canCreate ? "Create your first test/assessment to get started." : "No assessments listed yet."}
              </p>
              {canCreate && (
                <Link
                  href="/assessments/create"
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Create Assessment
                </Link>
              )}
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="erp-table">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5 w-12 text-center">#</th>
                    <th className="px-5 py-3.5">Title</th>
                    <th className="px-5 py-3.5">Class</th>
                    <th className="px-5 py-3.5">Subject</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Marks</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-[13.5px]">
                  {paginatedTests.map((t, idx) => {
                    const statusStyle = STATUS_STYLES[t.computedStatus] || STATUS_STYLES.scheduled;
                    const rowSerial = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-4 text-center font-sans font-bold text-slate-400 text-xs">
                          {rowSerial}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-805 dark:text-slate-100">
                          {t.title}
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-350">
                          {t.class_id ? `${t.class_id.name}${t.class_id.section ? ` - ${t.class_id.section}` : ""}` : "Unassigned"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {t.subject_id?.name || "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                          <div>{new Date(t.test_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">({t.start_time} – {t.end_time})</div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          <span>Total: <span className="font-bold text-slate-700 dark:text-slate-200">{t.total_marks}</span></span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span>Passing: <span className="font-bold text-rose-500">{t.passing_marks}</span></span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="relative inline-block animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleMenuClick(e, t._id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === t._id ? "bg-primary text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-850"}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {actionMenuId === t._id && typeof document !== "undefined" && createPortal(
                              <>
                                <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                                <div
                                  className="fixed w-48 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] z-[110] overflow-hidden py-2 text-left animate-in fade-in zoom-in-95 duration-100"
                                  style={{
                                    top: menuPos.bottom ? "auto" : menuPos.top,
                                    bottom: menuPos.bottom ? window.innerHeight - menuPos.top : "auto",
                                    left: menuPos.right ? "auto" : menuPos.left,
                                    right: menuPos.right ? window.innerWidth - menuPos.left : "auto",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link href={`/assessments/${routeClassId}/${t._id}`} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                    <Eye className="w-4 h-4 text-indigo-500" /> View Details
                                  </Link>

                                  {(isAdmin || isTeacher) && (
                                    <Link href={`/assessments/${routeClassId}/${t._id}/marks`} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                      <BookOpen className="w-4 h-4 text-emerald-500" /> Enter Marks
                                    </Link>
                                  )}

                                  <Link href={`/assessments/${routeClassId}/${t._id}/analytics`} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                    <BarChart2 className="w-4 h-4 text-purple-500" /> Results / Analytics
                                  </Link>

                                  {(isAdmin || isTeacher) && !t.is_published && t.computedStatus !== "draft" && t.computedStatus !== "scheduled" && (
                                    <button
                                      onClick={() => handlePublish(t._id)}
                                      disabled={publishingId === t._id}
                                      className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {publishingId === t._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-sky-500" />}
                                      <span>Publish Results</span>
                                    </button>
                                  )}

                                  {(isAdmin || isTeacher) && (
                                    <Link href={`/assessments/create?edit=${t._id}`} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer border-t border-border mt-1 pt-2">
                                      <Edit className="w-4 h-4 text-amber-500" /> Edit Assessment
                                    </Link>
                                  )}

                                  {isAdmin && (
                                    <button
                                      onClick={() => { setDeleteId(t._id); setActionMenuId(null); }}
                                      className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4 text-rose-600" /> Delete
                                    </button>
                                  )}
                                </div>
                              </>, document.body
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-6 items-start">
              {paginatedGroups.map((group) => (
                <div key={group.classId} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 animate-in fade-in">

                  {/* Outer Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f0f4fc] dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 capitalize tracking-wide">
                          {group.className.toLowerCase()}
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded">
                      2026-2027
                    </span>
                  </div>

                  {/* Separator Line */}
                  <div className="h-[1px] bg-slate-100 dark:bg-slate-800/80 mb-4" />

                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                    Assessments ({group.tests.length})
                  </h4>

                  {/* Inner Assessment Cards */}
                  <div className="space-y-3">
                    {group.tests.map((t) => {
                      const statusStyle = STATUS_STYLES[t.computedStatus] || STATUS_STYLES.scheduled;
                      return (
                        <div key={t._id} className="border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors relative flex flex-col gap-3">

                          {/* Inner Card Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                              <span className="text-[14px] font-bold text-slate-850 dark:text-slate-200">
                                {t.title}
                              </span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.label}
                            </span>
                          </div>

                          {/* Inner Separator */}
                          <div className="h-[1px] bg-slate-100 dark:bg-slate-800/80 my-0.5" />

                          {/* Inner Card Details */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="font-bold text-slate-700 dark:text-slate-350 uppercase">
                                  {t.subject_id?.name || "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500">
                                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>
                                  {new Date(t.test_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                  <span className="ml-1.5 text-[11px] text-slate-400">({t.start_time} – {t.end_time})</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500">
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Marks: Total <span className="font-semibold text-slate-700 dark:text-slate-305">{t.total_marks}</span> | Passing <span className="font-semibold text-rose-500">{t.passing_marks}</span></span>
                              </div>
                              {isAdmin && t.teacher_id && (
                                <div className="flex items-center gap-2 text-slate-500 text-[12px]">
                                  <span className="font-medium">Teacher:</span>
                                  <span>{t.teacher_id.name}</span>
                                </div>
                              )}
                            </div>

                            {/* Action Button */}
                            <div className="relative animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleMenuClick(e, t._id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === t._id ? "bg-primary text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-550 border border-slate-200 dark:border-slate-800"}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {actionMenuId === t._id && typeof document !== "undefined" && createPortal(
                                <>
                                  <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                                  <div
                                    className="fixed w-48 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] z-[110] overflow-hidden py-2 text-left animate-in fade-in zoom-in-95 duration-100"
                                    style={{
                                      top: menuPos.bottom ? "auto" : menuPos.top,
                                      bottom: menuPos.bottom ? window.innerHeight - menuPos.top : "auto",
                                      left: menuPos.right ? "auto" : menuPos.left,
                                      right: menuPos.right ? window.innerWidth - menuPos.left : "auto",
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Link href={`/assessments/${routeClassId}/${t._id}`} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                      <Eye className="w-4 h-4 text-indigo-500" /> View Details
                                    </Link>

                                    {(isAdmin || isTeacher) && (
                                      <Link href={`/assessments/${routeClassId}/${t._id}/marks`} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                        <BookOpen className="w-4 h-4 text-emerald-500" /> Enter Marks
                                      </Link>
                                    )}

                                    <Link href={`/assessments/${routeClassId}/${t._id}/analytics`} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                      <BarChart2 className="w-4 h-4 text-purple-500" /> Results / Analytics
                                    </Link>

                                    {(isAdmin || isTeacher) && !t.is_published && t.computedStatus !== "draft" && t.computedStatus !== "scheduled" && (
                                      <button
                                        onClick={() => handlePublish(t._id)}
                                        disabled={publishingId === t._id}
                                        className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer disabled:opacity-50"
                                      >
                                        {publishingId === t._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-sky-500" />}
                                        <span>Publish Results</span>
                                      </button>
                                    )}

                                    {(isAdmin || isTeacher) && (
                                      <Link href={`/assessments/create?edit=${t._id}`} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer border-t border-border mt-1 pt-2">
                                        <Edit className="w-4 h-4 text-amber-500" /> Edit Assessment
                                      </Link>
                                    )}

                                    {isAdmin && (
                                      <button
                                        onClick={() => { setDeleteId(t._id); setActionMenuId(null); }}
                                        className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4 text-rose-600" /> Delete
                                      </button>
                                    )}
                                  </div>
                                </>, document.body
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={viewMode === "grid" ? groupedAssessments.length : filteredTests.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            className="rounded-b-xl"
          />
        )}
      </div>
    </div>
  );
}
