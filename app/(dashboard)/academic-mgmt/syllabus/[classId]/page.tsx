"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, BookOpen, User, AlertCircle, BarChart3,
  ChevronLeft, ArrowLeft, Search, RefreshCw, ChevronDown,
  MoreVertical, CheckCircle2, History, Globe, Lock, ArrowRight, Eye, Edit
} from "lucide-react";
import { useSyllabus, SyllabusData } from "@/app/hooks/useSyllabus";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";
import { useAuth } from "@/app/context/auth";
import { Modal } from "@/app/components/ui/modal";

export default function SyllabusClassSubjectListPage() {
  const router = useRouter();
  const params = useParams<{ classId: string }>();
  const classId = params?.classId || "";

  const { academicYear } = useAppState();
  const { user } = useAuth();
  
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const isTeacher = user?.role === "teacher";
  const isStudentOrParent = user?.role === "student" || user?.role === "parent";

  const {
    syllabi,
    isLoading,
    error,
    fetchSyllabus,
    deleteSyllabus
  } = useSyllabus();

  const { classes } = useClasses({ filterByYear: false });

  const [searchTerm, setSearchTerm] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  
  // Delete action states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSyllabus, setSelectedSyllabus] = useState<SyllabusData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClassSyllabi = useCallback(() => {
    fetchSyllabus({
      academic_year: academicYear,
      class_id: classId,
      limit: 1000
    });
  }, [fetchSyllabus, academicYear, classId]);

  useEffect(() => {
    if (classId) {
      fetchClassSyllabi();
    }
  }, [classId, fetchClassSyllabi]);

  const activeClass = useMemo(() => {
    return classes.find(c => c._id === classId);
  }, [classes, classId]);

  const filteredSyllabi = useMemo(() => {
    if (!searchTerm.trim()) return syllabi;
    const term = searchTerm.toLowerCase().trim();
    return syllabi.filter(s => {
      const subjectName = s.subject_master_id?.name || "";
      const teacherName = s.teacher_id?.name || "";
      const title = s.title || "";
      return (
        subjectName.toLowerCase().includes(term) ||
        teacherName.toLowerCase().includes(term) ||
        title.toLowerCase().includes(term)
      );
    });
  }, [syllabi, searchTerm]);

  // Compute aggregated stats
  const classStats = useMemo(() => {
    let totalChapters = 0;
    let completedChapters = 0;

    syllabi.forEach(s => {
      const nodes = s.nodes || [];
      totalChapters += nodes.length;
      completedChapters += nodes.filter((n: any) => n.resources?.some((r: any) => r.type === "youtube") || false).length; 
    });

    const percent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    return { totalChapters, completedChapters, percent };
  }, [syllabi]);

  const handleDelete = async () => {
    if (!selectedSyllabus?._id) return;
    setDeleting(true);
    const res = await deleteSyllabus(selectedSyllabus._id);
    setDeleting(false);
    setIsDeleteOpen(false);
    setSelectedSyllabus(null);
    if (res.success) {
      fetchClassSyllabi();
    } else {
      alert(res.message || "Failed to delete syllabus");
    }
  };

  const className = activeClass?.name || "Class";
  const sectionName = activeClass?.section || "";
  const classTeacherName = activeClass?.class_teacher_id?.name || "Not Assigned";

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Link href="/academic-mgmt/syllabus" className="p-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer animate-in fade-in">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Link>
            Class Syllabus
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-2 font-normal">
            <Link href="/academic-mgmt/syllabus" className="hover:text-primary transition-colors">Syllabus</Link>
            <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            <span className="text-slate-900 dark:text-white font-medium">{className} {sectionName ? `- ${sectionName}` : ''}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchClassSyllabi} className="btn btn-outline p-2 w-9 h-9">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-350 shadow-sm font-mono">
            Academic Year: {academicYear}
          </div>
        </div>
      </div>

      {/* Class Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm text-left font-medium">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Class Teacher</p>
            <p className="text-[15px] font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{classTeacherName}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm text-left font-medium">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Total Subjects</p>
            <p className="text-[20px] font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{syllabi.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm text-left font-medium">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Chapters / Topics</p>
            <p className="text-[20px] font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{isLoading ? "..." : classStats.totalChapters}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm text-left font-medium">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Overall Progress</p>
              <span className="text-[14px] font-bold text-emerald-500">{isLoading ? "..." : `${classStats.percent}%`}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${isLoading ? 0 : classStats.percent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left">
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
          <div className="text-[14px] font-bold text-slate-700 dark:text-slate-205">
            Class Curriculum Matrix
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-550 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search subject, teacher..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-850 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Cards list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-40 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredSyllabi.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm gap-3 text-slate-400">
          <BookOpen className="w-10 h-10 opacity-30" />
          <p className="font-medium text-[14px]">No subjects with syllabus found for this class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredSyllabi.map((s) => {
            const subjectName = s.subject_master_id?.name || "Subject";
            const teacherName = s.teacher_id?.name || "Not Assigned";
            const totalNodes = s.nodes?.length || 0;
            const isPublished = s.status === "Published";

            return (
              <div key={s._id} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden flex flex-col justify-between text-left hover:shadow-md transition-shadow group animate-in fade-in h-fit">
                <div>
                  <div className="p-5 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/10">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight">
                          {subjectName}
                        </h4>
                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" /> <span className="font-semibold text-slate-700 dark:text-slate-300">{teacherName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 relative">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPublished ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                      }`}>
                        {s.status || "Draft"}
                      </span>

                      {!isStudentOrParent && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === s._id ? null : s._id || null);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-550 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeDropdownId === s._id && (
                            <>
                              <div className="fixed inset-0 z-45" onClick={(e) => { e.stopPropagation(); setActiveDropdownId(null); }} />
                              <div className="absolute right-0 top-7 w-44 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left font-medium">
                                <button
                                  type="button"
                                  onClick={() => {
                                    router.push(`/academic-mgmt/syllabus/${classId}/${s._id}`);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer font-bold"
                                >
                                  <Eye className="w-4 h-4 text-slate-400" /> View Syllabus
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSyllabus(s);
                                      setIsDeleteOpen(true);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 transition-colors cursor-pointer font-bold"
                                  >
                                    🗑 Delete
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-3 font-medium text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between text-xs">
                      <span>Curriculum Title:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">{s.title}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Syllabus Version:</span>
                      <span className="font-mono bg-slate-100 dark:bg-slate-855 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-bold">v{s.version}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Chapters Map:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-250">{totalNodes} units/topics</span>
                    </div>
                    {s.updatedAt && (
                      <p className="text-[11px] text-slate-400 mt-2 font-semibold">Last updated: {new Date(s.updatedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                <Link href={`/academic-mgmt/syllabus/${classId}/${s._id}`} className="p-3 border-t border-border/50 bg-slate-50 dark:bg-slate-855/50 flex items-center justify-center gap-2 text-[13px] font-bold text-blue-500 group-hover:text-blue-650 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  View Syllabus Details <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Syllabus">
        <div className="space-y-5 text-left font-medium">
          <p className="text-[14px] text-slate-655 dark:text-slate-300">
            Are you sure you want to delete the syllabus record for <span className="font-bold text-red-500">{selectedSyllabus?.subject_master_id?.name}</span>?
            <br /><br />
            <span className="text-red-500 font-bold bg-red-50 dark:bg-red-955/20 p-2 rounded block">Warning: This action is permanent and cannot be undone!</span>
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-[14px] rounded-lg cursor-pointer">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer">
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
