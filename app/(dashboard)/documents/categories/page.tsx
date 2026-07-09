"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Search, X } from "lucide-react";
import {
  getCategories, saveCategory, deleteCategory, BUILT_IN_CATEGORIES
} from "@/app/components/document-builder/store";
import type { DocumentCategory } from "@/app/components/document-builder/types";
import {
  GraduationCap, Users, Award, CreditCard, ClipboardList,
  Bell, Megaphone, FileText, File
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap size={22} />,
  Users: <Users size={22} />,
  Award: <Award size={22} />,
  CreditCard: <CreditCard size={22} />,
  ClipboardList: <ClipboardList size={22} />,
  Bell: <Bell size={22} />,
  Megaphone: <Megaphone size={22} />,
  FileText: <FileText size={22} />,
  File: <File size={22} />,
};

const BUILT_IN_IDS = new Set(BUILT_IN_CATEGORIES.map((c) => c.id));

const COLOR_OPTIONS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500",
  "bg-rose-500", "bg-orange-500", "bg-cyan-500", "bg-indigo-500",
  "bg-slate-500", "bg-pink-500", "bg-teal-500",
];

const ICON_OPTIONS = ["FileText", "File", "Users", "GraduationCap", "Award", "CreditCard", "ClipboardList", "Bell", "Megaphone"];

const COLOR_MAP: Record<string, string> = {
  "bg-blue-500": "#3B82F6",
  "bg-emerald-500": "#10B981",
  "bg-amber-500": "#F59E0B",
  "bg-violet-500": "#8B5CF6",
  "bg-rose-500": "#F43F5E",
  "bg-orange-500": "#F97316",
  "bg-cyan-500": "#06B6D4",
  "bg-indigo-500": "#6366F1",
  "bg-slate-500": "#64748B",
  "bg-pink-500": "#EC4899",
  "bg-teal-500": "#14B8A6",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<DocumentCategory | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "FileText", color: "bg-blue-500" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCategories(getCategories());
  }, []);

  const refresh = () => setCategories(getCategories());

  const filtered = categories.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingCat(null);
    setForm({ name: "", description: "", icon: "FileText", color: "bg-blue-500" });
    setIsModalOpen(true);
  };

  const openEdit = (cat: DocumentCategory) => {
    setEditingCat(cat);
    setForm({ name: cat.name, description: cat.description ?? "", icon: cat.icon, color: cat.color });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const cat: DocumentCategory = {
      id: editingCat?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon,
      color: form.color,
      isCustom: true,
    };
    saveCategory(cat);
    refresh();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this category?")) return;
    deleteCategory(id);
    refresh();
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Document Categories</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span>Documents</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Categories</span>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-[var(--primary-hover)] rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-[13px] border border-border rounded-lg outline-none focus:border-primary/50 transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((cat) => {
          const isBuiltIn = BUILT_IN_IDS.has(cat.id);
          const bgHex = COLOR_MAP[cat.color] ?? "#1E3A5F";
          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow p-5 flex flex-col gap-4 group hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div
                  style={{ backgroundColor: bgHex }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
                >
                  {ICON_MAP[cat.icon] ?? <FileText size={20} />}
                </div>
                {!isBuiltIn && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(cat)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-[#F0F4F8] transition-colors">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
                {isBuiltIn && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Built-in</span>
                )}
              </div>
              <div>
                <p className="text-[14px] font-bold text-slate-900 dark:text-white mb-1">{cat.name}</p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{cat.description || "No description"}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{editingCat ? "Edit Category" : "Create Category"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Category name" className="w-full px-3 py-2 text-[13px] border border-border rounded-lg outline-none focus:border-primary/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" className="w-full px-3 py-2 text-[13px] border border-border rounded-lg outline-none focus:border-primary/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      style={{ backgroundColor: COLOR_MAP[color] }}
                      className={`w-7 h-7 rounded-full transition-all ${form.color === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all text-slate-600 dark:text-slate-300 ${form.icon === icon ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
                    >
                      {ICON_MAP[icon]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.name.trim()} className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-primary hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
