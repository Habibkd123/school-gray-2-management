"use client";

import React, { useState, useCallback } from "react";
import {
  Plus, Search, RefreshCcw, Printer, Download, ChevronDown,
  MoreVertical, Edit, Trash2, Filter, ArrowUpDown, FileText,
  Loader2, AlertCircle, BookOpen
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { useClasses, ApiClass } from "@/app/hooks/useClasses";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";
import { useSections } from "@/app/hooks/useSections";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useStreams } from "@/app/hooks/useStreams";
import { useAuthReady } from "@/lib/utils/session";

const CLASS_OPTIONS = [
  "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12",
];

const ACADEMIC_YEARS = ["2026-2027"];

export default function AcademicClassesPage() {
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

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ApiClass | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Search / filter / pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const PAGE_SIZE = 10;

  const searchRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doFetch = useCallback((overrides: Record<string, any> = {}) => {
    fetchClasses({
      search: overrides.search ?? searchQuery,
      sort: overrides.sort ?? sortOrder,
      page: overrides.p ?? page,
      limit: PAGE_SIZE,
      academic_year: academicYear,
    });
  }, [fetchClasses, searchQuery, sortOrder, page, academicYear]);

  const authReady = useAuthReady();

  React.useEffect(() => {
    if (!authReady) return;
    setPage(1);
    fetchClasses({ search: searchQuery, sort: sortOrder, page: 1, limit: PAGE_SIZE, academic_year: academicYear });
  }, [fetchClasses, academicYear, authReady]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val); setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      fetchClasses({ search: val, sort: sortOrder, page: 1, limit: PAGE_SIZE, academic_year: academicYear });
    }, 400);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchClasses({ search: searchQuery, sort: sortOrder, page: p, limit: PAGE_SIZE, academic_year: academicYear });
  };

  // Form state
  const [formName, setFormName] = useState("");
  const [formClassCode, setFormClassCode] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formSections, setFormSections] = useState<string[]>([]);
  const [formAcademicYear, setFormAcademicYear] = useState(academicYear);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formCapacity, setFormCapacity] = useState("40");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
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
    setFormName(""); setFormClassCode(""); setFormSection(""); setFormSections([]); setFormAcademicYear(academicYear);
    setFormTeacherId(""); setFormCapacity("40"); setFormStatus("Active"); setFormError("");
    setQuickSectionName(""); setFormStreams([]); setFormStream("");
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
    setFormClassCode((cls as any).class_code || "");
    setFormSection(cls.section || "");
    setFormAcademicYear(cls.academic_year);
    setFormTeacherId(cls.class_teacher_id?._id || "");
    setFormCapacity(String(cls.capacity));
    setFormStatus((cls as any).status || "Active");
    setFormError("");
    setIsEditOpen(true);
    setActionMenuId(null);
  };

  const openDelete = (cls: ApiClass) => {
    setSelectedClass(cls); setIsDeleteOpen(true); setActionMenuId(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAcademicYear.trim()) {
      setFormError("Class name and academic year are required."); return;
    }
    const isHigherClass = formName === "Class 11" || formName === "Class 12";
    // Stream is mandatory for Class 11 and Class 12
    if (isHigherClass && formStreams.length === 0) {
      setFormError("Stream is required for Class 11 and Class 12."); return;
    }
    setSubmitting(true);

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
          ...(formClassCode ? { class_code: formClassCode.trim().toUpperCase() } : {}),
          ...(({ status: formStatus } as any)),
        } as any);
        if (!result.success) {
          hasError = true;
          lastError = result.message;
        }
      }
    }

    setSubmitting(false);
    if (!hasError) {
      setIsAddOpen(false);
      resetForm();
      doFetch();
    } else {
      setFormError(lastError || "Some classes could not be created.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !formName.trim() || !formAcademicYear.trim()) {
      setFormError("Class name and academic year are required."); return;
    }
    const isHigherClass = formName === "Class 11" || formName === "Class 12";
    // Stream is mandatory for Class 11 and Class 12
    if (isHigherClass && !formStream.trim()) {
      setFormError("Stream is required for Class 11 and Class 12."); return;
    }
    setSubmitting(true);
    const finalClassName = enableStreams && isHigherClass && formStream ? `${formName.trim()} ${formStream.trim()}` : formName.trim();
    const result = await updateClass(selectedClass._id, {
      name: finalClassName,
      section: enableSections ? formSection.trim() : "",
      academic_year: formAcademicYear.trim(),
      class_teacher_id: formTeacherId || undefined,
      capacity: parseInt(formCapacity) || 40,
      ...(formClassCode ? { class_code: formClassCode.trim().toUpperCase() } : {}),
      ...(({ status: formStatus } as any)),
    } as any);
    setSubmitting(false);
    if (result.success) { setIsEditOpen(false); resetForm(); doFetch(); }
    else setFormError(result.message);
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    await deleteClass(selectedClass._id);
    setSubmitting(false);
    setIsDeleteOpen(false);
    doFetch();
  };

  const StatusBadge = ({ status }: { status?: string }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${status === "Inactive"
      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
      }`}>
      {status || "Active"}
    </span>
  );

  const columns: ColumnDef<ApiClass>[] = React.useMemo(() => {
    const cols: ColumnDef<ApiClass>[] = [
      { header: "#", accessorKey: "_id", render: (_c: ApiClass, i: number) => <span className="text-slate-500 font-medium text-[13px]">{i + 1}</span> },
      { header: "Class Name", accessorKey: "name", render: (c) => <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span> },
    ];

    if (enableSections) {
      cols.push({
        header: "Section",
        accessorKey: "section",
        render: (c) => <span className="font-semibold text-slate-700 dark:text-slate-300">{c.section || "—"}</span>,
      });
    }

    cols.push(
      { header: "Academic Year", accessorKey: "academic_year" },
      {
        header: "Class Teacher", accessorKey: "class_teacher_id", render: (c) => (
          <span className="text-slate-600 dark:text-slate-300">
            {c.class_teacher_id ? c.class_teacher_id.name : <span className="text-slate-400 italic">Not assigned</span>}
          </span>
        )
      },
      { header: "Capacity", accessorKey: "capacity" },
      { header: "Status", accessorKey: "status", render: (c) => <StatusBadge status={(c as any).status} /> }
    );

    if (isAdmin) {
      cols.push({
        header: "Action", sortable: false,
        render: (c) => (
          <div className="relative">
            <button onClick={() => setActionMenuId(actionMenuId === c._id ? null : c._id)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            {actionMenuId === c._id && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                <div className="absolute right-8 top-0 w-32 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5">
                  <button onClick={() => openEdit(c)} className="w-full px-4 py-2 text-[13px] font-semibold text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors text-left">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => openDelete(c)} className="w-full px-4 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors text-left">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ),
      });
    }

    return cols;
  }, [enableSections, isAdmin, actionMenuId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold text-foreground dark:text-slate-100">Classes</h1>
          <div className="flex items-center gap-2 text-[14px] text-[#68718a] mt-1 font-medium">
            <span>Academic Management</span><span>/</span>
            <span className="text-foreground dark:text-slate-100">Classes</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => doFetch()} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors dark:text-slate-400">
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors dark:text-slate-400">
            <Printer className="w-4 h-4" />
          </button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors">
              <Download className="w-4 h-4" /><span>Export</span><ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2 text-left">
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
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors">
              <Plus className="w-4 h-4" /><span>Add Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-left">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
            Classes List {!isLoading && <span className="ml-2 text-[13px] font-normal text-slate-400">({total})</span>}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort */}
            <div className="relative">
              <button onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <span>Sort: {sortOrder === "asc" ? "A → Z" : "Z → A"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5 text-left">
                    {(["asc", "desc"] as const).map(o => (
                      <button key={o} onClick={() => { setSortOrder(o); setIsSortOpen(false); doFetch({ sort: o }); }}
                        className={`w-full px-4 py-2.5 text-[13px] text-left transition-colors font-medium ${o === sortOrder ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        {o === "asc" ? "A → Z (Ascending)" : "Z → A (Descending)"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left border-b border-border/50">
          <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-700 dark:text-slate-200">
              {isLoading ? "…" : `${Math.min((currentPage - 1) * PAGE_SIZE + 1, total)}–${Math.min(currentPage * PAGE_SIZE, total)}`}
            </span> of <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span> classes
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Search classes..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full sm:w-64 focus:border-primary/50 transition-colors shadow-sm bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)]" />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[14px] font-medium">Loading classes...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <p className="text-[14px] font-medium">{error}</p>
            <button onClick={() => doFetch()} className="px-4 py-2 text-[13px] font-bold bg-primary hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors">Retry</button>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <BookOpen className="w-10 h-10 opacity-30" />
            <p className="text-[14px] font-medium">No classes found</p>
            {isAdmin && <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="px-4 py-2 text-[13px] font-bold bg-primary hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors">Add First Class</button>}
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={classes}
              selectionHeader={<input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
              renderSelection={() => <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
            />
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span></p>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(p); return acc;
                    }, [])
                    .map((p, i) => p === "..." ? (
                      <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                    ) : (
                      <button key={p} onClick={() => handlePageChange(p as number)}
                        className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-colors ${p === currentPage ? "bg-primary text-white shadow-sm" : "border border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                        {p}
                      </button>
                    ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Add Class">
        <form onSubmit={handleAddSubmit} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Class Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">Select Class</option>
                  {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Class Code <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input type="text" value={formClassCode} onChange={(e) => setFormClassCode(e.target.value)}
                placeholder="e.g. CLS-11"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900 uppercase" />
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

          {(formName === "Class 11" || formName === "Class 12") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Streams <span className="text-red-500">*</span> <span className="text-slate-400 text-[11px]">(select one or more)</span></label>
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
                <select value={formAcademicYear} onChange={(e) => setFormAcademicYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">Select Year</option>
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Capacity</label>
              <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} min={1} max={200}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Status <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFormStatus(formStatus === "Active" ? "Inactive" : "Active")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${formStatus === "Active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${formStatus === "Active" ? "translate-x-6" : "translate-x-1"
                    }`} />
                </button>
                <span className={`text-[13px] font-semibold ${formStatus === "Active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                  }`}>{formStatus}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Add Class
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); resetForm(); }} title="Edit Class">
        <form onSubmit={handleEditSubmit} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}
          <div className={`grid grid-cols-1 ${enableSections ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Class Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">Select Class</option>
                  {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Class Code <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input type="text" value={formClassCode} onChange={(e) => setFormClassCode(e.target.value)}
                placeholder="e.g. CLS-11"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900 uppercase" />
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

          {(formName === "Class 11" || formName === "Class 12") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Stream <span className="text-red-500">*</span></label>
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
                <select value={formAcademicYear} onChange={(e) => setFormAcademicYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">Select Year</option>
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Status <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFormStatus(formStatus === "Active" ? "Inactive" : "Active")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${formStatus === "Active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${formStatus === "Active" ? "translate-x-6" : "translate-x-1"
                    }`} />
                </button>
                <span className={`text-[13px] font-semibold ${formStatus === "Active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                  }`}>{formStatus}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Capacity</label>
              <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} min={1} max={200}
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
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsEditOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Class">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to delete <span className="font-bold text-foreground dark:text-white">{selectedClass?.name}{selectedClass?.section ? ` - ${selectedClass.section}` : ""}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
