"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Plus, Edit2, Trash2, Loader2, Save } from "lucide-react";
import { useFeeTypes } from "@/app/hooks/useFees";

export default function FeesTypePage() {
  const { types, loading, createType, updateType, deleteType } = useFeeTypes();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const filteredTypes = types.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editItem) {
      await updateType(editItem._id, form);
    } else {
      await createType(form);
    }
    setSaving(false);
    setIsAddOpen(false);
    setEditItem(null);
    setForm({ name: "", description: "" });
  };

  const handleEdit = (t: any) => {
    setEditItem(t);
    setForm({ name: t.name, description: t.description || "" });
    setIsAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Fee Type?")) {
      const res = await deleteType(id);
      if (!res.success) alert(res.message);
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fees Type</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/fees-collection" className="hover:text-primary">Fees Collection</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Fees Type</span>
          </div>
        </div>

        <button 
          onClick={() => { setEditItem(null); setForm({ name: "", description: "" }); setIsAddOpen(true); }}
          className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Fee Type
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Controls Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            <span>Showing</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredTypes.length}</span>
            <span>fee types</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Description</th>
                <th className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">No fee types found.</td>
                </tr>
              ) : filteredTypes.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{t.name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.description || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(t._id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editItem ? "Edit Fee Type" : "Add Fee Type"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" placeholder="e.g. Tuition Fee" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors min-h-[100px]" placeholder="Optional description..." />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
