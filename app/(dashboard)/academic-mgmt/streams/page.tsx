"use client";

import React, { useState, useCallback } from "react";
import {
  Plus, Search, RefreshCcw, MoreVertical, Edit, Trash2,
  Loader2, AlertCircle, Layers
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { useStreams, ApiStream } from "@/app/hooks/useStreams";
import { useAuth } from "@/app/context/auth";

export default function StreamsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { streams, isLoading, error, total, totalPages, currentPage, fetchStreams, createStream, updateStream, deleteStream } = useStreams({ skip: true });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ApiStream | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const searchRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doFetch = useCallback((overrides: Record<string, any> = {}) => {
    fetchStreams({ search: overrides.search ?? searchQuery, page: overrides.p ?? page, limit: PAGE_SIZE });
  }, [fetchStreams, searchQuery, page]);

  React.useEffect(() => { fetchStreams({ limit: PAGE_SIZE }); }, [fetchStreams]);

  const handleSearch = (val: string) => {
    setSearchQuery(val); setPage(1);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchStreams({ search: val, page: 1, limit: PAGE_SIZE }), 400);
  };

  const resetForm = () => { setFormName(""); setFormStatus("Active"); setFormError(""); };

  const openEdit = (s: ApiStream) => {
    setSelected(s); setFormName(s.name); setFormStatus(s.status); setFormError("");
    setIsEditOpen(true); setActionMenuId(null);
  };
  const openDelete = (s: ApiStream) => { setSelected(s); setIsDeleteOpen(true); setActionMenuId(null); };

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
      status === "Inactive" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
    }`}>{status}</span>
  );

  const columns: ColumnDef<ApiStream>[] = [
    { header: "#", accessorKey: "_id", render: (s: ApiStream) => <span className="text-slate-400 text-[13px]">—</span> },
    { header: "Stream Name", accessorKey: "name", render: (s) => <span className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</span> },
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold text-foreground dark:text-slate-100">Streams</h1>
          <div className="flex items-center gap-2 text-[14px] text-[#68718a] mt-1 font-medium">
            <span>Academic Management</span><span>/</span>
            <span className="text-foreground dark:text-slate-100">Streams</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => doFetch()} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors">
              <Plus className="w-4 h-4" /><span>Add Stream</span>
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
          <DataTable columns={columns} data={streams}
            selectionHeader={<input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
            renderSelection={() => <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" />}
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
            <div className="flex gap-3">
              {(["Active", "Inactive"] as const).map(s => (
                <button key={s} type="button" onClick={() => setFormStatus(s)}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold border transition-colors ${formStatus === s ? "bg-primary border-primary text-white" : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  {s}
                </button>
              ))}
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
            <div className="flex gap-3">
              {(["Active", "Inactive"] as const).map(s => (
                <button key={s} type="button" onClick={() => setFormStatus(s)}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold border transition-colors ${formStatus === s ? "bg-primary border-primary text-white" : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  {s}
                </button>
              ))}
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
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to delete stream <span className="font-bold text-foreground dark:text-white">{selected?.name}</span>?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
