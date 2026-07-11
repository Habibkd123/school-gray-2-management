"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Plus, Edit2, Trash2, Loader2, Save } from "lucide-react";
import { useFeeMasters, useFeeGroups, useFeeTypes } from "@/app/hooks/useFees";

export default function FeesMasterPage() {
  const { masters, loading: mastersLoading, createMaster, updateMaster, deleteMaster } = useFeeMasters();
  const { groups, loading: groupsLoading } = useFeeGroups();
  const { types, loading: typesLoading } = useFeeTypes();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [form, setForm] = useState({
    fee_group_id: "",
    fee_type_id: "",
    amount: "",
    due_date: ""
  });
  const [saving, setSaving] = useState(false);

  const filteredMasters = masters.filter(m => {
    const groupName = typeof m.fee_group_id === 'object' ? m.fee_group_id?.name || "" : "";
    const typeName = typeof m.fee_type_id === 'object' ? m.fee_type_id?.name || "" : "";
    const term = searchTerm.toLowerCase();
    return groupName.toLowerCase().includes(term) || typeName.toLowerCase().includes(term);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      amount: Number(form.amount)
    };
    if (editItem) {
      await updateMaster(editItem._id, payload);
    } else {
      await createMaster(payload);
    }
    setSaving(false);
    setIsAddOpen(false);
    setEditItem(null);
    setForm({ fee_group_id: "", fee_type_id: "", amount: "", due_date: "" });
  };

  const handleEdit = (m: any) => {
    setEditItem(m);
    setForm({
      fee_group_id: typeof m.fee_group_id === 'object' ? m.fee_group_id._id : m.fee_group_id,
      fee_type_id: typeof m.fee_type_id === 'object' ? m.fee_type_id._id : m.fee_type_id,
      amount: m.amount.toString(),
      due_date: new Date(m.due_date).toISOString().split('T')[0]
    });
    setIsAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Fee Master record?")) {
      const res = await deleteMaster(id);
      if (!res.success) alert(res.message);
    }
  };

  const loading = mastersLoading || groupsLoading || typesLoading;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fees Master</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/fees-collection" className="hover:text-primary">Fees Collection</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Fees Master</span>
          </div>
        </div>

        <button 
          onClick={() => { setEditItem(null); setForm({ fee_group_id: "", fee_type_id: "", amount: "", due_date: "" }); setIsAddOpen(true); }}
          className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Fee Master
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Controls Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="card-subtitle flex items-center gap-2 text-[13px]">
            <span>Showing</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredMasters.length}</span>
            <span>fee master records</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by group or type..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="erp-table text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Fee Group</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Fee Type</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Amount</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Due Date</th>
                <th className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td>
                </tr>
              ) : filteredMasters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">No fee master records found.</td>
                </tr>
              ) : filteredMasters.map((m) => (
                <tr key={m._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                    {typeof m.fee_group_id === 'object' ? m.fee_group_id.name : "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {typeof m.fee_type_id === 'object' ? m.fee_type_id.name : "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    ${m.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {new Date(m.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(m)} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(m._id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editItem ? "Edit Fee Master" : "Add Fee Master"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Fee Group</label>
                <select required value={form.fee_group_id} onChange={e => setForm({...form, fee_group_id: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors">
                  <option value="">Select Fee Group</option>
                  {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Fee Type</label>
                <select required value={form.fee_type_id} onChange={e => setForm({...form, fee_type_id: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors">
                  <option value="">Select Fee Type</option>
                  {types.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Amount</label>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" placeholder="0.00" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Due Date</label>
                <input required type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
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
