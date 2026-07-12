"use client";

import React, { useState, useCallback } from "react";
import {
  Plus, Search, RefreshCcw, MoreVertical, Edit, Trash2,
  Loader2, AlertCircle, BookOpen, ChevronDown
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { useSubjectMaster, ApiSubjectMaster } from "@/app/hooks/useSubjectMaster";
import { useStreams } from "@/app/hooks/useStreams";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";

export default function SubjectMasterPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { enableStreams } = useAcademicConfig();
  const { streams } = useStreams({ skip: !enableStreams });
  const { subjects, isLoading, error, total, totalPages, currentPage, fetchSubjects, createSubject, updateSubject, deleteSubject } = useSubjectMaster({ skip: true });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ApiSubjectMaster | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive" | "Archived">("Active");
  const [formAllowedStreams, setFormAllowedStreams] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Dependency checking states
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [dependencyReasons, setDependencyReasons] = useState<string[]>([]);
  const [isDeletable, setIsDeletable] = useState(true);

  const searchRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => { fetchSubjects({ limit: PAGE_SIZE }); }, [fetchSubjects]);

  const doFetch = useCallback((overrides: Record<string, any> = {}) => {
    fetchSubjects({ search: overrides.search ?? searchQuery, page: overrides.p ?? page, limit: PAGE_SIZE });
  }, [fetchSubjects, searchQuery, page]);

  const handleSearch = (val: string) => {
    setSearchQuery(val); setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchSubjects({ search: val, page: 1, limit: PAGE_SIZE }), 400);
  };

  const handlePageChange = (p: number) => { setPage(p); fetchSubjects({ search: searchQuery, page: p, limit: PAGE_SIZE }); };

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormDesc("");
    setFormStatus("Active");
    setFormAllowedStreams([]);
    setFormError("");
    setDependencyError(null);
    setDependencyReasons([]);
    setIsDeletable(true);
  };

  const openEdit = (s: ApiSubjectMaster) => {
    setSelected(s); setFormName(s.name); setFormCode(s.subject_code || "");
    setFormDesc(s.description || ""); setFormStatus(s.status as any);
    setFormAllowedStreams(s.allowed_streams || []);
    setFormError("");
    setIsEditOpen(true); setActionMenuId(null);
  };

  const openDelete = async (s: ApiSubjectMaster) => {
    setSelected(s);
    setIsDeleteOpen(true);
    setActionMenuId(null);
    setCheckingDependencies(true);
    setDependencyError(null);
    setDependencyReasons([]);
    setIsDeletable(true);
    try {
      const res = await fetch(`/api/academic/dependency-check?type=subject_master&id=${s._id}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setIsDeletable(data.data.deletable);
        setDependencyReasons(data.data.reasons);
      } else {
        setDependencyError(data.message || "Failed to check dependencies.");
      }
    } catch {
      setDependencyError("Failed to check references.");
    } finally {
      setCheckingDependencies(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { setFormError("Subject name is required."); return; }
    setSubmitting(true);
    const res = await createSubject({
      name: formName.trim(),
      subject_code: formCode,
      description: formDesc,
      status: formStatus,
      allowed_streams: enableStreams ? formAllowedStreams : undefined,
    });
    setSubmitting(false);
    if (res.success) { setIsAddOpen(false); resetForm(); doFetch(); }
    else setFormError(res.message);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !formName.trim()) { setFormError("Subject name is required."); return; }
    setSubmitting(true);
    const res = await updateSubject(selected._id, {
      name: formName.trim(),
      subject_code: formCode,
      description: formDesc,
      status: formStatus,
      allowed_streams: enableStreams ? formAllowedStreams : undefined,
    });
    setSubmitting(false);
    if (res.success) { setIsEditOpen(false); resetForm(); doFetch(); }
    else setFormError(res.message);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    await deleteSubject(selected._id);
    setSubmitting(false); setIsDeleteOpen(false); doFetch();
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${status === "Inactive"
      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
      : status === "Archived"
        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
      }`}>{status}</span>
  );

  const columns: ColumnDef<any>[] = [
    { header: "#", accessorKey: "_id", render: (_s: ApiSubjectMaster, i: number) => <span className="text-slate-500 text-[13px]">{i + 1}</span> },
    { header: "Subject Name", accessorKey: "name", render: (s) => <span className="font-medium text-slate-500 dark:text-slate-200">{s.name}</span> },
    { header: "Subject Code", accessorKey: "subject_code", render: (s) => <span className="font-sans text-[12px] text-slate-500 dark:text-slate-400">{s.subject_code || "—"}</span> },
    { header: "Classes", accessorKey: "classesCount", render: (s) => <span className="text-slate-600 dark:text-slate-300">{(s as any).classesCount ?? 0}</span> },
    { header: "Teachers", accessorKey: "teachersCount", render: (s) => <span className="text-slate-600 dark:text-slate-300">{(s as any).teachersCount ?? 0}</span> },
    { header: "Status", accessorKey: "status", render: (s) => <StatusBadge status={s.status} /> },
    ...(isAdmin ? [{
      header: "Action", sortable: false,
      render: (s: ApiSubjectMaster) => (
        <div className="relative">
          <button onClick={() => setActionMenuId(actionMenuId === s._id ? null : s._id)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
          {actionMenuId === s._id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
              <div className="absolute right-8 top-0 w-32 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                <button onClick={() => openEdit(s)} className="w-full px-4 py-2 text-[13px] font-semibold text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 text-left">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => openDelete(s)} className="w-full px-4 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-left">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      ),
    } as ColumnDef<ApiSubjectMaster>] : []),
  ];

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subject Master</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Academic Management</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Subjects</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => doFetch()} className="btn btn-outline p-2 w-9 h-9">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
            Subjects Catalog {!isLoading && <span className="ml-2 text-[13px] font-normal text-slate-400">({total})</span>}
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Search subjects..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full sm:w-64 focus:border-primary/50 transition-colors shadow-sm bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)]" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-[14px] font-medium">Loading subjects...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" /><p className="text-[14px] font-medium">{error}</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <BookOpen className="w-10 h-10 opacity-30" />
            <p className="text-[14px] font-medium">No subjects in catalog</p>
            <p className="text-[12px] text-slate-400">Add Physics, Chemistry, Mathematics and more</p>
            {isAdmin && <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="px-4 py-2 text-[13px] font-bold bg-primary hover:bg-[var(--primary-hover)] text-white rounded-lg">Add First Subject</button>}
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={subjects}
              selectionHeader={<input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
              renderSelection={() => <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
            />
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
                <p className="card-subtitle text-[13px]">Page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span></p>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Add Subject">
        <form onSubmit={handleAdd} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Subject Name <span className="text-red-500">*</span></label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Physics, Mathematics"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Subject Code <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. PHY, MATH"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900 uppercase" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Description <span className="text-slate-400 text-[11px]">(optional)</span></label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2}
              placeholder="Brief description of this subject..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900 resize-none" />
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">
                Allowed Streams <span className="text-slate-400 text-[11px]">(leave blank to allow for all streams)</span>
              </label>
              <div className="space-y-3 p-3 border border-border rounded-lg bg-[#F8FAFC] dark:bg-slate-900/50">
                <div className="flex flex-wrap gap-2.5">
                  {streams.filter(s => s.status === "Active").map(s => {
                    const checked = formAllowedStreams.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors shadow-sm text-[13px] font-medium text-foreground dark:text-slate-100">
                        <input type="checkbox" checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAllowedStreams([...formAllowedStreams, s._id]);
                            } else {
                              setFormAllowedStreams(formAllowedStreams.filter(x => x !== s._id));
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
                        <span>{s.name}</span>
                      </label>
                    );
                  })}
                  {streams.filter(s => s.status === "Active").length === 0 && (
                    <span className="text-[12px] text-slate-400 italic">No active streams found.</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Status <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-3 pt-0.5">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Add Subject
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); resetForm(); }} title="Edit Subject">
        <form onSubmit={handleEdit} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Subject Name <span className="text-red-500">*</span></label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Physics, Mathematics"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Subject Code <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. PHY, MATH"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900 uppercase" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Description <span className="text-slate-400 text-[11px]">(optional)</span></label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2}
              placeholder="Brief description of this subject..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900 resize-none" />
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">
                Allowed Streams <span className="text-slate-400 text-[11px]">(leave blank to allow for all streams)</span>
              </label>
              <div className="space-y-3 p-3 border border-border rounded-lg bg-[#F8FAFC] dark:bg-slate-900/50">
                <div className="flex flex-wrap gap-2.5">
                  {streams.filter(s => s.status === "Active").map(s => {
                    const checked = formAllowedStreams.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors shadow-sm text-[13px] font-medium text-foreground dark:text-slate-100">
                        <input type="checkbox" checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAllowedStreams([...formAllowedStreams, s._id]);
                            } else {
                              setFormAllowedStreams(formAllowedStreams.filter(x => x !== s._id));
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
                        <span>{s.name}</span>
                      </label>
                    );
                  })}
                  {streams.filter(s => s.status === "Active").length === 0 && (
                    <span className="text-[12px] text-slate-400 italic">No active streams found.</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Status <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-3 pt-0.5">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsEditOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Subject">
        <div className="space-y-5 text-left">
          {checkingDependencies ? (
            <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[13px] font-medium">Checking academic referential dependencies...</span>
            </div>
          ) : !isDeletable ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-955/20 border border-rose-200/50 dark:border-rose-900/30 text-rose-700 dark:text-rose-455 text-[13px] font-medium leading-[20px]">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">Cannot Delete Subject</p>
                  <p>This subject catalog master entry is assigned to classes or teachers. Deleting it would break historical records.</p>
                  <div className="mt-2.5 space-y-1">
                    <p className="font-bold">Active Dependencies found:</p>
                    <ul className="list-disc list-inside pl-1 text-[12px] font-semibold text-rose-600 dark:text-rose-455">
                      {dependencyReasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
              <p className="card-subtitle text-[13px]">Would you like to archive or deactivate this subject instead? Archived subjects are hidden from standard dropdowns across the ERP.</p>
              <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border/50">
                <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-foreground text-[13px] font-bold rounded-lg transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!selected) return;
                  setSubmitting(true);
                  const result = await updateSubject(selected._id, { status: "Inactive" });
                  setSubmitting(false);
                  if (result.success) { setIsDeleteOpen(false); resetForm(); doFetch(); }
                  else alert(result.message);
                }} disabled={submitting} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Deactivate
                </button>
                <button onClick={async () => {
                  if (!selected) return;
                  setSubmitting(true);
                  const result = await updateSubject(selected._id, { status: "Archived" });
                  setSubmitting(false);
                  if (result.success) { setIsDeleteOpen(false); resetForm(); doFetch(); }
                  else alert(result.message);
                }} disabled={submitting} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Archive Subject
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[14px] text-slate-600 dark:text-slate-300">
                Are you sure you want to delete subject <span className="font-bold text-foreground dark:text-white">{selected?.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
                <button onClick={handleDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
