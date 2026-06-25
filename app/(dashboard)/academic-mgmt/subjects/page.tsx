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
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [formAllowedStreams, setFormAllowedStreams] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const resetForm = () => { setFormName(""); setFormCode(""); setFormDesc(""); setFormStatus("Active"); setFormAllowedStreams([]); setFormError(""); };

  const openEdit = (s: ApiSubjectMaster) => {
    setSelected(s); setFormName(s.name); setFormCode(s.subject_code || "");
    setFormDesc(s.description || ""); setFormStatus(s.status);
    setFormAllowedStreams(s.allowed_streams || []);
    setFormError("");
    setIsEditOpen(true); setActionMenuId(null);
  };
  const openDelete = (s: ApiSubjectMaster) => { setSelected(s); setIsDeleteOpen(true); setActionMenuId(null); };

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${status === "Inactive" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"}`}>
      {status}
    </span>
  );

  const columns: ColumnDef<ApiSubjectMaster>[] = [
    { header: "#", accessorKey: "_id", render: (s: ApiSubjectMaster) => <span className="text-slate-400 text-[13px]">—</span> },
    { header: "Subject Name", accessorKey: "name", render: (s) => <span className="font-bold text-[#F59E0B]">{s.name}</span> },
    { header: "Subject Code", accessorKey: "subject_code", render: (s) => <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">{s.subject_code || "—"}</span> },
    { header: "Description", accessorKey: "description", render: (s) => <span className="text-[13px] text-slate-500 dark:text-slate-400 max-w-[200px] truncate block">{s.description || "—"}</span> },
    ...(enableStreams ? [{
      header: "Allowed Streams",
      accessorKey: "allowed_streams",
      render: (s: ApiSubjectMaster) => {
        if (!s.allowed_streams || s.allowed_streams.length === 0) {
          return <span className="text-[12px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 italic">All Streams (Common)</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {s.allowed_streams.map(id => {
              const streamName = streams.find(str => str._id === id)?.name || id;
              return (
                <span key={id} className="text-[11px] font-semibold bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-800/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                  {streamName}
                </span>
              );
            })}
          </div>
        );
      }
    } as ColumnDef<ApiSubjectMaster>] : []),
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
                <button onClick={() => openEdit(s)} className="w-full px-4 py-2 text-[13px] font-semibold text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 text-left">
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold text-[#0F172A] dark:text-slate-100">Subject Master</h1>
          <div className="flex items-center gap-2 text-[14px] text-[#68718a] mt-1 font-medium">
            <span>Academic Management</span><span>/</span>
            <span className="text-[#0F172A] dark:text-slate-100">Subjects</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => doFetch()} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors">
              <Plus className="w-4 h-4" /><span>Add Subject</span>
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
              className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full sm:w-64 focus:border-[#F59E0B]/50 transition-colors shadow-sm bg-[#F8FAFC] dark:bg-[#0F172A]" />
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
            {isAdmin && <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="px-4 py-2 text-[13px] font-bold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg">Add First Subject</button>}
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={subjects}
              selectionHeader={<input type="checkbox" className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] w-4 h-4" />}
              renderSelection={() => <input type="checkbox" className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] w-4 h-4" />}
            />
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
                <p className="text-[13px] text-slate-500">Page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span></p>
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
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Subject Name <span className="text-red-500">*</span></label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Physics, Mathematics"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Subject Code <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. PHY, MATH"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 transition-colors shadow-sm bg-white dark:bg-slate-900 uppercase" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Description <span className="text-slate-400 text-[11px]">(optional)</span></label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2}
              placeholder="Brief description of this subject..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 transition-colors shadow-sm bg-white dark:bg-slate-900 resize-none" />
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">
                Allowed Streams <span className="text-slate-400 text-[11px]">(leave blank to allow for all streams)</span>
              </label>
              <div className="space-y-3 p-3 border border-border rounded-lg bg-[#F8FAFC] dark:bg-slate-900/50">
                <div className="flex flex-wrap gap-2.5">
                  {streams.filter(s => s.status === "Active").map(s => {
                    const checked = formAllowedStreams.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-lg cursor-pointer hover:border-[#F59E0B]/50 transition-colors shadow-sm text-[13px] font-medium text-[#0F172A] dark:text-slate-100">
                        <input type="checkbox" checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAllowedStreams([...formAllowedStreams, s._id]);
                            } else {
                              setFormAllowedStreams(formAllowedStreams.filter(x => x !== s._id));
                            }
                          }}
                          className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] w-4 h-4 cursor-pointer" />
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
            <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Status <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {(["Active", "Inactive"] as const).map(s => (
                <button key={s} type="button" onClick={() => setFormStatus(s)}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold border transition-colors ${formStatus === s ? "bg-[#F59E0B] border-[#F59E0B] text-white" : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
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
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Subject Name <span className="text-red-500">*</span></label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Physics, Mathematics"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Subject Code <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. PHY, MATH"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 transition-colors shadow-sm bg-white dark:bg-slate-900 uppercase" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Description <span className="text-slate-400 text-[11px]">(optional)</span></label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2}
              placeholder="Brief description of this subject..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 transition-colors shadow-sm bg-white dark:bg-slate-900 resize-none" />
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">
                Allowed Streams <span className="text-slate-400 text-[11px]">(leave blank to allow for all streams)</span>
              </label>
              <div className="space-y-3 p-3 border border-border rounded-lg bg-[#F8FAFC] dark:bg-slate-900/50">
                <div className="flex flex-wrap gap-2.5">
                  {streams.filter(s => s.status === "Active").map(s => {
                    const checked = formAllowedStreams.includes(s._id);
                    return (
                      <label key={s._id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-lg cursor-pointer hover:border-[#F59E0B]/50 transition-colors shadow-sm text-[13px] font-medium text-[#0F172A] dark:text-slate-100">
                        <input type="checkbox" checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAllowedStreams([...formAllowedStreams, s._id]);
                            } else {
                              setFormAllowedStreams(formAllowedStreams.filter(x => x !== s._id));
                            }
                          }}
                          className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] w-4 h-4 cursor-pointer" />
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
            <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Status <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {(["Active", "Inactive"] as const).map(s => (
                <button key={s} type="button" onClick={() => setFormStatus(s)}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold border transition-colors ${formStatus === s ? "bg-[#F59E0B] border-[#F59E0B] text-white" : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsEditOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Subject">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to delete <span className="font-bold text-[#0F172A] dark:text-white">{selected?.name}</span>?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 text-[14px] font-bold rounded-lg">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
