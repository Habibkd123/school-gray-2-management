"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Upload, MoreVertical, Eye, Edit3, Copy,
  Trash2, Filter, ChevronDown, FileText, Loader2
} from "lucide-react";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { PaginationBar, usePagination } from "@/app/components/ui/pagination-bar";
import { WizardModal } from "@/app/components/document-builder/WizardModal";
import {
  getDocuments, deleteDocument, duplicateDocument, saveDocument,
  getCategories, BUILT_IN_CATEGORIES, createDocument
} from "@/app/components/document-builder/store";
import type { DocumentMeta, DocumentStatus, TemplateDefinition, DocumentElement } from "@/app/components/document-builder/types";
import { useAuth } from "@/app/context/auth";

const STATUS_BADGE: Record<DocumentStatus, { bg: string; text: string; dot: string }> = {
  draft:     { bg: "bg-amber-50 text-amber-700",    text: "Draft",     dot: "bg-amber-400" },
  published: { bg: "bg-emerald-50 text-emerald-700", text: "Published", dot: "bg-emerald-400" },
  archived:  { bg: "bg-slate-100 text-slate-500",   text: "Archived",  dot: "bg-slate-400" },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, bottom: false, right: false });

  // Close action menu on scroll to prevent detached fixed positioning
  useEffect(() => {
    const handleScroll = () => {
      if (activeDropdown) setActiveDropdown(null);
    };
    if (activeDropdown) {
      window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    }
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [activeDropdown]);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (activeDropdown === id) {
      setActiveDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;

    setMenuPos({
      top: spaceBelow < 200 ? rect.top - 8 : rect.bottom + 8,
      left: spaceRight < 200 ? rect.right : rect.left,
      bottom: spaceBelow < 200,
      right: spaceRight < 200
    });
    setActiveDropdown(id);
  };

  const categories = BUILT_IN_CATEGORIES;

  useEffect(() => {
    setMounted(true);
    setDocs(getDocuments());
  }, []);

  const refresh = () => setDocs(getDocuments());

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = docs.filter((d) => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase());
    const matchCat    = categoryFilter === "all" || d.categoryId === categoryFilter;
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const { page, setPage, pageSize, totalPages, totalItems, paged } = usePagination(filtered, 10);

  // ── Table columns ─────────────────────────────────────────────────────────
  type Row = DocumentMeta;

  const columns: ColumnDef<Row>[] = [
    {
      header: "Title",
      accessorKey: "title",
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-10 rounded bg-[#F0F4F8] flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-[13px]">{d.title}</p>
            <p className="text-[11px] text-slate-400 font-medium">{d.pageSize} · {d.orientation}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "categoryId",
      render: (d) => {
        const cat = categories.find((c) => c.id === d.categoryId);
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold bg-[#F0F4F8] text-primary">
            {cat?.name ?? d.categoryId}
          </span>
        );
      },
    },
    {
      header: "Created By",
      accessorKey: "createdBy",
      render: (d) => <span className="text-[13px] text-slate-600 dark:text-slate-300">{d.createdBy || "—"}</span>,
    },
    {
      header: "Last Updated",
      accessorKey: "updatedAt",
      render: (d) => <span className="text-[13px] text-slate-500 dark:text-slate-400">{fmtDate(d.updatedAt)}</span>,
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (d) => {
        const s = STATUS_BADGE[d.status];
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold ${s.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.text}
          </span>
        );
      },
    },
    {
      header: "Actions",
      sortable: false,
      render: (d) => (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => handleMenuClick(e, d.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              activeDropdown === d.id ? "bg-primary text-white" : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500"
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {activeDropdown === d.id && typeof document !== "undefined" && createPortal(
            <>
              <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }} />
              <div
                className="fixed w-48 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] z-[110] overflow-hidden py-2 text-left animate-in fade-in zoom-in-95 duration-100"
                style={{
                  top: menuPos.bottom ? "auto" : menuPos.top,
                  bottom: menuPos.bottom ? window.innerHeight - menuPos.top : "auto",
                  left: menuPos.right ? "auto" : menuPos.left,
                  right: menuPos.right ? window.innerWidth - menuPos.left : "auto",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => { router.push(`/documents/builder/${d.id}`); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                  <Eye className="w-4 h-4 text-slate-400" /> View / Edit
                </button>
                <button onClick={() => { const copy = duplicateDocument(d.id); if (copy) { refresh(); } setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3">
                  <Copy className="w-4 h-4 text-slate-400" /> Duplicate
                </button>
                <div className="my-1 border-t border-border" />
                <button onClick={() => { deleteDocument(d.id); refresh(); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-rose-400" /> Delete
                </button>
              </div>
            </>,
            document.body
          )}
        </div>
      ),
    },
  ];

  // ── Wizard create handler ─────────────────────────────────────────────────
  const handleCreate = (
    categoryId: string,
    template: TemplateDefinition,
    title: string,
    recordInfo?: { id: string; name: string; type: string; variables: Record<string, string> }
  ) => {
    const doc = createDocument(
      title,
      categoryId,
      template.id,
      user?.name ?? "Admin",
      JSON.parse(JSON.stringify(template.defaultPages)),
      template.pageSize,
      template.orientation,
      recordInfo?.id,
      recordInfo?.type,
      recordInfo?.name,
      recordInfo?.variables
    );

    if (recordInfo?.variables) {
      const vars = recordInfo.variables;
      const resolve = (key: string): string => {
        if (vars[key] !== undefined) return vars[key];
        const dotKey = key.replace(/_/g, ".");
        if (vars[dotKey] !== undefined) return vars[dotKey];
        const underKey = key.replace(".", "_");
        if (vars[underKey] !== undefined) return vars[underKey];
        if (key.endsWith("_number") && vars[key.replace(/_number$/, "_no")] !== undefined)
          return vars[key.replace(/_number$/, "_no")];
        if (key.endsWith(".number") && vars[key.replace(/\.number$/, "_no")] !== undefined)
          return vars[key.replace(/\.number$/, "_no")];
        if (key.endsWith("_no") && vars[key.replace(/_no$/, "_number")] !== undefined)
          return vars[key.replace(/_no$/, "_number")];
        return "";
      };

      const replaceInText = (text: string): string =>
        text.replace(/\{\{([^}]+)\}\}/g, (_match, k: string) => {
          return resolve(k.trim());
        });

      doc.pages = doc.pages.map((pg) => ({
        ...pg,
        elements: pg.elements.map((el): DocumentElement => {
          // Initialize originalContent / originalCells
          if (el.content && !el.originalContent) {
            el.originalContent = el.content;
          }
          if (el.tableData && !el.tableData.originalCells) {
            el.tableData.originalCells = JSON.parse(JSON.stringify(el.tableData.cells));
          }

          if (el.type === "variable") {
            const key = (el.variableMeta?.key || el.content?.replace(/[{} ]/g, "") || "").trim();
            const value = resolve(key);
            return {
              ...el,
              variableMeta: el.variableMeta
                ? { ...el.variableMeta, previewValue: value }
                : el.variableMeta,
            };
          }

          if (
            (el.type === "heading" ||
             el.type === "subheading" ||
             el.type === "paragraph") &&
            el.content?.includes("{{")
          ) {
            return { ...el, content: replaceInText(el.content) };
          }

          if (el.type === "table" && el.tableData) {
            const newCells = el.tableData.cells.map((row) =>
              row.map((cell) => (cell.includes("{{") ? replaceInText(cell) : cell))
            );
            return { ...el, tableData: { ...el.tableData, cells: newCells, originalCells: JSON.parse(JSON.stringify(el.tableData.cells)) } };
          }

          return el;
        }),
      }));

      saveDocument(doc);
    }

    router.push(`/documents/builder/${doc.id}`);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6" onClick={() => setActiveDropdown(null)}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Documents</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Documents</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => document.getElementById("doc-upload-input")?.click()}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
          <input id="doc-upload-input" type="file" className="hidden" accept=".pdf,.doc,.docx" />
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-[var(--primary-hover)] rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Document
          </button>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Documents", value: docs.length, color: "text-primary" },
          { label: "Draft", value: docs.filter((d) => d.status === "draft").length, color: "text-amber-600" },
          { label: "Published", value: docs.filter((d) => d.status === "published").length, color: "text-emerald-600" },
          { label: "Archived", value: docs.filter((d) => d.status === "archived").length, color: "text-slate-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-xl border border-border card-shadow p-4">
            <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Table Card ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">

        {/* Filters row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">All Documents</h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 w-[220px] text-[13px] border border-border rounded-lg outline-none focus:border-primary/50 transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {/* Filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-[13px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Filter className="w-4 h-4 text-slate-400" />
                <span>Filter</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-11 w-[320px] bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-border z-50 overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Filter Documents</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Category</label>
                        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-[13px] border border-border rounded-lg outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer">
                          <option value="all">All Categories</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Status</label>
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-[13px] border border-border rounded-lg outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer">
                          <option value="all">All Statuses</option>
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                      <button onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); setPage(1); setIsFilterOpen(false); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Reset
                      </button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-primary hover:bg-[var(--primary-hover)] transition-colors">
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F0F4F8] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-700 dark:text-slate-200 mb-2">No documents yet</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6">
              {search || categoryFilter !== "all" || statusFilter !== "all"
                ? "No documents match your filters."
                : "Create your first document to get started."}
            </p>
            {!search && categoryFilter === "all" && statusFilter === "all" && (
              <button
                onClick={() => setIsWizardOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-primary hover:bg-[var(--primary-hover)] rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Document
              </button>
            )}
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paged}
              onRowClick={(d) => router.push(`/documents/builder/${d.id}`)}
              noDataMessage="No documents found."
            />
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Wizard */}
      <WizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
