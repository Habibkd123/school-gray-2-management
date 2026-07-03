"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, BookOpen, GraduationCap, ArrowRight, User, AlertCircle, BarChart3, ChevronLeft, ArrowLeft, Search, RefreshCw, ChevronDown, MoreVertical, CheckCircle2 } from "lucide-react";
import { useTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";
import { useAuth } from "@/app/context/auth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils/session";
import { useSyllabus } from "@/app/hooks/useSyllabus";
import { Modal } from "@/app/components/ui/modal";

export default function SyllabusSubjectListPage() {
  const router = useRouter();
  const params = useParams<{ classId: string }>();
  const classId = params?.classId || "";

  const { academicYear } = useAppState();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const { assignments, isLoading: loadingAssignments, fetchAssignments } = useTeacherAssignment();

  const [syllabiStats, setSyllabiStats] = useState<Record<string, { total: number, completed: number, percent: number, updatedAt?: string, syllabusId?: string }>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const { teachers } = useTeachers();
  const { classes } = useClasses();
  const { deleteSyllabus } = useSyllabus();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const [activeDropdownCardKey, setActiveDropdownCardKey] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const handleDelete = async () => {
    if (!selectedSyllabusId) return;
    setDeleting(true);
    const res = await deleteSyllabus(selectedSyllabusId);
    setDeleting(false);
    setIsDeleteOpen(false);
    if (res.success) {
      showSuccess("Syllabus deleted successfully");
      fetchAssignments({ limit: 5000 });
    } else {
      showError(res.message || "Failed to delete syllabus");
    }
  };

  useEffect(() => {
    if (!assignments || assignments.length === 0) {
      fetchAssignments({ limit: 5000 });
    }
  }, [assignments, fetchAssignments]);

  const classAssignments = useMemo(() => {
    return assignments.filter(a => {
      const aClassId = typeof a.class_id === 'object' ? a.class_id?._id : a.class_id;
      if (aClassId !== classId || a.academic_year !== academicYear) return false;
      if (filterTeacherId) {
        const teacherId = typeof a.teacher_id === 'object' ? a.teacher_id?._id : a.teacher_id;
        if (teacherId !== filterTeacherId) return false;
      }
      return true;
    });
  }, [assignments, classId, academicYear, filterTeacherId]);

  const filteredAssignments = useMemo(() => {
    if (!searchTerm.trim()) return classAssignments;
    const term = searchTerm.toLowerCase().trim();
    return classAssignments.filter(a => {
      const subjectName = typeof a.subject_master_id === 'object' ? a.subject_master_id?.name : "";
      const teacherName = typeof a.teacher_id === 'object' ? a.teacher_id?.name : "";
      const streamName = a.stream_id ? (typeof a.stream_id === 'object' ? a.stream_id.name : "") : "";
      return subjectName.toLowerCase().includes(term) || teacherName.toLowerCase().includes(term) || streamName.toLowerCase().includes(term);
    });
  }, [classAssignments, searchTerm]);

  useEffect(() => {
    async function fetchAllStats() {
      if (classAssignments.length === 0) return;
      setLoadingStats(true);
      const stats: Record<string, any> = {};
      
      await Promise.all(classAssignments.map(async (a) => {
        try {
          const res = await fetch(`/api/syllabus?teacher_assignment_id=${a._id}`, { headers: getAuthHeaders() });
          const data = await res.json();
          if (res.ok && data.success && data.data) {
            const chapters = data.data.chapters || [];
            const total = chapters.length;
            const completed = chapters.filter((c: any) => c.status === "Completed").length;
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            stats[a._id] = { total, completed, percent, updatedAt: data.data.updatedAt, syllabusId: data.data._id };
          } else {
            stats[a._id] = { total: 0, completed: 0, percent: 0 };
          }
        } catch (e) {
          stats[a._id] = { total: 0, completed: 0, percent: 0 };
        }
      }));

      setSyllabiStats(stats);
      setLoadingStats(false);
    }

    fetchAllStats();
  }, [classAssignments]);

  const { totalClassChapters, classProgressPercent } = useMemo(() => {
    let totalChapters = 0;
    let completedChapters = 0;
    Object.values(syllabiStats).forEach(stat => {
      totalChapters += stat.total;
      completedChapters += stat.completed;
    });
    const percent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    return { totalClassChapters: totalChapters, classProgressPercent: percent };
  }, [syllabiStats]);

  if (loadingAssignments) {
    return (
      <div className="flex items-center justify-center py-40 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstAssignment = classAssignments[0];
  const className = firstAssignment?.class_id ? (typeof firstAssignment.class_id === 'object' ? firstAssignment.class_id.name : "Class") : "Class";
  const sectionName = firstAssignment?.section_id ? (typeof firstAssignment.section_id === 'object' ? firstAssignment.section_id.name : "") : "";

  const classObj = classes.find(c => c._id === classId);
  const classTeacherName = classObj?.class_teacher_id?.name || "Not Assigned";

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Link href="/academic-mgmt/syllabus" className="p-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Link>
            Subject Syllabus
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            <Link href="/academic-mgmt/syllabus" className="hover:text-primary transition-colors">Syllabus</Link>
            <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            <span className="text-slate-950 dark:text-white font-bold">{className} {sectionName ? `- ${sectionName}` : ''}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href={`/academic-mgmt/classes?edit=${classId}`} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
            Edit Class
          </Link>
          <button onClick={() => fetchAssignments({ limit: 5000 })} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-350 shadow-sm font-mono">
            Academic Year: {academicYear}
          </div>
        </div>
      </div>

      {/* Class Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm text-left">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Class Teacher</p>
            <p className="text-[15px] font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{classTeacherName}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm text-left">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Total Subjects</p>
            <p className="text-[20px] font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{filteredAssignments.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm text-left">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Total Chapters</p>
            <p className="text-[20px] font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{loadingStats ? <Loader2 className="w-4 h-4 animate-spin text-slate-400 mt-1" /> : totalClassChapters}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm text-left">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Overall Progress</p>
              <span className="text-[14px] font-bold text-emerald-500">{loadingStats ? '...' : `${classProgressPercent}%`}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${loadingStats ? 0 : classProgressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Filter Card (consistent with other pages) */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left">
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            {/* Teacher Filter Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Teacher:</label>
              <div className="relative">
                <select
                  value={filterTeacherId}
                  onChange={(e) => setFilterTeacherId(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-850 dark:text-slate-100 font-semibold cursor-pointer appearance-none min-w-[160px]"
                >
                  <option value="">All Teachers</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search subjects or teachers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {classAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm gap-3 text-slate-400">
          <BookOpen className="w-10 h-10 opacity-30" />
          <p className="font-medium text-[14px]">No subjects found for this class.</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm gap-3 text-slate-400">
          <BookOpen className="w-10 h-10 opacity-30" />
          <p className="font-medium text-[14px]">No subjects matching search found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredAssignments.map((a) => {
            const subjectName = typeof a.subject_master_id === 'object' ? a.subject_master_id?.name : "Subject";
            const teacherName = typeof a.teacher_id === 'object' ? a.teacher_id?.name : "Teacher";
            const streamName = a.stream_id ? (typeof a.stream_id === 'object' ? a.stream_id.name : "") : "";
            
            const stats = syllabiStats[a._id] || { total: 0, completed: 0, percent: 0 };

            return (
              <div key={a._id} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden flex flex-col justify-between text-left hover:shadow-md transition-shadow group animate-in fade-in h-fit">
                <div>
                  {/* Header of card */}
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
                      {streamName && (
                        <span className="font-mono text-[10px] bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                          {streamName}
                        </span>
                      )}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownCardKey(activeDropdownCardKey === a._id ? null : a._id);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdownCardKey === a._id && (
                          <>
                            <div className="fixed inset-0 z-45" onClick={(e) => { e.stopPropagation(); setActiveDropdownCardKey(null); }} />
                            <div className="absolute right-0 top-7 w-44 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left font-medium">
                              <button
                                type="button"
                                onClick={() => {
                                  router.push(`/academic-mgmt/syllabus/${classId}/${a._id}`);
                                  setActiveDropdownCardKey(null);
                                }}
                                className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer"
                              >
                                👁 View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  router.push(`/academic-mgmt/syllabus/${classId}/${a._id}`);
                                  setActiveDropdownCardKey(null);
                                }}
                                className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer"
                              >
                                ✏ Edit Chapters
                              </button>
                              {isAdmin && stats.syllabusId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSyllabusId(stats.syllabusId || null);
                                    setSelectedSubjectName(subjectName);
                                    setIsDeleteOpen(true);
                                    setActiveDropdownCardKey(null);
                                  }}
                                  className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 transition-colors cursor-pointer"
                                >
                                  🗑 Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {loadingStats ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Progress</p>
                            <p className="text-[18px] font-bold text-slate-850 dark:text-slate-200 leading-tight mt-1">{stats.percent}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Chapters</p>
                            <p className="text-[13px] font-bold text-slate-650 dark:text-slate-300 mt-1">{stats.completed} / {stats.total} done</p>
                          </div>
                        </div>

                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${stats.percent}%` }} />
                        </div>

                        {stats.updatedAt && (
                          <p className="text-[11px] text-slate-400 font-medium">Last updated: {new Date(stats.updatedAt).toLocaleDateString()}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <Link href={`/academic-mgmt/syllabus/${classId}/${a._id}`} className="p-3 border-t border-border/50 bg-slate-50 dark:bg-slate-855/50 flex items-center justify-center gap-2 text-[13px] font-bold text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  View Details <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Syllabus">
        <div className="space-y-5 text-left font-medium">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to delete the syllabus chapters and completion records for subject <span className="font-bold text-red-500">{selectedSubjectName}</span>?
            <br /><br />
            <span className="text-red-500 font-bold bg-red-50 dark:bg-red-955/20 p-2 rounded block">Warning: This action is permanent and cannot be undone!</span>
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-[14px] font-bold rounded-lg cursor-pointer">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer">
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
            </button>
          </div>
        </div>
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
