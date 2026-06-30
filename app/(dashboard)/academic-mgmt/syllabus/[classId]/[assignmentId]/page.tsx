"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Loader2, AlertCircle, Trash2, Edit2, CheckCircle2, Circle, PlayCircle, BookOpen, User, Calendar, BarChart3, ChevronLeft, ArrowLeft } from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { useTeacherAssignment, PopulatedTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useSyllabus, SyllabusChapter } from "@/app/hooks/useSyllabus";
import { useAuth } from "@/app/context/auth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function SyllabusDetailsPage() {
  const router = useRouter();
  const params = useParams<{ classId: string, assignmentId: string }>();
  const classId = params?.classId || "";
  const assignmentId = params?.assignmentId || "";
  
  const { user } = useAuth();

  const { assignments, isLoading: loadingAssignments, fetchAssignments } = useTeacherAssignment();
  const { syllabus, isLoading: loadingSyllabus, fetchSyllabus, saveSyllabus } = useSyllabus();

  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const isTeacher = user?.role === "teacher";
  const isAuthorized = isAdmin || isTeacher;

  const [activeAssignment, setActiveAssignment] = useState<PopulatedTeacherAssignment | null>(null);

  // Form states for new/edit chapter
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formChapter, setFormChapter] = useState<Partial<SyllabusChapter>>({
    status: "Not Started"
  });
  const [submitting, setSubmitting] = useState(false);

  // Toast message states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 6000);
  };

  useEffect(() => {
    if (!assignments || assignments.length === 0) {
      fetchAssignments({ limit: 5000 });
    }
  }, [assignments, fetchAssignments]);

  useEffect(() => {
    if (assignmentId) {
      if (assignments && assignments.length > 0) {
        const assignment = assignments.find(a => a._id === assignmentId);
        setActiveAssignment(assignment || null);
      }
      fetchSyllabus(assignmentId);
    }
  }, [assignmentId, assignments, fetchSyllabus]);

  const handleAddChapter = () => {
    setEditingIndex(null);
    setFormChapter({ status: "Not Started" });
    setIsChapterModalOpen(true);
  };

  const handleEditChapter = (index: number, chapter: SyllabusChapter) => {
    setEditingIndex(index);
    setFormChapter(chapter);
    setIsChapterModalOpen(true);
  };

  const handleDeleteChapter = async (index: number) => {
    if (!syllabus || !confirm("Are you sure you want to delete this chapter?")) return;
    const updatedChapters = [...syllabus.chapters];
    updatedChapters.splice(index, 1);
    const res = await saveSyllabus(assignmentId, updatedChapters);
    if (res.success) {
      showSuccess("Chapter deleted successfully");
    } else {
      showError(res.message || "Failed to delete chapter");
    }
  };

  const handleStatusChange = async (index: number, newStatus: "Not Started" | "In Progress" | "Completed") => {
    if (!syllabus) return;
    const updatedChapters = [...syllabus.chapters];
    updatedChapters[index].status = newStatus;
    const res = await saveSyllabus(assignmentId, updatedChapters);
    if (res.success) {
      showSuccess(`Status updated to "${newStatus}"`);
    } else {
      showError(res.message || "Failed to update status");
    }
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabus && editingIndex !== null) return;
    setSubmitting(true);

    const newChapter = { ...formChapter } as any;
    if (!newChapter.start_date) delete newChapter.start_date;
    if (!newChapter.target_date) delete newChapter.target_date;
    
    let updatedChapters = [...(syllabus?.chapters || [])];

    if (editingIndex !== null) {
      updatedChapters[editingIndex] = newChapter;
    } else {
      if (!newChapter.chapter_no) {
        newChapter.chapter_no = updatedChapters.length > 0 ? Math.max(...updatedChapters.map(c => Number(c.chapter_no) || 0)) + 1 : 1;
      }
      updatedChapters.push(newChapter);
    }

    updatedChapters.sort((a, b) => Number(a.chapter_no) - Number(b.chapter_no));

    const res = await saveSyllabus(assignmentId, updatedChapters);
    if (res.success) {
      setIsChapterModalOpen(false);
      showSuccess(editingIndex !== null ? "Chapter updated successfully" : "Chapter added successfully");
    } else {
      showError(res.message || "Failed to save chapter");
    }
    setSubmitting(false);
  };

  const stats = useMemo(() => {
    if (!syllabus?.chapters || syllabus.chapters.length === 0) {
      return { total: 0, completed: 0, inProgress: 0, notStarted: 0, percent: 0 };
    }
    const counts = { total: 0, completed: 0, inProgress: 0, notStarted: 0 };
    syllabus.chapters.forEach(c => {
      counts.total++;
      if (c.status === "Completed") counts.completed++;
      else if (c.status === "In Progress") counts.inProgress++;
      else counts.notStarted++;
    });
    const percent = Math.round((counts.completed / counts.total) * 100);
    return { ...counts, percent };
  }, [syllabus]);

  if (loadingAssignments) {
    return (
      <div className="flex items-center justify-center py-40 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!activeAssignment) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 text-slate-400">
        <AlertCircle className="w-10 h-10 opacity-30" />
        <p className="font-medium text-[14px]">Assignment not found</p>
        <button onClick={() => router.back()} className="mt-2 text-blue-500 hover:underline text-sm font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Link href={`/academic-mgmt/syllabus/${classId}`} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Link>
            Syllabus Details
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            <Link href="/academic-mgmt/syllabus" className="hover:text-primary transition-colors">Syllabus</Link>
            <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            <Link href={`/academic-mgmt/syllabus/${classId}`} className="hover:text-primary transition-colors">
              {activeAssignment.class_id?.name} {activeAssignment.section_id ? `- ${activeAssignment.section_id.name}` : ''}
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            <span className="text-slate-900 dark:text-white font-bold">{activeAssignment.subject_master_id?.name}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Course Progress</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-800 dark:text-white">{stats.percent}%</span>
                <span className="text-[11px] text-slate-400 font-semibold">completed</span>
              </div>
              <div className="w-36 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${stats.percent}%` }} />
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Chapters</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.total}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Syllabus segments</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-505 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.inProgress}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Underway</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-505 flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Not Started</span>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.notStarted}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Pending kickoff</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Circle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
          {/* Syllabus Header */}
          <div className="p-5 border-b border-border bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded text-xs font-bold tracking-wide">
                  {activeAssignment.class_id?.name}
                  {activeAssignment.stream_id ? ` - ${activeAssignment.stream_id.name}` : ''}
                  {activeAssignment.section_id ? ` (${activeAssignment.section_id.name})` : ''}
                </span>
                <span className="bg-primary/10 text-primary px-2.5 py-1 rounded text-xs font-bold tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> {activeAssignment.subject_master_id?.name}
                </span>
                <span className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2.5 py-1 rounded text-xs font-bold tracking-wide font-mono">
                  {activeAssignment.academic_year}
                </span>
              </div>
              <p className="text-sm font-medium flex items-center gap-2 mt-2 text-slate-650 dark:text-slate-305">
                <User className="w-4 h-4 text-slate-400" /> Taught by <b className="text-slate-800 dark:text-slate-100">{activeAssignment.teacher_id?.name}</b>
              </p>
            </div>
            {isAuthorized && (
              <button onClick={handleAddChapter} className="px-4 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 shrink-0 cursor-pointer">
                <Plus className="w-4 h-4" /> Add Chapter
              </button>
            )}
          </div>

          {/* Chapters List (Timeline style) */}
          <div className="p-6">
            {loadingSyllabus ? (
              <div className="flex justify-center py-20 text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : syllabus?.chapters && syllabus.chapters.length > 0 ? (
              <div className="relative text-left border-l-2 border-slate-100 dark:border-slate-850 pl-5.5 ml-3.5 space-y-6">
                {syllabus.chapters.map((ch, idx) => (
                  <div key={idx} className="relative group p-5 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-800/30 border border-border rounded-xl shadow-sm transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left timeline status dot */}
                    <div className="absolute -left-[30px] top-6 w-[18px] h-[18px] rounded-full bg-white dark:bg-slate-900 flex items-center justify-center z-10 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        ch.status === "Completed" ? "bg-emerald-500" :
                        ch.status === "In Progress" ? "bg-amber-500" :
                        "bg-slate-300 dark:bg-slate-700"
                      }`} />
                    </div>

                    <div className="flex items-start gap-4">
                      <div>
                        <h4 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="text-slate-405 font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">CH {ch.chapter_no}</span>
                          {ch.chapter_name}
                        </h4>
                        {ch.description && <p className="text-[13px] text-slate-500 mt-1.5 max-w-2xl dark:text-slate-400 font-medium leading-relaxed">{ch.description}</p>}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Start: <span className="text-slate-650 dark:text-slate-302">{ch.start_date ? new Date(ch.start_date).toLocaleDateString() : "Not set"}</span></span>
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Target: <span className="text-slate-650 dark:text-slate-302">{ch.target_date ? new Date(ch.target_date).toLocaleDateString() : "Not set"}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 md:ml-auto self-start md:self-auto">
                      <select 
                        value={ch.status} 
                        onChange={(e) => handleStatusChange(idx, e.target.value as any)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 outline-none appearance-none pr-8 bg-no-repeat bg-[right_10px_center] cursor-pointer shadow-sm ${
                          ch.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                          ch.status === 'In Progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-300'
                        }`}
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22currentColor%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundSize: '8px' }}
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>

                      {isAuthorized && (
                        <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditChapter(idx, ch)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteChapter(idx)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <BookOpen className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">No chapters added yet.</p>
                {isAuthorized && <button onClick={handleAddChapter} className="mt-3 text-sm text-blue-500 hover:underline font-bold cursor-pointer">Add first chapter</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Chapter Modal */}
      <Modal isOpen={isChapterModalOpen} onClose={() => setIsChapterModalOpen(false)} title={editingIndex !== null ? "Edit Chapter" : "Add New Chapter"}>
        <form onSubmit={handleSaveChapter} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1 flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold">Ch. No <span className="text-red-500">*</span></label>
              <input type="number" required min="1"
                value={formChapter.chapter_no || ''} 
                onChange={(e) => setFormChapter({...formChapter, chapter_no: parseInt(e.target.value)})}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
            </div>
            <div className="sm:col-span-3 flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold">Chapter Name <span className="text-red-500">*</span></label>
              <input type="text" required
                value={formChapter.chapter_name || ''} 
                onChange={(e) => setFormChapter({...formChapter, chapter_name: e.target.value})}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold">Description</label>
            <textarea rows={2}
              value={formChapter.description || ''} 
              onChange={(e) => setFormChapter({...formChapter, description: e.target.value})}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary resize-none dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold">Start Date <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input type="date"
                value={formChapter.start_date ? new Date(formChapter.start_date).toISOString().split('T')[0] : ''} 
                onChange={(e) => setFormChapter({...formChapter, start_date: e.target.value})}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold">Target Date <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input type="date"
                value={formChapter.target_date ? new Date(formChapter.target_date).toISOString().split('T')[0] : ''} 
                onChange={(e) => setFormChapter({...formChapter, target_date: e.target.value})}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold">Status</label>
            <select 
              value={formChapter.status} 
              onChange={(e) => setFormChapter({...formChapter, status: e.target.value as any})}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => setIsChapterModalOpen(false)}
              className="px-5 py-2 bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 text-[13px] font-bold rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save Chapter
            </button>
          </div>
        </form>
      </Modal>

      {/* Toasts */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[3]" />
          <span className="text-[13px] font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="w-4 h-4 shrink-0 stroke-[3]" />
          <span className="text-[13px] font-medium">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
