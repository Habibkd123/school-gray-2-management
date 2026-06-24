"use client";

import React, { useState, useMemo, useRef } from "react";
import { useParents, ApiParent } from "../../hooks/useParents";
import { useClasses } from "../../hooks/useClasses";
import { useUpload } from "../../hooks/useUpload";
import { Modal } from "../../components/ui/modal";
import { useRouter } from "next/navigation";
import {
  Search, Filter, ChevronDown, RefreshCw, Printer, Download,
  FileText, Plus, MoreVertical, Edit, Trash2, Loader2,
  LayoutGrid, List, ArrowUpDown, Calendar, Mail, Phone, Users,
  ImageIcon, X
} from "lucide-react";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";

// ─── Helpers ──────────────────────────────────────────────────────────────
function getAvatar(name: string, photo_url?: string) {
  if (photo_url) return photo_url;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=5D6BEE&color=fff&bold=true`;
}

function formatDate(d?: string | Date) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Date range presets ───────────────────────────────────────────────────
const DATE_RANGES = ["All Time", "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "This Year", "Custom Range"] as const;

function getDateRangeDates(range: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (range) {
    case "All Time": return { from: null, to: null };
    case "Today": from.setHours(0, 0, 0, 0); break;
    case "Yesterday":
      from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1); to.setHours(23, 59, 59, 999);
      break;
    case "Last 7 Days": from.setDate(from.getDate() - 7); break;
    case "Last 30 Days": from.setDate(from.getDate() - 30); break;
    case "This Month": from.setDate(1); from.setHours(0, 0, 0, 0); break;
    case "This Year": from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
    default: from.setDate(from.getDate() - 7);
  }
  return { from, to };
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function GuardiansPage() {
  const { parents, isLoading, fetchParents, createParent, updateParent, deleteParent } = useParents();
  const { uploadFile } = useUpload();
  const { classes } = useClasses();
  const router = useRouter();

  const getClassName = (s: any) => {
    if (typeof s.class_id === "object" && s.class_id !== null) {
      const name = s.class_id?.name || "";
      const section = s.class_id?.section || "";
      return name ? `${name} ${section}`.trim() : "—";
    }
    const cls = classes.find((c) => c._id === s.class_id);
    return cls ? `${cls.name} ${cls.section}` : "—";
  };

  // ── UI State ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState("Ascending");

  // Date range
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
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

  const dateRangeLabel = (activeFrom && activeTo && !isCustom)
    ? `${formatDate(activeFrom)} — ${formatDate(activeTo)}`
    : selectedRange;

  // Filter & Sort
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterParent, setFilterParent] = useState("");
  const [filterChild, setFilterChild] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editParent, setEditParent] = useState<ApiParent | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhoto, setFormPhoto] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file);
      if (url) setFormPhoto(url);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openAdd = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormPhoto("");
    setIsAddOpen(true);
  };

  const openEdit = (p: ApiParent) => {
    setEditParent(p);
    setFormName(p.name);
    setFormPhone(p.phone || "");
    setFormEmail(p.email || "");
    setFormPhoto(p.photo_url || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createParent({
        name: formName,
        phone: formPhone,
        email: formEmail,
        photo_url: formPhoto,
      });
      setIsAddOpen(false);
      fetchParents(); // refresh
    } catch (err) {
      console.error("Failed to add parent", err);
      alert("Failed to add parent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParent) return;
    setIsSaving(true);
    try {
      await updateParent(editParent._id, {
        name: formName,
        phone: formPhone,
        email: formEmail,
        photo_url: formPhoto,
      });
      setEditParent(null);
      fetchParents(); // refresh
    } catch (err) {
      console.error("Failed to update parent", err);
      alert("Failed to update parent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this parent?")) return;
    try {
      await deleteParent(id);
      setActiveDropdown(null);
    } catch (err) {
      console.error("Failed to delete parent", err);
      alert("Failed to delete parent");
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = parents.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p._id.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.children && p.children.some((c) => c.name.toLowerCase().includes(q)));
      const matchParent = !filterParent || p.name.toLowerCase().includes(filterParent.toLowerCase());
      const matchChild = !filterChild || (p.children && p.children.some((c) => c.name.toLowerCase().includes(filterChild.toLowerCase())));
      
      let matchDate = true;
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        if (activeFrom) {
          matchDate = matchDate && d >= activeFrom;
        }
        if (activeTo) {
          matchDate = matchDate && d <= activeTo;
        }
      }

      let matchStatus = true;
      if (filterStatus === "active") {
        matchStatus = p.is_active === true;
      } else if (filterStatus === "inactive") {
        matchStatus = p.is_active === false;
      }

      return matchSearch && matchParent && matchChild && matchDate && matchStatus;
    });
    if (selectedSort === "Descending") list = [...list].reverse();
    return list;
  }, [parents, search, filterParent, filterChild, filterStatus, activeFrom, activeTo, selectedSort]);

  // ── Pagination ─────────────────────────────────────────
  const PAGE_SIZE = 10;
  const listPag = usePagination(filtered, PAGE_SIZE);
  const gridPag = usePagination(filtered, PAGE_SIZE);

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#F59E0B]" />
          <span className="text-[14px] font-medium">Loading parents...</span>
        </div>
      </div>
    );
  }

  // ── Shared status badge ───────────────────────────────────────────────
  const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold
      ${active ? "bg-[#E8F8E8] text-[#1D7F2C]" : "bg-[#FFEBF0] text-[#FF4A6B]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#1DD04A]" : "bg-[#FF4A6B]"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );

  // ── Toolbar dropdown trigger style ────────────────────────────────────
  const triggerCls = (open: boolean) =>
    `flex items-center gap-2 px-3 py-2 border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors
     ${open
      ? "border-[#F59E0B] text-[#F59E0B]"
      : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  return (
    <div
      className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6"
      onClick={() => setActiveDropdown(null)}
    >
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Parents</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span>People</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Parents</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchParents} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
            <Printer className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
            <Download className="w-4 h-4" />
            <span>Export</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Card ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
            Parents List
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* ── Date Range ── */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsDateRangeOpen(!isDateRangeOpen)} className={triggerCls(isDateRangeOpen)}>
                <Calendar className="w-4 h-4" />
                <span className="max-w-full sm:w-[120px] truncate">{dateRangeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDateRangeOpen ? "rotate-180" : ""}`} />
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1">
                    {DATE_RANGES.map((range) => (
                      <button key={range} onClick={() => applyDateRange(range)}
                        className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                          ${selectedRange === range ? "bg-[#FFF3CD] dark:bg-amber-900/20 text-[#92400E] dark:text-amber-500 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                        {range}
                      </button>
                    ))}
                    {isCustom && (
                      <div className="px-4 py-3 border-t border-border bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="space-y-2">
                          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                            className="w-full text-[12px] px-2 py-1.5 border border-border rounded outline-none bg-white dark:bg-slate-900" />
                          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                            className="w-full text-[12px] px-2 py-1.5 border border-border rounded outline-none bg-white dark:bg-slate-900" />
                          <button onClick={applyCustomRange} disabled={!customFrom || !customTo}
                            className="w-full py-1.5 mt-1 text-[12px] font-bold text-white bg-[#F59E0B] hover:bg-[#D97706] rounded transition-colors disabled:opacity-50">
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                    {(activeFrom || activeTo) && !isCustom && (
                      <div className="px-4 pt-2 pb-1 border-t border-border mt-1">
                        <button onClick={() => { setActiveFrom(null); setActiveTo(null); setSelectedRange("All Time"); setIsDateRangeOpen(false); }}
                          className="w-full text-[12px] font-semibold text-rose-500 hover:text-rose-600 transition-colors">
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
                <Filter className="w-4 h-4" />
                <span className="whitespace-nowrap">Filter</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-full sm:w-[380px] bg-white dark:bg-slate-900 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border z-50 overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Filter</h3>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Parent Name</label>
                        <input value={filterParent} onChange={e => setFilterParent(e.target.value)} placeholder="Search..."
                          className="w-full px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 border border-border rounded-lg outline-none appearance-none bg-white dark:bg-slate-900 focus:border-[#F59E0B]/50 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Child Name</label>
                        <input value={filterChild} onChange={e => setFilterChild(e.target.value)} placeholder="Search..."
                          className="w-full px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 border border-border rounded-lg outline-none bg-white dark:bg-slate-900 focus:border-[#F59E0B]/50 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5 text-left col-span-2">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                          className="w-full px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 border border-border rounded-lg outline-none appearance-none cursor-pointer bg-white dark:bg-slate-900">
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                      <button onClick={() => { setFilterParent(""); setFilterChild(""); setFilterStatus(""); }}
                        className="px-5 py-2 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Reset
                      </button>
                      <button onClick={() => setIsFilterOpen(false)}
                        className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] transition-colors shadow-sm">
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── View Toggle ── */}
            <div className="flex items-center border border-border rounded-lg bg-white dark:bg-slate-900 p-1">
              <button onClick={() => setViewMode("list")} title="List view"
                className={`p-1 rounded transition-colors ${viewMode === "list" ? "bg-[#F59E0B] text-white" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} title="Grid view"
                className={`p-1 rounded transition-colors ${viewMode === "grid" ? "bg-[#F59E0B] text-white" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* ── Sort ── */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsSortOpen(!isSortOpen)} className={triggerCls(isSortOpen)}>
                <ArrowUpDown className="w-4 h-4" />
                <span className="whitespace-nowrap">Sort by A-Z</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Ascending", "Descending", "Recently Added"].map((item) => (
                      <button key={item} onClick={() => { setSelectedSort(item); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[14px] text-left transition-colors font-medium cursor-pointer
                          ${item === selectedSort ? "bg-[#F59E0B] text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row Per Page + Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[13px] text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>Row Per Page</span>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              10 <ChevronDown className="w-3.5 h-3.5" />
            </div>
            <span>Entries</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[250px] pl-9 pr-4 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B]/50 transition-all"
            />
          </div>
        </div>

        {/* ════════ LIST VIEW ════════ */}
        {viewMode === "list" && (
          <div className="overflow-x-auto min-h-[280px] pb-4">
            <table className="w-full text-[13px] whitespace-nowrap">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
                <tr>
                  <th className="px-4 py-4 text-left w-10">
                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4 accent-[#F59E0B]" />
                  </th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-1">ID <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                  </th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Parent Name</th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Child</th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Phone</th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Email</th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listPag.paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-[14px] font-medium">No parents found.</p>
                    </td>
                  </tr>
                ) : listPag.paged.map((parent) => {
                  const firstChild = parent.children && parent.children[0];
                  return (
                    <tr key={parent._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <input type="checkbox" className="rounded border-slate-300 w-4 h-4 accent-[#F59E0B]" />
                      </td>

                      {/* Parent ID — amber, clickable → View Details */}
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/guardians/${parent._id}`); }}
                          className="font-semibold text-[#F59E0B] hover:text-[#D97706] hover:underline transition-colors"
                        >
                          {parent._id.slice(-6).toUpperCase()}
                        </button>
                      </td>

                      {/* Parent Name */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <img src={getAvatar(parent.name, parent.photo_url)} className="w-8 h-8 rounded-full object-cover border border-border" alt="" />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{parent.name}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">Added {formatDate(parent.createdAt)}</div>
                          </div>
                        </div>
                      </td>

                      {/* First child — click → student detail */}
                      <td className="px-4 py-4">
                        {firstChild ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/students/${firstChild._id}`); }}
                            className="flex items-center gap-2 group/child"
                          >
                            <img src={getAvatar(firstChild.name)} className="w-7 h-7 rounded-full object-cover border border-border" alt="" />
                            <div className="text-left">
                              <div className="font-semibold text-slate-900 dark:text-white group-hover/child:text-[#F59E0B] transition-colors">
                                {firstChild.name}
                                {parent.children && parent.children.length > 1 && (
                                  <span className="ml-1.5 text-[11px] text-slate-400 font-normal">+{parent.children.length - 1} more</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500">{getClassName(firstChild)}</div>
                            </div>
                          </button>
                        ) : <span className="text-slate-400">—</span>}
                      </td>

                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{parent.phone || "—"}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 max-w-full sm:w-[180px] truncate">{parent.email || "—"}</td>

                      {/* Action */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === parent._id ? null : parent._id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-[#F59E0B] text-white hover:bg-[#D97706]"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeDropdown === parent._id && (
                              <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-border py-2 z-50">
                                <button onClick={() => { router.push(`/guardians/${parent._id}`); setActiveDropdown(null); }}
                                  className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                                  <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" /> View Details
                                </button>
                                <button onClick={() => { openEdit(parent); setActiveDropdown(null); }}
                                  className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                                  <Edit className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Edit
                                </button>
                                <button onClick={() => handleDelete(parent._id)} className="w-full px-4 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50 flex items-center gap-3">
                                  <Trash2 className="w-4 h-4 text-rose-400" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <PaginationBar
              currentPage={listPag.page}
              totalPages={listPag.totalPages}
              totalItems={listPag.totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={listPag.setPage}
            />
          </div>
        )}

        {/* ════════ GRID VIEW ════════ */}
        {viewMode === "grid" && (
          <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20 min-h-[400px]">
            {gridPag.paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-[14px] font-medium">No parents found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {gridPag.paged.map((parent) => (
                  <div key={parent._id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm p-5 relative group flex flex-col hover:border-[#F59E0B]/50 transition-colors">

                    {/* Card top row */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => router.push(`/guardians/${parent._id}`)}
                        className="font-bold text-[13px] text-[#F59E0B] hover:underline"
                      >
                        {parent._id.slice(-6).toUpperCase()}
                      </button>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === parent._id ? null : parent._id)}
                          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeDropdown === parent._id && (
                          <div className="absolute right-0 top-6 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-border py-2 z-50">
                            <button onClick={() => { router.push(`/guardians/${parent._id}`); setActiveDropdown(null); }}
                              className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" /> View Details
                            </button>
                            <button onClick={() => { openEdit(parent); setActiveDropdown(null); }}
                              className="w-full px-4 py-2 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                              <Edit className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Edit
                            </button>
                            <button onClick={() => handleDelete(parent._id)} className="w-full px-4 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50 flex items-center gap-3">
                              <Trash2 className="w-4 h-4 text-rose-400" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Avatar + Name */}
                    <div className="flex items-center gap-4 mb-5 cursor-pointer" onClick={() => router.push(`/guardians/${parent._id}`)}>
                      <img src={getAvatar(parent.name, parent.photo_url)} className="w-12 h-12 rounded-full object-cover shadow-sm border border-border" alt="" />
                      <div>
                        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white group-hover:text-[#F59E0B] transition-colors">{parent.name}</h3>
                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{parent.relation || "Parent"}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5 border-t border-b border-slate-100 dark:border-slate-700/50 py-4">
                      <div>
                        <p className="text-[11px] text-slate-500 mb-1">Children</p>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">{parent.children?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 mb-1">Added on</p>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">{formatDate(parent.createdAt)}</p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-1.5 mb-4 text-[12px]">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{parent.phone || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{parent.email || "—"}</span>
                      </div>
                    </div>

                    {/* Children chips — clickable → student detail */}
                    {parent.children && parent.children.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {parent.children.map((child) => (
                          <button
                            key={child._id}
                            onClick={(e) => { e.stopPropagation(); router.push(`/students/${child._id}`); }}
                            className="inline-flex items-center px-2.5 py-1 bg-[#FFF3CD] hover:bg-[#F59E0B] text-[#92400E] hover:text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                            title={`View ${child.name}'s profile`}
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <PaginationBar
              currentPage={gridPag.page}
              totalPages={gridPag.totalPages}
              totalItems={gridPag.totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={gridPag.setPage}
              className="mt-4 border-t-0"
            />
          </div>
        )}


      </div>


      {/* ══════════════════════════════════════════════
          ADD/EDIT PARENT MODAL
          ══════════════════════════════════════════════ */}
      {(isAddOpen || editParent) && (
        <Modal isOpen={true} onClose={() => { setIsAddOpen(false); setEditParent(null); }} title={editParent ? "Edit Parent" : "Add Parent"} size="md">
          <form onSubmit={editParent ? handleEditSubmit : handleAddSubmit} className="space-y-4">

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePhotoUpload(e.target.files[0]);
                }
              }}
            />

            {/* Photo upload */}
            <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
              {uploadingPhoto ? (
                <div className="w-16 h-16 rounded-lg border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center bg-white dark:bg-slate-900">
                  <Loader2 className="w-6 h-6 animate-spin text-[#F59E0B]" />
                </div>
              ) : formPhoto ? (
                <img src={formPhoto} className="w-16 h-16 rounded-lg object-cover border border-border shadow-sm" alt="Parent Photo" />
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-900">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={uploadingPhoto} onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 border border-border rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50">
                    Upload
                  </button>
                  {formPhoto && (
                    <button type="button" onClick={() => setFormPhoto("")} disabled={uploadingPhoto} className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#E2E8F0] disabled:opacity-50 transition-colors">
                      Remove
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">Max 5MB, JPG/PNG</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "Full Name", value: formName, set: setFormName, placeholder: "e.g. Robert Watson", type: "text", required: true },
                { label: "Phone Number", value: formPhone, set: setFormPhone, placeholder: "e.g. +1 (555) 123-4567", type: "tel", required: false },
                { label: "Email Address", value: formEmail, set: setFormEmail, placeholder: "e.g. parent@email.com", type: "email", required: false },
              ].map(({ label, value, set, placeholder, type, required }) => (
                <div key={label} className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</label>
                  <input required={required} type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                    className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-[#F59E0B]/50 transition-all shadow-sm" />
                </div>
              ))}

              {editParent && editParent.children && editParent.children.length > 0 && (
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Linked Children</label>
                  <div className="min-h-[44px] px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 flex flex-wrap gap-2 items-center">
                    {editParent.children.map((c) => (
                      <span key={c._id} className="inline-flex items-center px-2.5 py-1 bg-[#FFF3CD] text-[#92400E] text-[12px] font-semibold rounded">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
              <button type="button" onClick={() => { setIsAddOpen(false); setEditParent(null); }}
                className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={isSaving || uploadingPhoto}
                className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-70">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editParent ? "Save Changes" : "Add Parent"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
