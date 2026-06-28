"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, Search, List, MoreVertical, Edit, Trash2,
  Calendar, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Loader2
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { useExams } from "@/app/hooks/useExams";
import { useClasses } from "@/app/hooks/useClasses";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";
import { useAppState } from "@/app/context/store";

const DATE_RANGES = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year", "All Time", "Custom Range"] as const;

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

export default function ExamListPage() {
  const { exams, loading, createExam, updateExam, deleteExam } = useExams();
  const { classes } = useClasses();
  const { academicYear } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  
  // Date range state
  const [selectedRange, setSelectedRange] = useState("All Time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [activeFrom, setActiveFrom] = useState<Date | null>(null);
  const [activeTo, setActiveTo] = useState<Date | null>(null);

  const applyDateRange = (range: string) => {
    if (range === "Custom Range") { setIsCustom(true); return; }
    setIsCustom(false);
    const { from, to } = getDateRangeDates(range);
    setActiveFrom(from); setActiveTo(to);
    setSelectedRange(range); setIsDateRangeOpen(false);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    setActiveFrom(new Date(customFrom)); setActiveTo(new Date(customTo));
    setSelectedRange(`${customFrom} — ${customTo}`);
    setIsCustom(false); setIsDateRangeOpen(false);
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Ascending");
  
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Form states
  const [formExamName, setFormExamName] = useState("");
  const [formExamType, setFormExamType] = useState("other");
  const [formClassId, setFormClassId] = useState("");
  const [formAcademicYear, setFormAcademicYear] = useState(academicYear || "");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const openAddModal = () => {
    setFormExamName("");
    setFormExamType("other");
    setFormClassId("");
    setFormAcademicYear(academicYear);
    setFormStartDate("");
    setFormEndDate("");
    setIsAddOpen(true);
  };

  const openEditModal = (item: (typeof exams)[0]) => {
    setSelectedExamId(item._id);
    setFormExamName(item.name || "");
    setFormExamType(item.type || "other");
    setFormClassId(typeof item.class_id === "object" ? item.class_id?._id || "" : item.class_id || "");
    setFormAcademicYear(item.academic_year || "");
    setFormStartDate(item.start_date ? new Date(item.start_date).toISOString().slice(0, 10) : "");
    setFormEndDate(item.end_date ? new Date(item.end_date).toISOString().slice(0, 10) : "");
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
    await createExam({
      name: formExamName,
      type: formExamType as any,
      class_id: formClassId,
      academic_year: formAcademicYear,
      start_date: formStartDate || undefined,
      end_date: formEndDate || undefined,
    });
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
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  const dateRangeLabel = (activeFrom && activeTo && !isCustom)
    ? `${new Date(activeFrom).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} — ${new Date(activeTo).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
    : selectedRange;

  const triggerCls = (open: boolean) =>
    `flex items-center gap-2 px-3 py-2 border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors cursor-pointer
     ${open
      ? "border-primary text-primary"
      : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  const filteredData = useMemo(() => {
    let list = exams.filter(s => {
      const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (s.type || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "All"
        ? true
        : s.type === filterType;

      let matchesDate = true;
      if (activeFrom && activeTo) {
        if (s.start_date) {
          const d = new Date(s.start_date);
          matchesDate = d >= activeFrom && d <= activeTo;
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesType && matchesDate;
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
  }, [exams, searchTerm, filterType, activeFrom, activeTo, selectedSort]);

  const pag = usePagination(filteredData, 10);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/examination" className="hover:text-primary">Examination</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Exam</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => window.location.reload()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
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
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Exam
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Exam List</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* ── Date Range ── */}
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
                      <button key={range} onClick={() => applyDateRange(range)}
                        className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer
                          ${selectedRange === range ? "bg-primary/10 dark:bg-primary/20 text-[var(--primary-hover)] dark:text-primary font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
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

            {/* ── Filter ── */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={triggerCls(isFilterOpen)}>
                <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="whitespace-nowrap">Filter</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-foreground dark:text-slate-100">Filter</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam Type</label>
                        <div className="relative">
                          <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                          >
                            <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Types</option>
                            <option value="unit_test" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Unit Test</option>
                            <option value="mid_term" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mid Term</option>
                            <option value="pre_board" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pre Board</option>
                            <option value="annual" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Annual</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 bg-white dark:bg-slate-900 rounded-b-lg border-t border-border mt-2">
                      <button onClick={() => { setFilterType("All"); setIsFilterOpen(false); }} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg transition-colors cursor-pointer">Reset</button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer">Apply</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Sort by ── */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsSortOpen(!isSortOpen)} className={triggerCls(isSortOpen)}>
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
                        className={`w-full px-4 py-2.5 text-[14px] hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors font-medium cursor-pointer ${item === selectedSort ? "text-primary font-bold" : "text-slate-700 dark:text-slate-200"}`}
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

        {/* Controls Section */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
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
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className={`overflow-x-auto ${actionMenuId ? 'pb-28' : ''}`}>
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-12">
                  <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Exam Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Type</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Academic Year</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Start Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">End Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-slate-500 dark:text-slate-400 mt-3 text-[13px]">Loading exams...</p>
                  </td>
                </tr>
              ) : pag.paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 text-[13px]">
                    No exams found. Click &quot;Add Exam&quot; to create one.
                  </td>
                </tr>
              ) : pag.paged.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                    {typeof item.class_id === "object"
                      ? `${item.class_id?.name || ""} - ${item.class_id?.section || ""}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 capitalize">
                      {item.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.academic_year}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{formatDate(item.start_date)}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{formatDate(item.end_date)}</td>
                  <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setActionMenuId(actionMenuId === item._id ? null : item._id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === item._id ? "bg-primary text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuId === item._id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                        <div className="absolute right-10 top-10 w-36 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                          <button onClick={() => openEditModal(item)} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                            <Edit className="w-4 h-4 text-foreground dark:text-slate-100" /> Edit
                          </button>
                          <button onClick={() => openDeleteModal(item._id)} className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
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

      {/* Add / Edit Modals */}
      <Modal isOpen={isAddOpen || isEditOpen} onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} title={isAddOpen ? "Add Exam" : "Edit Exam"}>
        <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-5 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam Name</label>
            <input 
              type="text"
              value={formExamName}
              onChange={(e) => setFormExamName(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
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
                  <option key={cls._id} value={cls._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {cls.name} - {cls.section}
                  </option>
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
              placeholder="2026"
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
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">End Date</label>
              <input 
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button 
              type="button" 
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
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
              {isAddOpen ? "Add Exam" : "Save Changes"}
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

    </div>
  );
}
