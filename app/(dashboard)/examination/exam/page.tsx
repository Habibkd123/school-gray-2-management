"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, Search, List, MoreVertical, Edit, Trash2,
  Calendar, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Loader2, Eye, CalendarRange, PenTool
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { useExams } from "@/app/hooks/useExams";
import { useClasses } from "@/app/hooks/useClasses";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";
import { useAppState } from "@/app/context/store";
import { GenerateDocumentWizard } from "@/app/components/document-builder/GenerateDocumentWizard";

export default function ExamListPage() {
  const router = useRouter();
  const { exams, loading, createExam, updateExam, deleteExam } = useExams();
  const { classes } = useClasses();
  const { academicYear } = useAppState();

  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleClose = () => {
      setActionMenuId(null);
      setMenuAnchorRect(null);
      setActiveExam(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (actionMenuId) {
      window.addEventListener("scroll", handleClose, true);
      window.addEventListener("resize", handleClose);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionMenuId]);

  const dropdownStyles = useMemo(() => {
    if (!menuAnchorRect) return {};
    const spaceBelow = window.innerHeight - menuAnchorRect.bottom;
    const dropdownHeight = 180; 
    const margin = 4;
    const left = menuAnchorRect.right - 176 + window.scrollX;
    
    if (spaceBelow < dropdownHeight && menuAnchorRect.top > dropdownHeight) {
      const top = menuAnchorRect.top - dropdownHeight - margin + window.scrollY;
      return { position: "absolute" as const, top: `${top}px`, left: `${left}px`, width: "176px" };
    } else {
      const top = menuAnchorRect.bottom + margin + window.scrollY;
      return { position: "absolute" as const, top: `${top}px`, left: `${left}px`, width: "176px" };
    }
  }, [menuAnchorRect]);

  const handleTriggerClick = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (actionMenuId === item._id) {
      setActionMenuId(null);
      setMenuAnchorRect(null);
      setActiveExam(null);
    } else {
      setActionMenuId(item._id);
      setMenuAnchorRect(e.currentTarget.getBoundingClientRect());
      setActiveExam(item);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generate Document Wizard
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateExamId, setGenerateExamId] = useState<string | null>(null);
  const [generateExamLabel, setGenerateExamLabel] = useState("");
  
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Recently Added");
  
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [viewingExam, setViewingExam] = useState<any>(null);

  // Form states
  const [formExamName, setFormExamName] = useState("");
  const [formExamType, setFormExamType] = useState("other");
  const [formClassId, setFormClassId] = useState("");
  const [formClassIds, setFormClassIds] = useState<string[]>([]);
  const [formAcademicYear, setFormAcademicYear] = useState(academicYear || "");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"upcoming" | "ongoing" | "completed">("upcoming");

  const openAddModal = () => {
    setFormExamName("");
    setFormExamType("other");
    setFormClassId("");
    setFormClassIds([]);
    setFormAcademicYear(academicYear);
    setFormStartDate("");
    setFormEndDate("");
    setFormDescription("");
    setFormStatus("upcoming");
    setIsAddOpen(true);
  };

  const openViewModal = (item: any) => {
    setViewingExam(item);
    setIsViewOpen(true);
    setActionMenuId(null);
  };

  const openEditModal = (item: any) => {
    setSelectedExamId(item._id);
    setFormExamName(item.name || "");
    setFormExamType(item.type || "other");
    setFormClassId(typeof item.class_id === "object" ? item.class_id?._id || "" : item.class_id || "");
    setFormAcademicYear(item.academic_year || "");
    setFormStartDate(item.start_date ? new Date(item.start_date).toISOString().slice(0, 10) : "");
    setFormEndDate(item.end_date ? new Date(item.end_date).toISOString().slice(0, 10) : "");
    setFormDescription(item.description || "");
    setFormStatus(item.status || "upcoming");
    setIsEditOpen(true);
    setActionMenuId(null);
  };

  const openDeleteModal = (id: string) => {
    setSelectedExamId(id);
    setIsDeleteOpen(true);
    setActionMenuId(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Send formClassIds if multi-select is used
    await createExam({
      name: formExamName,
      type: formExamType as any,
      class_id: formClassIds.length > 0 ? formClassIds[0] : undefined,
      class_ids: formClassIds as any,
      academic_year: formAcademicYear,
      start_date: formStartDate || undefined,
      end_date: formEndDate || undefined,
      description: formDescription,
      status: formStatus
    } as any);
    setSaving(false);
    setIsAddOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;
    setSaving(true);
    await updateExam(selectedExamId, {
      name: formExamName,
      type: formExamType as any,
      class_id: formClassId,
      academic_year: formAcademicYear,
      start_date: formStartDate || undefined,
      end_date: formEndDate || undefined,
      description: formDescription,
      status: formStatus
    });
    setSaving(false);
    setIsEditOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExamId) return;
    await deleteExam(selectedExamId);
    setIsDeleteOpen(false);
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try { 
      return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); 
    } catch { 
      return d; 
    }
  };

  const calculateStatus = (item: any): "upcoming" | "ongoing" | "completed" => {
    if (item.status) return item.status;
    const now = new Date();
    now.setHours(0,0,0,0);
    const start = item.start_date ? new Date(item.start_date) : null;
    const end = item.end_date ? new Date(item.end_date) : null;
    if (start && start > now) return "upcoming";
    if (end && end < now) return "completed";
    return "ongoing";
  };

  const getStatusBadge = (status: "upcoming" | "ongoing" | "completed") => {
    switch (status) {
      case "upcoming":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Upcoming
          </span>
        );
      case "ongoing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Ongoing
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed
          </span>
        );
    }
  };

  const filteredData = useMemo(() => {
    let list = exams.filter(s => {
      const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (s.type || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const sClassId = s.class_id ? (typeof s.class_id === "object" ? s.class_id?._id : s.class_id) : "";
      const matchesClass = selectedClassFilter === "All" || sClassId === selectedClassFilter;

      const currentStatus = calculateStatus(s);
      const matchesStatus = selectedStatusFilter === "All" || currentStatus === selectedStatusFilter;

      return matchesSearch && matchesClass && matchesStatus;
    });

    if (selectedSort === "Ascending") {
      list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (selectedSort === "Descending") {
      list = [...list].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    } else if (selectedSort === "Recently Added") {
      list = [...list].sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
    }

    return list;
  }, [exams, searchTerm, selectedClassFilter, selectedStatusFilter, selectedSort]);

  const pag = usePagination(filteredData, 10);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Exam List</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/examination" className="hover:text-primary">Examination</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Exam</span>
          </div>
        </div>        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => window.location.reload()} className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-550 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={openAddModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Exam
          </button>

          {/* Generate Report Cards button */}
          <button
            onClick={() => { setGenerateExamId(null); setGenerateExamLabel(""); setIsGenerateOpen(true); }}
            className="btn flex items-center gap-2 text-white"
            style={{ background: "linear-gradient(90deg, #4338ca, #7c3aed)" }}
          >
            <FileText className="w-4 h-4" /> Generate Report Cards
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Exam List Overview</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Class:</span>
              <select 
                value={selectedClassFilter} 
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
              >
                <option value="All">All Classes</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>{cls.name} - {cls.section}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Status:</span>
              <select 
                value={selectedStatusFilter} 
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-50">
                <List className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Sort: {selectedSort}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Ascending", "Descending", "Recently Added"].map((item) => (
                      <button 
                        key={item} 
                        onClick={() => { setSelectedSort(item); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors font-medium cursor-pointer ${item === selectedSort ? "text-primary font-bold" : "text-slate-700 dark:text-slate-200"}`}
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

        {/* Search and Counts Section */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="card-subtitle flex items-center gap-2 text-[13px]">
            <span>Total</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{filteredData.length}</span>
            <span>Exams</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search exams..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Table */}
        <div className={`custom-page-table-wrap overflow-x-auto ${actionMenuId ? 'pb-28' : ''}`}>
          <table className="custom-page-table">
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Type</th>
                <th>Academic Year</th>
                <th>Class</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th className="w-20 col-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="table-loading">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-slate-500 dark:text-slate-400 mt-3 text-[13px]">Loading exams...</p>
                  </td>
                </tr>
              ) : pag.paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    No exams found. Click &quot;Add Exam&quot; to create one.
                  </td>
                </tr>
              ) : pag.paged.map((item) => {
                const currentStatus = calculateStatus(item);
                return (
                  <tr key={item._id}>
                    <td className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</td>
                    <td className="text-slate-605 dark:text-slate-300 font-medium capitalize">
                      {item.type.replace("_", " ")}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{item.academic_year}</td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {typeof item.class_id === "object"
                        ? `${item.class_id?.name || ""} - ${item.class_id?.section || ""}`
                        : "—"}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{formatDate(item.start_date)}</td>
                    <td className="text-slate-600 dark:text-slate-300">{formatDate(item.end_date)}</td>
                    <td>{getStatusBadge(currentStatus)}</td>
                    <td className="col-center relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleTriggerClick(e, item)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === item._id ? "bg-primary text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <PaginationBar
          currentPage={pag.page}
          totalPages={pag.totalPages}
          totalItems={pag.totalItems}
          pageSize={pag.pageSize}
          onPageChange={pag.setPage}
        />
      </div>

      {/* View Exam Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Exam Details">
        {viewingExam && (
          <div className="p-6 space-y-4 text-left text-[14px]">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Exam Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{viewingExam.name}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Exam Type</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 capitalize">{viewingExam.type?.replace("_", " ")}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Class</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {typeof viewingExam.class_id === "object"
                    ? `${viewingExam.class_id?.name || ""} - ${viewingExam.class_id?.section || ""}`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Academic Year</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{viewingExam.academic_year}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Start Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(viewingExam.start_date)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase">End Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(viewingExam.end_date)}</span>
              </div>
            </div>
            <div className="pb-4 border-b border-border">
              <span className="block text-[11px] font-bold text-slate-400 uppercase">Status</span>
              <span className="inline-block mt-1">{getStatusBadge(calculateStatus(viewingExam))}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase">Description</span>
              <p className="text-slate-600 dark:text-slate-350 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-border">
                {viewingExam.description || "No description provided."}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsViewOpen(false)}
                className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Exam Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Exam">
        <form onSubmit={handleAddSubmit} className="p-6 space-y-5 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam Name</label>
            <input 
              type="text"
              value={formExamName}
              onChange={(e) => setFormExamName(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-750 dark:text-slate-200"
              required
              placeholder="e.g. Mid Term Exam"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam Type</label>
            <div className="relative">
              <select 
                value={formExamType}
                onChange={(e) => setFormExamType(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="unit_test">Unit Test</option>
                <option value="mid_term">Mid Term</option>
                <option value="pre_board">Pre Board</option>
                <option value="annual">Annual</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Academic Year</label>
            <input 
              type="text"
              value={formAcademicYear}
              onChange={(e) => setFormAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
              required
              placeholder="2026"
            />
          </div>

          {/* Applicable Classes checkboxes (Multi-Class Selection) */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Applicable Classes</label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-border p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
              {classes.map((cls) => (
                <label key={cls._id} className="flex items-center gap-2 text-[13px] text-slate-750 dark:text-slate-350 cursor-pointer hover:text-primary">
                  <input
                    type="checkbox"
                    checked={formClassIds.includes(cls._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormClassIds([...formClassIds, cls._id]);
                      } else {
                        setFormClassIds(formClassIds.filter(id => id !== cls._id));
                      }
                    }}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>{cls.name} - {cls.section}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">Selecting multiple classes will generate a separate exam record for each class.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Start Date</label>
              <input 
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">End Date</label>
              <input 
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Status</label>
            <div className="relative">
              <select 
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Description (Optional)</label>
            <textarea 
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              placeholder="Enter exam description..."
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button 
              type="button" 
              onClick={() => setIsAddOpen(false)}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving || formClassIds.length === 0}
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Exam
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Exam Modal */}
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); }} title="Edit Exam">
        <form onSubmit={handleEditSubmit} className="p-6 space-y-5 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam Name</label>
            <input 
              type="text"
              value={formExamName}
              onChange={(e) => setFormExamName(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-755 dark:text-slate-200"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam Type</label>
            <div className="relative">
              <select 
                value={formExamType}
                onChange={(e) => setFormExamType(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="unit_test">Unit Test</option>
                <option value="mid_term">Mid Term</option>
                <option value="pre_board">Pre Board</option>
                <option value="annual">Annual</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
            <div className="relative">
              <select 
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>{cls.name} - {cls.section}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Academic Year</label>
            <input 
              type="text"
              value={formAcademicYear}
              onChange={(e) => setFormAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Start Date</label>
              <input 
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">End Date</label>
              <input 
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Status</label>
            <div className="relative">
              <select 
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Description (Optional)</label>
            <textarea 
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button 
              type="button" 
              onClick={() => { setIsEditOpen(false); }}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-[70] overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-slate-100 mb-3">Confirm Deletion</h2>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              Are you sure you want to delete this exam? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsDeleteOpen(false)}
                className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-6 py-2.5 bg-rose-500 text-white text-[14px] font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/20 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* RENDERED POPUP PORTAL TO ESCAPE OVERFLOW CLIPPING */}
      {isMounted && actionMenuId && activeExam && (
        createPortal(
          <>
            <div className="fixed inset-0 z-[90] bg-transparent" onClick={() => { setActionMenuId(null); setMenuAnchorRect(null); setActiveExam(null); }} />
            <div 
              style={dropdownStyles}
              className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-[100] overflow-hidden py-1.5 text-left animate-in fade-in duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { openViewModal(activeExam); setActionMenuId(null); }} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                <Eye className="w-4 h-4 text-slate-500" /> View Details
              </button>
              <button onClick={() => { openEditModal(activeExam); setActionMenuId(null); }} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                <Edit className="w-4 h-4 text-slate-500" /> Edit
              </button>
              <button onClick={() => { router.push(`/examination/exam-schedule?exam_id=${activeExam._id}`); setActionMenuId(null); }} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                <CalendarRange className="w-4 h-4 text-slate-500" /> Schedule
              </button>
              <button onClick={() => { router.push(`/examination/marks-entry?exam_id=${activeExam._id}`); setActionMenuId(null); }} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                <PenTool className="w-4 h-4 text-slate-500" /> Marks Entry
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => {
                  const cls = typeof activeExam.class_id === "object" ? activeExam.class_id : null;
                  const label = `${activeExam.name}${cls ? ` (${cls.name}${cls.section ? `-${cls.section}` : ""})` : ""}`;
                  setGenerateExamId(activeExam._id);
                  setGenerateExamLabel(label);
                  setIsGenerateOpen(true);
                  setActionMenuId(null);
                }}
                className="w-full px-4 py-2 text-[13px] text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-2 font-medium transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-indigo-500" /> Generate Report Cards
              </button>
              <div className="h-px bg-border my-1" />
              <button onClick={() => { openDeleteModal(activeExam._id); setActionMenuId(null); }} className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                <Trash2 className="w-4 h-4 text-rose-600" /> Delete
              </button>
            </div>
          </>,
          document.body
        )
      )}

      {/* Generate Document Wizard */}
      <GenerateDocumentWizard
        open={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        defaultModule="exam"
        defaultReferenceId={generateExamId || undefined}
        defaultReferenceLabel={generateExamLabel || undefined}
      />

    </div>
  );
}
