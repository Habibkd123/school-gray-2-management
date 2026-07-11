"use client";

import React, { useState, useCallback } from "react";
import {
  Plus, Search, RefreshCcw, MoreVertical, Edit, Trash2,
  Loader2, AlertCircle, Layers
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { EnhancedTable } from "@/app/components/ui/EnhancedTable";
import { useStreams, ApiStream } from "@/app/hooks/useStreams";
import { useAuth } from "@/app/context/auth";

import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";
import { getAuthHeaders } from "@/lib/utils/session";

export default function StreamsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { streams, isLoading, error, total, totalPages, fetchStreams, createStream, updateStream, deleteStream } = useStreams({ skip: true });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ApiStream | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive" | "Archived">("Active");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(25));

  // Dependency check states
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [dependencyReasons, setDependencyReasons] = useState<string[]>([]);
  const [isDeletable, setIsDeletable] = useState(true);

  const doFetch = useCallback(() => {
    fetchStreams({ page, limit: pageSize, search: searchQuery });
  }, [fetchStreams, page, pageSize, searchQuery]);

  React.useEffect(() => {
    doFetch();
  }, [doFetch]);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const resetForm = () => {
    setFormName("");
    setFormStatus("Active");
    setFormError("");
    setDependencyError(null);
    setDependencyReasons([]);
    setIsDeletable(true);
  };

  const openEdit = (s: ApiStream) => {
    setSelected(s); setFormName(s.name); setFormStatus(s.status as any); setFormError("");
    setIsEditOpen(true); setActionMenuId(null);
  };

  const openDelete = async (s: ApiStream) => {
    setSelected(s);
    setIsDeleteOpen(true);
    setActionMenuId(null);
    setCheckingDependencies(true);
    setDependencyError(null);
    setDependencyReasons([]);
    setIsDeletable(true);
    try {
      const res = await fetch(`/api/academic/dependency-check?type=stream&id=${s._id}`, {
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
    if (!formName.trim()) { setFormError("Stream name is required."); return; }
    setSubmitting(true);
    const res = await createStream({ name: formName.trim(), status: formStatus });
    setSubmitting(false);
    if (res.success) { setIsAddOpen(false); resetForm(); doFetch(); }
    else setFormError(res.message);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !formName.trim()) { setFormError("Stream name is required."); return; }
    setSubmitting(true);
    const res = await updateStream(selected._id, { name: formName.trim(), status: formStatus });
    setSubmitting(false);
    if (res.success) { setIsEditOpen(false); resetForm(); doFetch(); }
    else setFormError(res.message);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    await deleteStream(selected._id);
    setSubmitting(false);
    setIsDeleteOpen(false);
    doFetch();
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      status === "Inactive"
        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        : status === "Archived"
        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
    }`}>{status}</span>
  );

  const columns: ColumnDef<any>[] = [
    { header: "#", accessorKey: "_id", render: (_s: ApiStream, i: number) => <span className="text-slate-500 font-medium text-[13px]">{i + 1}</span> },
    { header: "Stream Name", accessorKey: "name", render: (s) => <span className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</span> },
    { header: "Classes", accessorKey: "classesCount", render: (s) => <span className="font-semibold text-slate-700 dark:text-slate-350">{(s as any).classesCount ?? 0}</span> },
    { header: "Students", accessorKey: "studentsCount", render: (s) => <span className="font-semibold text-slate-700 dark:text-slate-355">{(s as any).studentsCount ?? 0}</span> },
    { header: "Status", accessorKey: "status", render: (s) => <StatusBadge status={s.status} /> },
    ...(isAdmin ? [{
      header: "Action", sortable: false,
      render: (s: ApiStream) => (
        <div className="relative">
          <button onClick={() => setActionMenuId(actionMenuId === s._id ? null : s._id)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
          {actionMenuId === s._id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
              <div className="absolute right-8 top-0 w-32 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                <button onClick={() => openEdit(s)} className="w-full px-4 py-2 text-[13px] font-semibold text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors text-left">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => openDelete(s)} className="w-full px-4 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors text-left">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      ),
    } as ColumnDef<ApiStream>] : []),
  ];

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      <div className="page-header">
        <div>
          <h1 className="page-title">Streams</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
            <span>Academic Management</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Streams</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => doFetch()} className="btn btn-outline p-2 w-9 h-9">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add Stream
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
            Streams List {!isLoading && <span className="ml-2 text-[13px] font-normal text-slate-400">({total})</span>}
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Search streams..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full sm:w-56 focus:border-primary/50 transition-colors shadow-sm bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)]" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-[14px] font-medium">Loading streams...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" /><p className="text-[14px] font-medium">{error}</p>
          </div>
        ) : streams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Layers className="w-10 h-10 opacity-30" />
            <p className="text-[14px] font-medium">No streams found</p>
            <p className="text-[12px] text-slate-400">Add streams like Science, Commerce, Arts</p>
            {isAdmin && (
              <button onClick={() => { resetForm(); setIsAddOpen(true); }}
                className="px-4 py-2 text-[13px] font-bold bg-primary hover:bg-[var(--primary-hover)] text-white rounded-lg transition-colors">
                Add First Stream
              </button>
            )}
          </div>
        ) : (
          <EnhancedTable columns={columns} data={streams}
            selectionHeader={<input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
            renderSelection={() => <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
            searchPlaceholder="Search streams..."
            searchKeys={["name"]}
            exportFileName="streams-list"
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
          />
        )}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Add Stream">
        <form onSubmit={handleAdd} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Stream Name <span className="text-red-500">*</span></label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Science, Commerce, Arts"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Status <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-3 pt-0.5">
              <button
                type="button"
                onClick={() => setFormStatus(formStatus === "Active" ? "Inactive" : "Active")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  formStatus === "Active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  formStatus === "Active" ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              <span className={`text-[13px] font-semibold ${
                formStatus === "Active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
              }`}>{formStatus}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Add Stream
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); resetForm(); }} title="Edit Stream">
        <form onSubmit={handleEdit} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Stream Name <span className="text-red-500">*</span></label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Science, Commerce, Arts"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-white dark:bg-slate-900" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Status <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-3 pt-0.5">
              <button
                type="button"
                onClick={() => setFormStatus(formStatus === "Active" ? "Inactive" : "Active")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  formStatus === "Active" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  formStatus === "Active" ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
              <span className={`text-[13px] font-semibold ${
                formStatus === "Active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
              }`}>{formStatus}</span>
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

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Stream">
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
                  <p className="font-bold mb-1">Cannot Delete Stream</p>
                  <p>This stream is referenced in classes, timetables, or student profiles. Deleting it would compromise referential integrity.</p>
                  <div className="mt-2.5 space-y-1">
                    <p className="font-bold">Active Dependencies found:</p>
                    <ul className="list-disc list-inside pl-1 text-[12px] font-semibold text-rose-600 dark:text-rose-455">
                      {dependencyReasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-[13px] text-slate-500">Would you like to archive or deactivate this stream instead? Archived streams are hidden from standard dropdowns across the ERP.</p>
              <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border/50">
                <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-foreground text-[13px] font-bold rounded-lg transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!selected) return;
                  setSubmitting(true);
                  const result = await updateStream(selected._id, { status: "Inactive" });
                  setSubmitting(false);
                  if (result.success) { setIsDeleteOpen(false); resetForm(); doFetch(); }
                  else alert(result.message);
                }} disabled={submitting} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Deactivate
                </button>
                <button onClick={async () => {
                  if (!selected) return;
                  setSubmitting(true);
                  const result = await updateStream(selected._id, { status: "Archived" });
                  setSubmitting(false);
                  if (result.success) { setIsDeleteOpen(false); resetForm(); doFetch(); }
                  else alert(result.message);
                }} disabled={submitting} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Archive Stream
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[14px] text-slate-600 dark:text-slate-300">
                Are you sure you want to delete stream <span className="font-bold text-foreground dark:text-white">{selected?.name}</span>? This action cannot be undone.
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
