"use client";

import React, { useState } from "react";
import {
  Plus, Search, RefreshCcw, Printer, Download, ChevronDown,
  MoreVertical, Edit, Trash2, Filter, ArrowUpDown, FileText,
  Loader2, AlertCircle
} from "lucide-react";
import { Modal } from "../../components/ui/modal";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { useClasses, ApiClass } from "@/app/hooks/useClasses";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useAuth } from "../../context/auth";
import { useAppState } from "@/app/context/store";
import { useSections } from "@/app/hooks/useSections";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useStreams } from "@/app/hooks/useStreams";
import { validateSequential } from "@/lib/utils/formValidation";

export default function ClassesPage() {
  const { user } = useAuth();
  const { academicYear } = useAppState();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { classes, isLoading, error, total, totalPages, currentPage, fetchClasses, createClass, updateClass, deleteClass } = useClasses({ skip: true });
  const { teachers } = useTeachers();
  const { config } = useAcademicConfig();
  const { sections, createSection } = useSections();
  const enableSections = config.enable_sections;
  const enableStreams = config.enable_streams;
  const { streams } = useStreams({ skip: !enableStreams });

  // ── Modal / action states ──────────────────────────────────────────
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ApiClass | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [valErrors, setValErrors] = useState<Record<string, string>>({});

  // ── Filter / pagination states ─────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Export dropdown
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  // Pending filter section (apply on click)
  const [pendingSection, setPendingSection] = useState("");

  // ── Debounced search ───────────────────────────────────────────────
  const searchRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const doFetch = React.useCallback((overrides: { search?: string; section?: string; sort?: "asc" | "desc"; p?: number } = {}) => {
    const params = {
      search: overrides.search !== undefined ? overrides.search : searchQuery,
      section: overrides.section !== undefined ? overrides.section : filterSection,
      sort: overrides.sort !== undefined ? overrides.sort : sortOrder,
      page: overrides.p !== undefined ? overrides.p : page,
      limit: PAGE_SIZE,
      academic_year: academicYear,
    };
    fetchClasses(params);
  }, [fetchClasses, searchQuery, filterSection, sortOrder, page, academicYear]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      fetchClasses({ search: val, section: filterSection, sort: sortOrder, page: 1, limit: PAGE_SIZE, academic_year: academicYear });
    }, 400);
  };

  const handleApplyFilter = () => {
    setFilterSection(pendingSection);
    setPage(1);
    setIsFilterOpen(false);
    fetchClasses({ search: searchQuery, section: pendingSection, sort: sortOrder, page: 1, limit: PAGE_SIZE, academic_year: academicYear });
  };

  const handleResetFilter = () => {
    setPendingSection("");
    setFilterSection("");
    setPage(1);
    setIsFilterOpen(false);
    fetchClasses({ search: searchQuery, section: "", sort: sortOrder, page: 1, limit: PAGE_SIZE, academic_year: academicYear });
  };

  const handleSort = (order: "asc" | "desc") => {
    setSortOrder(order);
    setPage(1);
    setIsSortOpen(false);
    fetchClasses({ search: searchQuery, section: filterSection, sort: order, page: 1, limit: PAGE_SIZE, academic_year: academicYear });
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchClasses({ search: searchQuery, section: filterSection, sort: sortOrder, page: p, limit: PAGE_SIZE, academic_year: academicYear });
  };

  // Re-fetch classes when academic year changes
  React.useEffect(() => {
    setPage(1);
    fetchClasses({
      search: searchQuery,
      section: filterSection,
      sort: sortOrder,
      page: 1,
      limit: PAGE_SIZE,
      academic_year: academicYear,
    });
  }, [fetchClasses, academicYear]);

  // ── Form states ────────────────────────────────────────────────────
  const [formName, setFormName] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formSections, setFormSections] = useState<string[]>([]);
  const [formAcademicYear, setFormAcademicYear] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formCapacity, setFormCapacity] = useState("40");
  const [formStreams, setFormStreams] = useState<string[]>([]);
  const [formStream, setFormStream] = useState("");

  const [quickSectionName, setQuickSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  const handleQuickAddSection = async () => {
    const name = quickSectionName.trim().toUpperCase();
    if (!name) return;
    setAddingSection(true);
    const result = await createSection({ name, status: "Active" });
    setAddingSection(false);
    if (result.success) {
      setQuickSectionName("");
      setFormSections(prev => [...prev, name]);
    } else {
      alert(result.message || "Failed to add section.");
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormSection("");
    setFormSections([]);
    setFormAcademicYear("");
    setFormTeacherId("");
    setFormCapacity("40");
    setFormError("");
    setQuickSectionName("");
    setFormStreams([]);
    setFormStream("");
    setValErrors({});
  };

  const openEdit = (cls: ApiClass) => {
    let baseName = cls.name;
    let streamName = "";
    if (cls.name.startsWith("Class 11") || cls.name.startsWith("Class 12")) {
      const match = cls.name.match(/^(Class 11|Class 12)\s*(.*)$/);
      if (match) {
        baseName = match[1];
        streamName = match[2]?.trim() || "";
      }
    }
    setSelectedClass(cls);
    setFormName(baseName);
    setFormStream(streamName);
    setFormSection(cls.section);
    setFormAcademicYear(cls.academic_year);
    setFormTeacherId(cls.class_teacher_id?._id || "");
    setFormCapacity(String(cls.capacity));
    setFormError("");
    setValErrors({});
    setIsEditClassOpen(true);
    setActionMenuId(null);
  };

  const openDelete = (cls: ApiClass) => {
    setSelectedClass(cls);
    setIsDeleteOpen(true);
    setActionMenuId(null);
  };

  const validateClassForm = (): boolean => {
    const fieldsToValidate = [
      { id: "formName", value: formName, label: "Class Name" },
      { id: "formAcademicYear", value: formAcademicYear, label: "Academic Year" }
    ];

    const valResult = validateSequential(fieldsToValidate);
    if (!valResult.isValid) {
      setValErrors({ [valResult.fieldId!]: valResult.error! });
      setFormError(valResult.error!);
      return false;
    }
    setValErrors({});
    setFormError("");
    return true;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClassForm()) return;
    setSubmitting(true);

    const isHigherClass = formName === "Class 11" || formName === "Class 12";
    const streamsToCreate = enableStreams && isHigherClass && formStreams.length > 0 ? formStreams : [""];
    const sectionsToCreate = enableSections && formSections.length > 0 ? formSections : [""];
    let hasError = false;
    let lastError = "";

    for (const stream of streamsToCreate) {
      for (const sec of sectionsToCreate) {
        const finalClassName = stream ? `${formName.trim()} ${stream}` : formName.trim();
        const result = await createClass({
          name: finalClassName,
          section: sec,
          academic_year: formAcademicYear.trim(),
          class_teacher_id: formTeacherId || undefined,
          capacity: parseInt(formCapacity) || 40,
        });
        if (!result.success) {
          hasError = true;
          lastError = result.message;
        }
      }
    }

    setSubmitting(false);
    if (!hasError) {
      setIsAddClassOpen(false);
      resetForm();
      doFetch();
    } else {
      setFormError(lastError || "Some classes could not be created.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    if (!validateClassForm()) return;
    setSubmitting(true);
    const isHigherClass = formName === "Class 11" || formName === "Class 12";
    const finalClassName = enableStreams && isHigherClass && formStream ? `${formName.trim()} ${formStream.trim()}` : formName.trim();
    const result = await updateClass(selectedClass._id, {
      name: finalClassName,
      section: enableSections ? formSection : "",
      academic_year: formAcademicYear.trim(),
      class_teacher_id: formTeacherId || undefined,
      capacity: parseInt(formCapacity) || 40,
    });
    setSubmitting(false);
    if (result.success) {
      setIsEditClassOpen(false);
      resetForm();
      doFetch();
    } else {
      setFormError(result.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    await deleteClass(selectedClass._id);
    setSubmitting(false);
    setIsDeleteOpen(false);
    doFetch();
  };

  const columns: ColumnDef<ApiClass>[] = React.useMemo(() => {
    const baseCols: ColumnDef<ApiClass>[] = [
      {
        header: "Class",
        accessorKey: "name",
        render: (c) => <span className="font-medium text-slate-400 dark:text-slate-200">{c.name}</span>,
      },
    ];

    if (enableSections) {
      baseCols.push({
        header: "Section",
        accessorKey: "section",
        render: (c) => <span>{c.section || "—"}</span>
      });
    }

    baseCols.push(
      { header: "Academic Year", accessorKey: "academic_year" },
      {
        header: "Class Teacher",
        accessorKey: "class_teacher_id",
        render: (c) => (
          <span className="text-slate-600 dark:text-slate-300">
            {c.class_teacher_id ? c.class_teacher_id.name : <span className="text-slate-400 italic">Not assigned</span>}
          </span>
        ),
      },
      { header: "Capacity", accessorKey: "capacity" }
    );

    if (isAdmin) {
      return [
        ...baseCols,
        {
          header: "Action",
          sortable: false,
          render: (c) => (
            <div className="relative">
              <button
                onClick={() => setActionMenuId(actionMenuId === c._id ? null : c._id)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {actionMenuId === c._id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                  <div className="absolute right-8 top-0 w-32 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5">
                    <button
                      onClick={() => openEdit(c)}
                      className="w-full px-4 py-2 text-[13px] font-semibold text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors text-left"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => openDelete(c)}
                      className="w-full px-4 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ),
        },
      ];
    }

    return baseCols;
  }, [enableSections, isAdmin, actionMenuId]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Classes List</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span>Classes</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">All Classes</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchClasses()}
            className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center">
            <Printer className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button onClick={() => setIsExportOpen(false)} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button onClick={() => setIsExportOpen(false)} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => { resetForm(); setIsAddClassOpen(true); }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
        {/* Top bar */}
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-left">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
            Classes List
            {!isLoading && (
              <span className="ml-2 text-[13px] font-normal text-slate-400">({total})</span>
            )}
          </h3>

          <div className="flex flex-wrap items-center gap-3">

            {/* Filter */}
            {enableSections && (
              <div className="relative">
                <button
                  onClick={() => { setIsFilterOpen(!isFilterOpen); setPendingSection(filterSection); }}
                  className={`btn btn-outline flex items-center gap-2 ${filterSection ? "border-primary text-primary" : ""}`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filter{filterSection ? `: ${filterSection}` : ""}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 text-left">
                      <div className="p-4 border-b border-border">
                        <h3 className="text-[15px] font-bold text-foreground dark:text-slate-100">Filter Classes</h3>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Section</label>
                          <div className="relative">
                            <select
                              value={pendingSection}
                              onChange={(e) => setPendingSection(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                            >
                              <option value="">All Sections</option>
                              {["A", "B", "C", "D", "E"].map(s => <option key={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4 flex justify-end gap-3 pt-2">
                        <button onClick={handleResetFilter} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg transition-colors">Reset</button>
                        <button onClick={handleApplyFilter} className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors">Apply</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="btn btn-outline flex items-center gap-2"
              >
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <span>Sort: {sortOrder === "asc" ? "A → Z" : "Z → A"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {(["asc", "desc"] as const).map((o) => (
                      <button key={o} onClick={() => handleSort(o)}
                        className={`w-full px-4 py-2.5 text-[13px] text-left transition-colors font-medium ${o === sortOrder ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}>
                        {o === "asc" ? "A → Z (Ascending)" : "Z → A (Descending)"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left border-b border-border/50">
          <div className="card-subtitle text-[13px]">
            Showing{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {isLoading ? "…" : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, total)}`}
            </span>{" "}of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span> classes
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full sm:w-64 focus:border-primary/50 transition-colors shadow-sm bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)]"
            />
          </div>
        </div>

        {/* Loading / Error / Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[14px] font-medium">Loading classes...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <p className="text-[14px] font-medium">{error}</p>
            <button
              onClick={() => fetchClasses()}
              className="px-4 py-2 text-[13px] font-bold bg-primary hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={classes}
              selectionHeader={<input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
              renderSelection={() => <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
            />

            {/* ── Pagination Bar ── */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="card-subtitle text-[13px]">
                  Page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-colors ${p === currentPage
                            ? "bg-primary text-white shadow-sm"
                            : "border border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ADD CLASS MODAL ── */}
      <Modal isOpen={isAddClassOpen} onClose={() => { setIsAddClassOpen(false); resetForm(); }} title="Add Class">
        <form onSubmit={handleAddSubmit} noValidate className="space-y-5 text-left font-bold">
          {formError && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-2.5 text-rose-600 dark:text-rose-400 text-[12px] font-semibold">
              <span>⚠️ {formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Class Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer ${valErrors.formName ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50"
                    }`}
                >
                  <option value="">Select Class</option>
                  {[
                    "Nursery", "LKG", "UKG",
                    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
                    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
                    "Class 11", "Class 12"
                  ].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
              {valErrors.formName && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.formName}
                </p>
              )}
            </div>
          </div>

          {enableSections && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Sections <span className="text-slate-400 text-[11px]">(optional, select one or more)</span></label>
              <div className="space-y-3 p-3 border border-border rounded-lg bg-[#F8FAFC] dark:bg-slate-900/50">
                {/* Quick Add Section Input */}
                <div className="flex gap-2">
                  <input type="text" value={quickSectionName} onChange={(e) => setQuickSectionName(e.target.value)}
                    placeholder="Add new section (e.g. A, B, C)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickAddSection();
                      }
                    }}
                    className="px-3 py-1.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 bg-white dark:bg-slate-900 flex-1 uppercase" />
                  <button type="button" onClick={handleQuickAddSection} disabled={addingSection || !quickSectionName.trim()}
                    className="px-4 py-1.5 bg-primary hover:bg-[var(--primary-hover)] disabled:opacity-55 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-1.5">
                    {addingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "+ Add"}
                  </button>
                </div>

                {/* Checkboxes List */}
                <div className="flex flex-wrap gap-2.5 pt-1.5">
                  {sections.filter(s => s.status === "Active").map(s => {
                    const checked = formSections.includes(s.name);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors shadow-sm text-[13px] font-medium text-foreground dark:text-slate-100">
                        <input type="checkbox" checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSections([...formSections, s.name]);
                            } else {
                              setFormSections(formSections.filter(x => x !== s.name));
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />
                        <span>Section {s.name}</span>
                      </label>
                    );
                  })}
                  {sections.filter(s => s.status === "Active").length === 0 && (
                    <span className="text-[12px] text-slate-400 italic">No sections created yet. Type above to add!</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {enableStreams && (formName === "Class 11" || formName === "Class 12") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Streams <span className="text-slate-400 text-[11px]">(optional, select one or more)</span></label>
              <div className="space-y-3 p-3 border border-border rounded-lg bg-[#F8FAFC] dark:bg-slate-900/50">
                <div className="flex flex-wrap gap-2.5">
                  {streams.filter(s => s.status === "Active").map(s => {
                    const checked = formStreams.includes(s.name);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors shadow-sm text-[13px] font-medium text-foreground dark:text-slate-100">
                        <input type="checkbox" checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormStreams([...formStreams, s.name]);
                            } else {
                              setFormStreams(formStreams.filter(x => x !== s.name));
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />
                        <span>{s.name}</span>
                      </label>
                    );
                  })}
                  {streams.filter(s => s.status === "Active").length === 0 && (
                    <span className="text-[12px] text-slate-400 italic">No active streams found. Please configure them in settings.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Academic Year <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  id="formAcademicYear"
                  value={formAcademicYear}
                  onChange={(e) => setFormAcademicYear(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer ${valErrors.formAcademicYear ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50"
                    }`}
                >
                  <option value="">Select Year</option>
                  {[
                    "2026-2027"
                  ].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
              {valErrors.formAcademicYear && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.formAcademicYear}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Capacity</label>
                <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)}
                  min={1} max={200}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Teacher Assignment <span className="text-slate-400 text-[11px]">(optional)</span></label>
                <div className="relative">
                  <select value={formTeacherId} onChange={(e) => setFormTeacherId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                    <option value="">Not assigned</option>
                    {teachers.filter(t => t.is_active).map(t => (
                      <option key={t._id} value={t._id}>{t.name}{t.employee_id ? ` (${t.employee_id})` : ""}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddClassOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Class
            </button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT CLASS MODAL ── */}
      <Modal isOpen={isEditClassOpen} onClose={() => { setIsEditClassOpen(false); resetForm(); }} title="Edit Class">
        <form onSubmit={handleEditSubmit} noValidate className="space-y-5 text-left font-bold">
          {formError && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-2.5 text-rose-600 dark:text-rose-400 text-[12px] font-semibold">
              <span>⚠️ {formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer ${valErrors.formName ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50"
                    }`}
                >
                  <option value="">Select Class</option>
                  {[
                    "Nursery", "LKG", "UKG",
                    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
                    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
                    "Class 11", "Class 12"
                  ].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
              {valErrors.formName && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.formName}
                </p>
              )}
            </div>
            {enableSections && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Section <span className="text-slate-400 text-[11px]">(optional)</span></label>
                <div className="relative">
                  <select value={formSection} onChange={(e) => setFormSection(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                    <option value="">No Section</option>
                    {sections.filter(s => s.status === "Active").map(s => (
                      <option key={s._id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {enableStreams && (formName === "Class 11" || formName === "Class 12") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Stream</label>
              <div className="relative">
                <select value={formStream} onChange={(e) => setFormStream(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">No Stream</option>
                  {streams.filter(s => s.status === "Active").map(s => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Academic Year <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  id="formAcademicYear"
                  value={formAcademicYear}
                  onChange={(e) => setFormAcademicYear(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer ${valErrors.formAcademicYear ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50"
                    }`}
                >
                  <option value="">Select Year</option>
                  {[
                    "2026-2027"
                  ].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
              {valErrors.formAcademicYear && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.formAcademicYear}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Capacity</label>
              <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)}
                min={1} max={200}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Teacher Assignment <span className="text-slate-400 text-[11px]">(optional)</span></label>
            <div className="relative">
              <select value={formTeacherId} onChange={(e) => setFormTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Not assigned</option>
                {teachers.filter(t => t.is_active).map(t => (
                  <option key={t._id} value={t._id}>{t.name}{t.employee_id ? ` (${t.employee_id})` : ""}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsEditClassOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Class">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to delete{" "}
            <span className="font-bold text-foreground dark:text-white">
              {selectedClass?.name}{selectedClass?.section ? ` - ${selectedClass.section}` : ""}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsDeleteOpen(false)}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={submitting}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
