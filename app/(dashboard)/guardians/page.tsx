"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParents, ApiParent } from "../../hooks/useParents";
import { useUpload } from "../../hooks/useUpload";
import { useAppState } from "@/app/context/store";
import { Modal } from "../../components/ui/modal";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  Search, Filter, ChevronDown, RefreshCw, Printer, Download,
  FileText, Plus, MoreVertical, Edit, Trash2, Loader2,
  Calendar, Mail, Phone, Users, ImageIcon, X, CheckSquare,
  ShieldAlert, UserCheck, AlertCircle
} from "lucide-react";
import { PaginationBar } from "@/app/components/ui/pagination-bar";

function getAvatar(name: string, photo_url?: string) {
  if (photo_url) return photo_url;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=E11D48&color=fff&bold=true`;
}

function formatDate(d?: string | Date) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GuardiansPage() {
  const { user } = useAuth();
  const activeRole = user?.role;
  const { academicYear } = useAppState();
  const { uploadFile } = useUpload();
  const router = useRouter();

  // State parameters for pagination & filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [guardianTypeFilter, setGuardianTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    parents,
    totalParents,
    isLoading,
    fetchParents,
    createParent,
    updateParent,
    deleteParent
  } = useParents({ skip: true }); // skip default effect to fetch manually with dependencies

  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  useEffect(() => {
    if (!isLoading && isInitialLoad) setIsInitialLoad(false);
  }, [isLoading]);

  // Dynamic filters state
  const [filterOptions, setFilterOptions] = useState<{
    academicYears: string[];
    classes: { _id: string; name: string; section: string }[];
    sections: string[];
    students: { _id: string; name: string }[];
    guardianTypes: string[];
  } | null>(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Fetch filter options on mount
  useEffect(() => {
    if (activeRole === "parent" || activeRole === "student") return;
    const loadFilterOptions = async () => {
      try {
        const res = await fetch("/api/parents/filters", {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          setFilterOptions(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch parent filters", err);
      }
    };
    loadFilterOptions();
  }, [activeRole]);

  // Fetch parent list with complete dependency array
  useEffect(() => {
    if (activeRole === "parent" || activeRole === "student") return;
    fetchParents({
      page,
      limit,
      search,
      academic_year: academicYearFilter === "all" ? undefined : academicYearFilter,
      class_id: classFilter === "all" ? undefined : classFilter,
      section: sectionFilter === "all" ? undefined : sectionFilter,
      student_id: studentFilter === "all" ? undefined : studentFilter,
      guardian_type: guardianTypeFilter === "all" ? undefined : guardianTypeFilter,
      status: statusFilter === "all" ? undefined : statusFilter
    });
  }, [
    fetchParents,
    page,
    limit,
    search,
    academicYearFilter,
    classFilter,
    sectionFilter,
    studentFilter,
    guardianTypeFilter,
    statusFilter,
    activeRole
  ]);

  // Add / Edit Forms
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editParent, setEditParent] = useState<ApiParent | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhoto, setFormPhoto] = useState("");
  const [formRelation, setFormRelation] = useState("");
  const [formOccupation, setFormOccupation] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phone input validation error
  const [phoneError, setPhoneError] = useState("");

  const handlePhoneChange = (value: string) => {
    setFormPhone(value);
    if (value && !/^\d{10}$/.test(value)) {
      setPhoneError("Phone number must be exactly 10 digits");
    } else {
      setPhoneError("");
    }
  };

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
    setFormRelation("");
    setFormOccupation("");
    setFormAddress("");
    setPhoneError("");
    setIsAddOpen(true);
  };

  const openEdit = (p: ApiParent) => {
    setEditParent(p);
    setFormName(p.name);
    setFormPhone(p.phone || "");
    setFormEmail(p.email || "");
    setFormPhoto(p.photo_url || "");
    setFormRelation(p.relation || "");
    setFormOccupation(p.occupation || "");
    setFormAddress(p.address || "");
    setPhoneError("");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneError) return;
    setIsSaving(true);
    try {
      await createParent({
        name: formName,
        phone: formPhone,
        email: formEmail,
        photo_url: formPhoto,
        relation: formRelation,
        occupation: formOccupation,
        address: formAddress
      });
      setIsAddOpen(false);
      // refresh list
      setPage(1);
      fetchParents({ page: 1, limit });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create parent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParent || phoneError) return;
    setIsSaving(true);
    try {
      await updateParent(editParent._id, {
        name: formName,
        phone: formPhone,
        email: formEmail,
        photo_url: formPhoto,
        relation: formRelation,
        occupation: formOccupation,
        address: formAddress
      });
      setEditParent(null);
      // refresh list
      fetchParents({ page, limit });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update parent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this parent?")) return;
    try {
      await deleteParent(id);
      setActiveDropdown(null);
      fetchParents({ page, limit });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete parent");
    }
  };

  const handleExport = () => {
    if (parents.length === 0) {
      alert("No parent records available to export.");
      return;
    }

    const headers = ["Parent ID", "Name", "Email", "Phone", "Guardian Type", "Children", "Date Created"];
    const rows = parents.map(p => [
      p._id.slice(-6).toUpperCase(),
      p.name,
      p.email || "",
      p.phone || "",
      p.relation || "",
      (p.children || []).map(c => c.name).join("; "),
      p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB") : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `parents_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setAcademicYearFilter("all");
    setClassFilter("all");
    setSectionFilter("all");
    setStudentFilter("all");
    setGuardianTypeFilter("all");
    setStatusFilter("all");
    setSearch("");
    setPage(1);
  };

  // Restrict access for parents/students to maintain strict boundary
  if (activeRole === "parent" || activeRole === "student") {
    return (
      <div className="flex items-center justify-center min-h-[450px] p-6 text-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md shadow-xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            You do not have access to view the parent directory.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6" onClick={() => setActiveDropdown(null)}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Guardians & Parents</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Parents</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchParents({ page, limit })}
            className="btn btn-outline p-2 w-9 h-9"
            title="Reload List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="btn btn-outline"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={openAdd}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Add Parent</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
            Parents Directory
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dynamic Filter Toggle */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`btn btn-outline flex items-center gap-2 ${isFilterOpen ? "border-primary text-primary" : ""}`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-full sm:w-[420px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden text-left">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h4 className="text-[14px] font-bold text-slate-900 dark:text-white">Dynamic Filters</h4>
                      <button onClick={resetFilters} className="text-[11px] text-primary hover:underline font-bold cursor-pointer">
                        Clear All
                      </button>
                    </div>

                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto">
                      {/* Academic Year */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase text-slate-400">Academic Year</label>
                        <select
                          value={academicYearFilter}
                          onChange={(e) => { setAcademicYearFilter(e.target.value); setPage(1); }}
                          className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[13px] bg-white dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="all">All Academic Years</option>
                          {filterOptions?.academicYears.map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>

                      {/* Guardian Type */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase text-slate-400">Guardian Type</label>
                        <select
                          value={guardianTypeFilter}
                          onChange={(e) => { setGuardianTypeFilter(e.target.value); setPage(1); }}
                          className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[13px] bg-white dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="all">All Types</option>
                          {filterOptions?.guardianTypes.map(gt => (
                            <option key={gt} value={gt}>{gt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Class */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase text-slate-400">Class</label>
                        <select
                          value={classFilter}
                          onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
                          className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[13px] bg-white dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="all">All Classes</option>
                          {filterOptions?.classes.map(c => (
                            <option key={c._id} value={c._id}>{c.name} {c.section}</option>
                          ))}
                        </select>
                      </div>

                      {/* Section */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase text-slate-400">Section</label>
                        <select
                          value={sectionFilter}
                          onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
                          className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[13px] bg-white dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="all">All Sections</option>
                          {filterOptions?.sections.map(sec => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))}
                        </select>
                      </div>

                      {/* Student */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] font-semibold uppercase text-slate-400">Linked Student</label>
                        <select
                          value={studentFilter}
                          onChange={(e) => { setStudentFilter(e.target.value); setPage(1); }}
                          className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[13px] bg-white dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="all">All Students</option>
                          {filterOptions?.students.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[11px] font-semibold uppercase text-slate-400">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                          className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[13px] bg-white dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="all">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end bg-slate-50/50 dark:bg-slate-800/30">
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Search Input (Comprehensive support Part 4) */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Parent, Student..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full sm:w-[260px] pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-850 rounded-lg text-[13px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none focus:border-primary/50 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Rows per page */}
        <div className="card-subtitle px-4 py-3 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-4 text-[13px]">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="px-2.5 py-1 border border-slate-200 dark:border-slate-850 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 outline-none"
            >
              {[10, 25, 50, 100].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
            <span>entries</span>
          </div>
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalParents)} of {totalParents} records
          </div>
        </div>

        {/* Dynamic Table Layout (Part 2) */}
        <div className={`erp-table-wrap overflow-x-auto min-h-[300px] relative transition-opacity duration-200 ${isLoading && !isInitialLoad ? "opacity-60 pointer-events-none" : ""}`}>
          {isLoading && !isInitialLoad && (
            <div className="absolute top-2 right-4 z-10 flex items-center gap-2 text-[12px] font-medium text-slate-500 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-md border border-border shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Syncing...</span>
            </div>
          )}
          {parents.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-rose-500" />
              <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">No parent records found</p>
              <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">Try resetting filter parameters or searches.</p>
            </div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Parent Name</th>
                  <th>Guardian Type</th>
                  <th>Father of</th>
                  <th>Mother of</th>
                  <th>Students Count</th>
                  <th>Primary Mobile</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th className="col-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {parents.map((parent) => {
                  const childrenCount = parent.children?.length || 0;
                  const relationLower = (parent.relation || "").trim().toLowerCase();
                  
                  // Father/Mother column assignments
                  const isFather = relationLower === "father";
                  const isMother = relationLower === "mother";
                  
                  const fatherOfText = isFather ? parent.children.map(c => c.name).join(", ") : "—";
                  const motherOfText = isMother ? parent.children.map(c => c.name).join(", ") : "—";

                  return (
                    <tr key={parent._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td>
                        <button
                          onClick={() => router.push(`/guardians/${parent._id}`)}
                          className="font-mono text-primary font-bold hover:underline"
                        >
                          {parent._id.slice(-6).toUpperCase()}
                        </button>
                      </td>

                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatar(parent.name, parent.photo_url)}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                            alt="avatar"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{parent.name}</div>
                            <div className="text-[11px] text-slate-400">Added {formatDate(parent.createdAt)}</div>
                          </div>
                        </div>
                      </td>

                      <td className="text-slate-700 dark:text-slate-350 capitalize font-medium">
                        {parent.relation || "—"}
                      </td>

                      <td className="text-slate-600 dark:text-slate-400 font-medium max-w-[150px] truncate" title={fatherOfText}>
                        {fatherOfText}
                      </td>

                      <td className="text-slate-600 dark:text-slate-400 font-medium max-w-[150px] truncate" title={motherOfText}>
                        {motherOfText}
                      </td>

                      <td>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                          {childrenCount} {childrenCount === 1 ? "Student" : "Students"}
                        </span>
                      </td>

                      <td className="text-slate-700 dark:text-slate-350 font-medium">
                        {parent.phone || "—"}
                      </td>

                      <td className="text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                        {parent.email || "—"}
                      </td>

                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold
                          ${parent.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${parent.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {parent.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="col-center">
                        <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === parent._id ? null : parent._id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </button>

                          {activeDropdown === parent._id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                              <div className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1.5 text-left">
                                <button
                                  onClick={() => { router.push(`/guardians/${parent._id}`); setActiveDropdown(null); }}
                                  className="w-full px-4 py-2 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 text-slate-400" />
                                  <span>View Profile</span>
                                </button>
                                <button
                                  onClick={() => { openEdit(parent); setActiveDropdown(null); }}
                                  className="w-full px-4 py-2 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                                >
                                  <Edit className="w-4 h-4 text-slate-400" />
                                  <span>Edit Parent</span>
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                <button
                                  onClick={() => handleDelete(parent._id)}
                                  className="w-full px-4 py-2 text-[12px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar — always visible */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <PaginationBar
            currentPage={page}
            totalPages={Math.ceil(totalParents / limit)}
            totalItems={totalParents}
            pageSize={limit}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Add Parent Modal */}
      {isAddOpen && (
        <Modal isOpen={true} onClose={() => setIsAddOpen(false)} title="Add Parent Record" size="md">
          <form onSubmit={handleAddSubmit} className="space-y-4">
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

            {/* Avatar Upload Box */}
            <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-left">
              {uploadingPhoto ? (
                <div className="w-16 h-16 rounded-xl border-2 border-slate-350 dark:border-slate-650 flex items-center justify-center bg-white dark:bg-slate-900">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : formPhoto ? (
                <img src={formPhoto} className="w-16 h-16 rounded-xl object-cover border border-slate-200" alt="Avatar Preview" />
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-900">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Upload Photo
                  </button>
                  {formPhoto && (
                    <button
                      type="button"
                      onClick={() => setFormPhoto("")}
                      className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#E2E8F0] cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">JPG, PNG (Max 5MB)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500">Parent / Guardian Name *</label>
                <input
                  required
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Relationship *</label>
                  <select
                    required
                    value={formRelation}
                    onChange={e => setFormRelation(e.target.value)}
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="">Select Relation</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Occupation</label>
                  <input
                    type="text"
                    value={formOccupation}
                    onChange={e => setFormOccupation(e.target.value)}
                    placeholder="e.g. Business Owner"
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Phone Number *</label>
                  <input
                    required
                    type="tel"
                    value={formPhone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none transition-all shadow-sm
                      ${phoneError ? "border-rose-500 focus:border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-primary/50"}`}
                  />
                  {phoneError && <span className="text-[11px] text-rose-500 mt-0.5">{phoneError}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g. johndoe@gmail.com"
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500">Address</label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  placeholder="Street details..."
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-205 cursor-pointer shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || uploadingPhoto}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-70"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Add Record</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Parent Modal */}
      {editParent && (
        <Modal isOpen={true} onClose={() => setEditParent(null)} title="Edit Parent Record" size="md">
          <form onSubmit={handleEditSubmit} className="space-y-4">
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

            {/* Photo preview upload */}
            <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-left">
              {uploadingPhoto ? (
                <div className="w-16 h-16 rounded-xl border-2 border-slate-300 flex items-center justify-center bg-white dark:bg-slate-900">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : formPhoto ? (
                <img src={formPhoto} className="w-16 h-16 rounded-xl object-cover border border-slate-200" alt="Avatar Preview" />
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-900">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Change Photo
                  </button>
                  {formPhoto && (
                    <button
                      type="button"
                      onClick={() => setFormPhoto("")}
                      className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#E2E8F0] cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">JPG, PNG (Max 5MB)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500">Parent / Guardian Name *</label>
                <input
                  required
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Relationship *</label>
                  <select
                    required
                    value={formRelation}
                    onChange={e => setFormRelation(e.target.value)}
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="">Select Relation</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Occupation</label>
                  <input
                    type="text"
                    value={formOccupation}
                    onChange={e => setFormOccupation(e.target.value)}
                    placeholder="e.g. Business Owner"
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Phone Number *</label>
                  <input
                    required
                    type="tel"
                    value={formPhone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none transition-all shadow-sm
                      ${phoneError ? "border-rose-500 focus:border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-primary/50"}`}
                  />
                  {phoneError && <span className="text-[11px] text-rose-500 mt-0.5">{phoneError}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g. johndoe@gmail.com"
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500">Address</label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  placeholder="Street details..."
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setEditParent(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-205 cursor-pointer shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || uploadingPhoto}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-70"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
