"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, Edit2, Trash2, BookOpen, Loader2, Clock, CheckCircle2, 
  Circle, PlayCircle, AlertCircle, BookMarked, Layers, BarChart3
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { useClasses } from "../../../hooks/useClasses";
import { useSubjects } from "../../../hooks/useSubjects";
import { useSyllabus, ApiSyllabusChapter, ApiSyllabus } from "../../../hooks/useSyllabus";

export default function ClassSyllabusPage() {
  const { classes, isLoading: loadingClasses } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Load subjects of selected class
  const { rawSubjects, loading: loadingSubjects } = useSubjects(selectedClassId || undefined, { skip: !selectedClassId });

  // Load syllabus for selected class + subject
  const { syllabi, loading: loadingSyllabus, createSyllabus, updateSyllabus, deleteSyllabus } = useSyllabus(
    selectedClassId || undefined,
    selectedSubjectId || undefined,
    { skip: !selectedClassId || !selectedSubjectId }
  );

  const syllabus: ApiSyllabus | undefined = useMemo(() => {
    return syllabi.find(
      s => 
        (typeof s.class_id === "object" ? s.class_id._id : s.class_id) === selectedClassId &&
        (typeof s.subject_id === "object" ? s.subject_id._id : s.subject_id) === selectedSubjectId
    );
  }, [syllabi, selectedClassId, selectedSubjectId]);

  // Form modals state
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterDescription, setChapterDescription] = useState("");
  const [chapterHours, setChapterHours] = useState<number>(0);
  const [chapterStatus, setChapterStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [saving, setSaving] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    if (!syllabus || !syllabus.chapters || syllabus.chapters.length === 0) {
      return { totalChapters: 0, totalHours: 0, completedChapters: 0, progressPercent: 0 };
    }
    const totalChapters = syllabus.chapters.length;
    const totalHours = syllabus.chapters.reduce((sum, ch) => sum + (ch.hours_allocated || 0), 0);
    const completedChapters = syllabus.chapters.filter(ch => ch.status === "completed").length;
    const progressPercent = Math.round((completedChapters / totalChapters) * 100);
    return { totalChapters, totalHours, completedChapters, progressPercent };
  }, [syllabus]);

  // Reset subject selection when class changes
  useEffect(() => {
    setSelectedSubjectId("");
  }, [selectedClassId]);

  const handleCreateSyllabus = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    setSaving(true);
    const res = await createSyllabus({
      class_id: selectedClassId,
      subject_id: selectedSubjectId,
      chapters: []
    });
    setSaving(false);
    if (!res.success) {
      alert(res.message || "Failed to create syllabus");
    }
  };

  const handleOpenAddChapter = () => {
    setEditingChapterIndex(null);
    setChapterTitle("");
    setChapterDescription("");
    setChapterHours(0);
    setChapterStatus("pending");
    setIsChapterModalOpen(true);
  };

  const handleOpenEditChapter = (index: number, chapter: ApiSyllabusChapter) => {
    setEditingChapterIndex(index);
    setChapterTitle(chapter.title);
    setChapterDescription(chapter.description || "");
    setChapterHours(chapter.hours_allocated || 0);
    setChapterStatus(chapter.status);
    setIsChapterModalOpen(true);
  };

  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabus) return;

    setSaving(true);
    const newChapter: ApiSyllabusChapter = {
      title: chapterTitle.trim(),
      description: chapterDescription.trim() || undefined,
      hours_allocated: chapterHours,
      status: chapterStatus
    };

    let updatedChapters = [...syllabus.chapters];
    if (editingChapterIndex !== null) {
      updatedChapters[editingChapterIndex] = newChapter;
    } else {
      updatedChapters.push(newChapter);
    }

    const res = await updateSyllabus(syllabus._id, { chapters: updatedChapters });
    setSaving(false);
    if (res.success) {
      setIsChapterModalOpen(false);
    } else {
      alert(res.message || "Failed to save chapter");
    }
  };

  const handleDeleteChapter = async (index: number) => {
    if (!syllabus) return;
    if (!confirm("Are you sure you want to delete this chapter?")) return;

    setSaving(true);
    const updatedChapters = syllabus.chapters.filter((_, i) => i !== index);
    const res = await updateSyllabus(syllabus._id, { chapters: updatedChapters });
    setSaving(false);
    if (!res.success) {
      alert(res.message || "Failed to delete chapter");
    }
  };

  const getStatusIcon = (status: "pending" | "in_progress" | "completed") => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50/10" />;
      case "in_progress": return <PlayCircle className="w-5 h-5 text-amber-500 fill-amber-50/10 animate-pulse" />;
      default: return <Circle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: "pending" | "in_progress" | "completed") => {
    switch (status) {
      case "completed":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Completed</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">In Progress</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Class Syllabus</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/academic" className="hover:text-[#F59E0B]">Academic</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Syllabus</span>
          </div>
        </div>
      </div>

      {/* Main Selection Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
        {/* Sidebar Selector */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-border pb-3">
            <Layers className="w-4 h-4 text-[#F59E0B]" /> Selection
          </h2>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Select Class</label>
            {loadingClasses ? (
              <div className="flex items-center gap-2 text-[13px] text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#F59E0B]" /> Loading classes...
              </div>
            ) : (
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] text-slate-800 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none cursor-pointer focus:border-[#F59E0B] transition-colors"
              >
                <option value="">Choose Class</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.section ? `- ${c.section}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Select Subject</label>
            {loadingSubjects ? (
              <div className="flex items-center gap-2 text-[13px] text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#F59E0B]" /> Loading subjects...
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full px-3 py-2 text-[13px] text-slate-800 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none cursor-pointer focus:border-[#F59E0B] disabled:opacity-50 transition-colors"
              >
                <option value="">Choose Subject</option>
                {rawSubjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Syllabus details view */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedClassId || !selectedSubjectId ? (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-12 text-center shadow-sm">
              <BookMarked className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-slate-800 dark:text-slate-200 font-bold text-[15px]">Select Class and Subject</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[13px] mt-1.5 max-w-sm mx-auto">
                Select a class and subject from the side panel to manage syllabus chapters and progress.
              </p>
            </div>
          ) : loadingSyllabus ? (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-12 text-center shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B] mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-[13px]">Loading Syllabus data...</p>
            </div>
          ) : !syllabus ? (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-12 text-center shadow-sm space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
              <div>
                <h3 className="text-slate-800 dark:text-slate-200 font-bold text-[15px]">Syllabus Not Configured</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[13px] mt-1.5 max-w-sm mx-auto">
                  No syllabus found for the selected subject and class. Click below to initialize a new syllabus.
                </p>
              </div>
              <button
                onClick={handleCreateSyllabus}
                disabled={saving}
                className="px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold rounded-lg shadow transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Syllabus
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Total Chapters</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{stats.totalChapters}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Total Teaching Hours</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{stats.totalHours} hrs</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Progress</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${stats.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{stats.progressPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chapters List */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-[14px]">Syllabus Chapters</h3>
                  <button
                    onClick={handleOpenAddChapter}
                    className="px-3.5 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[12px] font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Chapter
                  </button>
                </div>

                {syllabus.chapters.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-[13px]">
                    No chapters added to this syllabus yet. Click "Add Chapter" above to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {syllabus.chapters.map((chapter, index) => (
                      <div key={index} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors flex items-start gap-4 text-left">
                        <div className="mt-1 flex-shrink-0">
                          {getStatusIcon(chapter.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[14px]">{chapter.title}</h4>
                            {getStatusBadge(chapter.status)}
                          </div>
                          {chapter.description && (
                            <p className="text-slate-500 dark:text-slate-400 text-[12px] mt-1.5 leading-relaxed">{chapter.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {chapter.hours_allocated || 0} teaching hours
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditChapter(index, chapter)}
                            className="p-1.5 text-slate-400 hover:text-[#F59E0B] dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chapter Add/Edit Modal */}
      <Modal
        isOpen={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        title={editingChapterIndex !== null ? "Edit Chapter" : "Add Chapter"}
      >
        <form onSubmit={handleChapterSubmit} className="p-6 space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Chapter Title *</label>
            <input 
              type="text"
              value={chapterTitle}
              onChange={e => setChapterTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors"
              required
              placeholder="e.g. Chapter 1: Introduction to Mechanics"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Description</label>
            <textarea 
              value={chapterDescription}
              onChange={e => setChapterDescription(e.target.value)}
              className="w-full h-24 px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors resize-none"
              placeholder="Brief description of topics covered"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Teaching Hours</label>
              <input 
                type="number"
                min="0"
                value={chapterHours}
                onChange={e => setChapterHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Status</label>
              <div className="relative">
                <select 
                  value={chapterStatus}
                  onChange={e => setChapterStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none cursor-pointer focus:border-[#F59E0B] transition-colors appearance-none"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsChapterModalOpen(false)}
              className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving || !chapterTitle.trim()}
              className="px-4 py-2 bg-[#F59E0B] text-white text-[13px] font-bold rounded-lg hover:bg-[#D97706] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Chapter
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
