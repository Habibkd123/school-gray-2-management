"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText, Clock, Users, Trash2, Eye, Download, Printer,
  Loader2, Filter, Search, RefreshCcw, Plus, BookOpen,
} from "lucide-react";
import { GenerateDocumentWizard } from "@/app/components/document-builder/GenerateDocumentWizard";
import { BulkGenerationPanel } from "@/app/components/document-builder/BulkGenerationPanel";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils/session";

// ─── Helpers ──────────────────────────────────────────────────────────────────


function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const MODULE_COLORS: Record<string, string> = {
  student:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  teacher:  "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400",
  exam:     "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
  fees:     "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400",
  salary:   "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400",
  school:   "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400",
  custom:   "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  report_card:        "Report Card",
  fee_receipt:        "Fee Receipt",
  salary_slip:        "Salary Slip",
  bonafide:           "Bonafide Cert.",
  transfer_cert:      "Transfer Cert.",
  character_cert:     "Character Cert.",
  appointment_letter: "Appointment Letter",
  experience_letter:  "Experience Letter",
  circular:           "Circular",
  notice:             "Notice",
  custom:             "Custom",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentCenterPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"generate" | "history" | "bulk">("generate");

  // Generate tab
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // History tab
  const [docs, setDocs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [typeFilter, setTypeFilter]     = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const PAGE_SIZE = 20;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(search       ? { search }               : {}),
        ...(moduleFilter ? { module: moduleFilter } : {}),
        ...(typeFilter   ? { type: typeFilter }     : {}),
      });
      const res  = await fetch(`/api/documents/generated?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setDocs(data.data?.docs || data.data || []);
      setTotal(data.data?.total || 0);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, page, moduleFilter, typeFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document record?")) return;
    await fetch(`/api/documents/generated/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    fetchHistory();
  };

  const handleMarkPrinted = async (id: string) => {
    await fetch(`/api/documents/generated/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ is_printed: true }),
    });
    fetchHistory();
  };

  const filteredDocs = docs.filter(d =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.generated_for_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] leading-[24px] font-semibold text-foreground dark:text-slate-100">Document Center</h1>
          <div className="flex items-center gap-2 text-[14px] text-[#68718a] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground dark:text-slate-100">Document Center</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/documents/builder"
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Template Builder</span>
          </Link>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Document</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border">
          {(["generate", "history", "bulk"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[13px] font-bold capitalize transition-colors ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30"
              }`}
            >
              {tab === "generate" ? "⚡ Generate" : tab === "history" ? "📋 History" : "👥 Bulk Generate"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Generate Tab ─────────────────────────────────────────────────── */}
          {activeTab === "generate" && (
            <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-slate-900 dark:text-white mb-2">Generate Any Document</h2>
                <p className="text-[14px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Create report cards, fee receipts, bonafide certificates, salary slips, appointment letters, and more —
                  all from your custom templates.
                </p>
              </div>

              <button
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-[var(--primary-hover)] text-white text-[15px] font-bold rounded-xl shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all"
              >
                <Plus className="w-5 h-5" />
                Start Document Wizard
              </button>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 w-full max-w-2xl">
                {[
                  { label: "Report Card",    icon: "📊", module: "exam" },
                  { label: "Fee Receipt",    icon: "💳", module: "fees" },
                  { label: "Bonafide Cert.", icon: "🎓", module: "student" },
                  { label: "Salary Slip",    icon: "💼", module: "salary" },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => setIsWizardOpen(true)}
                    className="flex flex-col items-center gap-2 p-4 border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── History Tab ───────────────────────────────────────────────────── */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && fetchHistory()}
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-[13px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-primary/50"
                  />
                </div>
                <select
                  value={moduleFilter}
                  onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border border-border rounded-xl text-[13px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">All Modules</option>
                  {["student","teacher","exam","fees","salary","school","custom"].map(m => (
                    <option key={m} value={m} className="capitalize">{m}</option>
                  ))}
                </select>
                <select
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2.5 border border-border rounded-xl text-[13px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">All Types</option>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <button
                  onClick={fetchHistory}
                  className="p-2.5 border border-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-500"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-[13px] text-slate-500">Loading history…</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-14">
                  <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-400">No documents generated yet</p>
                  <p className="text-[12px] text-slate-400 mt-1">Generate your first document using the wizard above.</p>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px] text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Document</th>
                          <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">For</th>
                          <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Module</th>
                          <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Type</th>
                          <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Generated</th>
                          <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Status</th>
                          <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredDocs.map(doc => (
                          <tr key={doc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[160px] truncate">{doc.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">{doc.generated_for_name || "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${MODULE_COLORS[doc.reference_module] || MODULE_COLORS.custom}`}>
                                {doc.reference_module}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(doc.createdAt)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {doc.is_printed && (
                                  <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-bold rounded dark:bg-purple-950/30 dark:text-purple-400">Printed</span>
                                )}
                                {doc.is_downloaded && (
                                  <span className="px-1.5 py-0.5 bg-teal-50 text-teal-600 border border-teal-200 text-[10px] font-bold rounded dark:bg-teal-950/30 dark:text-teal-400">Downloaded</span>
                                )}
                                {!doc.is_printed && !doc.is_downloaded && (
                                  <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold rounded dark:bg-slate-800 dark:text-slate-400">Generated</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  title="Open in builder"
                                  onClick={() => router.push(`/documents/builder/${doc.template_id}?docId=${doc._id}`)}
                                  className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-500 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Mark as printed"
                                  onClick={() => handleMarkPrinted(doc._id)}
                                  className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-500 transition-colors"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Delete record"
                                  onClick={() => handleDelete(doc._id)}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-slate-50/50 dark:bg-slate-800/20">
                      <span className="text-[12px] text-slate-500 dark:text-slate-400">
                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                      </span>
                      <div className="flex gap-2">
                        <button
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                          className="px-3 py-1.5 text-[12px] font-semibold border border-border rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          disabled={page * PAGE_SIZE >= total}
                          onClick={() => setPage(p => p + 1)}
                          className="px-3 py-1.5 text-[12px] font-semibold border border-border rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Bulk Tab ──────────────────────────────────────────────────────── */}
          {activeTab === "bulk" && (
            <BulkGenerationPanel />
          )}
        </div>
      </div>

      {/* Wizard */}
      <GenerateDocumentWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
}
