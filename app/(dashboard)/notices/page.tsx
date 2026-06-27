"use client";

import React, { useState } from "react";
import { 
  RefreshCw, Printer, Download, Plus, Calendar, Filter, ChevronDown, FileText, Edit, Trash2, Loader2
} from "lucide-react";
import { Modal } from "../../components/ui/modal";
import { DataTable } from "@/app/components/ui/data-table";
import { useNotices, ApiNotice } from "@/app/hooks/useNotices";
import { useUpload } from "@/app/hooks/useUpload";

const AUDIENCE_MAP: Record<string, string> = {
  "Student": "students",
  "Teacher": "teachers",
  "Parent": "parents",
  "Admin": "staff",
  "Accountant": "accountant",
  "Librarian": "librarian",
  "Receptionist": "staff",
  "Super Admin": "staff",
};

const REVERSE_AUDIENCE_MAP: Record<string, string> = {
  "students": "Student",
  "teachers": "Teacher",
  "parents": "Parent",
  "staff": "Admin",
  "accountant": "Accountant",
  "librarian": "Librarian",
  "all": "",
};

export default function NoticesPage() {
  const { notices, loading, createNotice, updateNotice, deleteNotice } = useNotices();
  const { uploadFile: upload, uploading } = useUpload();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("Last 7 Days");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddMessageOpen, setIsAddMessageOpen] = useState(false);
  const [selectedNotices, setSelectedNotices] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add form states
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAudience, setFormAudience] = useState<string[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Edit modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<ApiNotice | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editAudience, setEditAudience] = useState<string[]>([]);
  const [editAttachmentFile, setEditAttachmentFile] = useState<File | null>(null);

  const openEditModal = (notice: ApiNotice) => {
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditDate(notice.publish_date ? notice.publish_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    const displayRole = REVERSE_AUDIENCE_MAP[notice.target_audience] || "";
    setEditAudience(displayRole ? [displayRole] : []);
    setEditAttachmentFile(null);
    setIsEditOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedNotices([]);
    } else {
      setSelectedNotices(notices.map(n => n._id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelect = (id: string) => {
    if (selectedNotices.includes(id)) {
      setSelectedNotices(selectedNotices.filter(nId => nId !== id));
      setSelectAll(false);
    } else {
      setSelectedNotices([...selectedNotices, id]);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let attachment_url: string | undefined;
      if (attachmentFile) {
        const result = await upload(attachmentFile);
        if (result) attachment_url = result;
      }

      const target = formAudience.length === 0 ? "all" : (AUDIENCE_MAP[formAudience[0]] ?? formAudience[0].toLowerCase());
      await createNotice({
        title: formTitle,
        content: formContent,
        publish_date: formDate,
        target_audience: target as any,
        attachment_url,
      });

      setFormTitle("");
      setFormContent("");
      setFormAudience([]);
      setAttachmentFile(null);
      setIsAddMessageOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice) return;
    setSaving(true);
    try {
      let attachment_url: string | undefined = editingNotice.attachment_url;
      if (editAttachmentFile) {
        const result = await upload(editAttachmentFile);
        if (result) attachment_url = result;
      }

      const target = editAudience.length === 0 ? "all" : (AUDIENCE_MAP[editAudience[0]] ?? editAudience[0].toLowerCase());
      await updateNotice(editingNotice._id, {
        title: editTitle,
        content: editContent,
        publish_date: editDate,
        target_audience: target as any,
        attachment_url,
      });

      setIsEditOpen(false);
      setEditingNotice(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNotice(id);
    setDeleteConfirmId(null);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notice Board</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="hover:text-[#1E3A5F] cursor-pointer">Announcement</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Notice Board</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#1E3A5F] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#1E3A5F] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
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
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
          
          <button 
            onClick={() => setIsAddMessageOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white text-[13px] font-semibold rounded-lg hover:bg-[#162C47] transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Message
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 bg-transparent pt-2">
        <label className="flex items-center gap-2 cursor-pointer mr-auto sm:mr-0">
          <input 
            type="checkbox" 
            checked={selectAll}
            onChange={toggleSelectAll}
            className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] w-4 h-4 cursor-pointer"
          />
          <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">Mark & Delete All</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" /> {selectedDateRange}
            </button>
            {isDateRangeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                  {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year", "Next Year", "Custom Range"].map((item) => (
                    <button key={item} onClick={() => { setSelectedDateRange(item); setIsDateRangeOpen(false); }} className={`w-full px-4 py-2 text-[13px] text-left transition-colors cursor-pointer ${item === selectedDateRange ? "bg-[#1E3A5F] text-white font-semibold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Filter <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-full sm:w-[320px] bg-white dark:bg-slate-900 border border-border rounded-lg shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-50 flex flex-col text-left">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-bold text-[#0F172A] dark:text-slate-100 text-[16px]">Filter</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-[#0F172A] dark:text-slate-200">Audience</label>
                      <div className="relative">
                        <select className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-border rounded-md text-[13px] appearance-none outline-none text-slate-600 dark:text-slate-300 cursor-pointer">
                          <option>All</option>
                          <option>Students</option>
                          <option>Teachers</option>
                          <option>Parents</option>
                          <option>Staff</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex justify-end gap-3 bg-white dark:bg-slate-900 rounded-b-lg border-t border-border mt-2">
                    <button onClick={() => setIsFilterOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 text-[13px] font-bold rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Reset</button>
                    <button onClick={() => setIsFilterOpen(false)} className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#162C47] text-white text-[13px] font-bold rounded-md transition-colors shadow-sm cursor-pointer">Apply</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notice List */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left mt-4">
        {loading ? (
          <div className="px-6 py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F] mx-auto" />
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-[13px]">Loading notices...</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 text-[13px]">
            No notices found. Click &quot;Add Message&quot; to post one.
          </div>
        ) : (
          <DataTable 
            columns={[
              { header: "Title", accessorKey: "title", render: (item) => (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-[#1E3A5F]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-[#0F172A] dark:text-slate-100 block">{item.title}</span>
                      {item.target_audience && item.target_audience !== "all" && (
                        <span className="text-[11px] text-slate-400 capitalize">→ {item.target_audience}</span>
                      )}
                    </div>
                  </div>
              )},
              { header: "Date", accessorKey: "publish_date", render: (item) => (
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>Added on : {formatDate(item.publish_date || item.createdAt)}</span>
                  </div>
              )},
              { header: "Action", sortable: false, className: "text-center w-24", render: (item) => (
                  <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E3A5F] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(item._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
            ]}
            data={notices}
            selectionHeader={<input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer" />}
            renderSelection={(item) => <input type="checkbox" checked={selectedNotices.includes(item._id)} onChange={() => toggleSelect(item._id)} className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer" />}
          />
        )}
      </div>

      {/* Load More */}
      <div className="flex justify-center pt-4 pb-8">
        <button className="px-6 py-2.5 bg-[#1E3A5F] hover:bg-[#162C47] text-white text-[13px] font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Load More
        </button>
      </div>

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-[70] overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-3">Delete Notice?</h2>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-8">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2.5 bg-rose-500 text-white text-[14px] font-bold rounded-lg hover:bg-rose-600 cursor-pointer">Delete</button>
            </div>
          </div>
        </>
      )}

      {/* Add Notice Modal */}
      <Modal
        isOpen={isAddMessageOpen}
        onClose={() => setIsAddMessageOpen(false)}
        title="New Notice / Message"
        size="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-6 text-left">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Title</label>
            <input 
              type="text" 
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Parent-Teacher Meeting"
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors text-slate-700 dark:text-slate-200 text-[14px]" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Notice Date</label>
            <input 
              type="date" 
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors text-slate-700 dark:text-slate-200 text-[14px]" 
            />
          </div>

          <div className="p-5 bg-[#EEF2FF] dark:bg-indigo-900/20 border border-[#E0E7FF] dark:border-indigo-500/20 rounded-xl space-y-3">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Attachment</label>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Upload size of 4MB, Accepted Format PDF</p>
            <label className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#162C47] text-white text-[13px] font-semibold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm">
              <FileText className="w-4 h-4" /> 
              {attachmentFile ? attachmentFile.name : "Choose File"}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Message</label>
            <textarea 
              required
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Write your notice here..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors text-slate-700 dark:text-slate-200 text-[14px] min-h-[120px] resize-y" 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Message To</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3">
              {["Student", "Accountant", "Parent", "Librarian", "Admin", "Receptionist", "Teacher", "Super Admin"].map(role => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formAudience.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) setFormAudience([...formAudience, role]);
                      else setFormAudience(formAudience.filter(r => r !== role));
                    }}
                    className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] w-4 h-4 cursor-pointer" 
                  />
                  <span className="text-[14px] text-slate-700 dark:text-slate-300">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsAddMessageOpen(false)} className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
            <button 
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-2.5 bg-[#1E3A5F] text-white text-[14px] font-bold rounded-lg hover:bg-[#162C47] transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              Add New Message
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Notice Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingNotice(null); }}
        title="Edit Notice / Message"
        size="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-6 text-left">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Title</label>
            <input 
              type="text" 
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Parent-Teacher Meeting"
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors text-slate-700 dark:text-slate-200 text-[14px]" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Notice Date</label>
            <input 
              type="date" 
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors text-slate-700 dark:text-slate-200 text-[14px]" 
            />
          </div>

          <div className="p-5 bg-[#EEF2FF] dark:bg-indigo-900/20 border border-[#E0E7FF] dark:border-indigo-500/20 rounded-xl space-y-3">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Attachment</label>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              {editingNotice?.attachment_url
                ? "Current file attached. Upload new to replace."
                : "Upload size of 4MB, Accepted Format PDF"}
            </p>
            <label className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#162C47] text-white text-[13px] font-semibold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm">
              <FileText className="w-4 h-4" /> 
              {editAttachmentFile ? editAttachmentFile.name : (editingNotice?.attachment_url ? "Replace File" : "Choose File")}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setEditAttachmentFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Message</label>
            <textarea 
              required
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write your notice here..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors text-slate-700 dark:text-slate-200 text-[14px] min-h-[120px] resize-y" 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Message To</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3">
              {["Student", "Accountant", "Parent", "Librarian", "Admin", "Receptionist", "Teacher", "Super Admin"].map(role => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editAudience.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) setEditAudience([...editAudience, role]);
                      else setEditAudience(editAudience.filter(r => r !== role));
                    }}
                    className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] w-4 h-4 cursor-pointer" 
                  />
                  <span className="text-[14px] text-slate-700 dark:text-slate-300">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => { setIsEditOpen(false); setEditingNotice(null); }} className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
            <button 
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-2.5 bg-[#1E3A5F] text-white text-[14px] font-bold rounded-lg hover:bg-[#162C47] transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
