"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, GraduationCap, BookOpen, ArrowRight, User, Search, RefreshCw, ChevronDown, ChevronLeft, ArrowLeft } from "lucide-react";
import { useTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import Link from "next/link";

export default function SyllabusClassListPage() {
  const { academicYear } = useAppState();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const { assignments, isLoading, fetchAssignments } = useTeacherAssignment();
  const { teachers } = useTeachers();
  const { classes } = useClasses();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [syllabiStats, setSyllabiStats] = useState<Record<string, { total: number, completed: number, percent: number, updatedAt?: string }>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    async function fetchAllStats() {
      if (assignments.length === 0) return;
      setLoadingStats(true);
      try {
        const res = await fetch(`/api/syllabus`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const statsMap: Record<string, any> = {};
          
          data.data.forEach((syllabus: any) => {
            const assignmentId = syllabus.teacher_assignment_id;
            if (assignmentId) {
              const chapters = syllabus.chapters || [];
              const total = chapters.length;
              const completed = chapters.filter((c: any) => c.status === "Completed").length;
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
              statsMap[assignmentId] = { total, completed, percent, updatedAt: syllabus.updatedAt };
            }
          });

          assignments.forEach(a => {
            if (!statsMap[a._id]) {
              statsMap[a._id] = { total: 0, completed: 0, percent: 0 };
            }
          });

          setSyllabiStats(statsMap);
        }
      } catch (e) {
        console.error("Error fetching syllabi stats:", e);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchAllStats();
  }, [assignments]);

  useEffect(() => {
    if (!assignments || assignments.length === 0) {
      fetchAssignments({ limit: 5000 });
    }
  }, [assignments, fetchAssignments]);

  const classGroups = useMemo(() => {
    const groups: Record<string, { classId: string, className: string, section?: string, classTeacherName?: string, assignments: any[] }> = {};

    assignments.forEach(a => {
      if (a.academic_year !== academicYear) return;
      if (filterTeacherId) {
        const teacherId = typeof a.teacher_id === 'object' ? a.teacher_id?._id : a.teacher_id;
        if (teacherId !== filterTeacherId) return;
      }
      const classId = typeof a.class_id === 'object' ? a.class_id?._id : a.class_id;
      if (!classId) return;

      const className = typeof a.class_id === 'object' ? (a.class_id?.name || "Class") : "Class";
      const section = typeof a.class_id === 'object' ? (a.class_id?.section || "") : "";
      
      const classObj = classes.find(c => c._id === classId);
      const classTeacherName = classObj?.class_teacher_id?.name || "Not Assigned";

      const key = `${classId}`;
      if (!groups[key]) {
        groups[key] = { classId, className, section, classTeacherName, assignments: [] };
      }
      groups[key].assignments.push(a);
    });

    return Object.values(groups).sort((a, b) => a.className.localeCompare(b.className));
  }, [assignments, academicYear, filterTeacherId, classes]);

  const filteredClassGroups = useMemo(() => {
    if (!searchTerm.trim()) return classGroups;
    const term = searchTerm.toLowerCase().trim();
    return classGroups.filter(c => {
      const nameMatch = c.className.toLowerCase().includes(term);
      const sectionMatch = c.section ? c.section.toLowerCase().includes(term) : false;
      const subjectMatch = c.assignments.some(a => {
        const subjectName = typeof a.subject_master_id === 'object' ? a.subject_master_id?.name : "";
        return subjectName.toLowerCase().includes(term);
      });
      return nameMatch || sectionMatch || subjectMatch;
    });
  }, [classGroups, searchTerm]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Syllabus</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/academic" className="hover:text-primary">Academic</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Syllabus</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => fetchAssignments({ limit: 5000 })} className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-350 shadow-sm font-mono">
            Academic Year: {academicYear}
          </div>
        </div>
      </div>

      {/* Search Filter Card (consistent with other pages) */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left">
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
              <span>Total</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{filteredClassGroups.length}</span>
              <span>{filteredClassGroups.length === 1 ? "Class" : "Classes"}</span>
            </div>

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
              placeholder="Search classes or subjects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-40 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredClassGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm gap-3 text-slate-400">
          <GraduationCap className="w-10 h-10 opacity-30" />
          <p className="font-medium text-[14px]">No classes matching search found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredClassGroups.map((c) => {
            // Calculate overall progress for the class
            let totalChapters = 0;
            let completedChapters = 0;
            c.assignments.forEach(a => {
               const stats = syllabiStats[a._id] || { total: 0, completed: 0, percent: 0 };
               totalChapters += stats.total;
               completedChapters += stats.completed;
            });
            const percent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
            
            // Count unique teachers in this class
            const uniqueTeachers = new Set(
              c.assignments
                .map(a => typeof a.teacher_id === 'object' ? a.teacher_id?._id : a.teacher_id)
                .filter(Boolean)
            ).size;

            return (
              <div key={c.classId} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden flex flex-col justify-between text-left hover:shadow-md transition-shadow group animate-in fade-in h-fit">
                <div>
                  {/* Header of card */}
                  <div className="p-5 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/10">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight">
                          {c.className} {c.section ? <span className="text-slate-400 font-semibold text-[14px]">- {c.section}</span> : ""}
                        </h4>
                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                          Class Teacher: <span className="text-slate-700 dark:text-slate-300 font-semibold">{c.classTeacherName}</span>
                        </p>
                      </div>
                    </div>
                    <Link href={`/academic-mgmt/syllabus/${c.classId}`} className="px-3 py-1.5 border border-border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/30 rounded-lg text-[12px] font-bold shadow-sm transition-colors cursor-pointer">
                      View Details
                    </Link>
                  </div>

                  <div className="p-5 space-y-4 border-b border-border">
                    <div className="flex flex-col">
                      <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Subjects ({c.assignments.length})
                      </p>
                      <ul className="text-[13px] text-slate-600 dark:text-slate-400 space-y-1 ml-5 list-disc marker:text-slate-300 dark:marker:text-slate-600">
                        {c.assignments.slice(0, 4).map((a, idx) => {
                          const subjName = typeof a.subject_master_id === 'object' ? a.subject_master_id?.name : "Unknown Subject";
                          return <li key={idx} className="truncate">{subjName}</li>;
                        })}
                        {c.assignments.length > 4 && (
                          <li className="list-none -ml-5 mt-1 text-primary font-medium text-[12px]">+{c.assignments.length - 4} More</li>
                        )}
                      </ul>
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
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Overall Progress</p>
                            <p className="text-[18px] font-bold text-slate-800 dark:text-slate-200 leading-tight mt-1">{percent}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Last Updated</p>
                            <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                              {(() => {
                                let latestDate = 0;
                                c.assignments.forEach(a => {
                                  const s = syllabiStats[a._id];
                                  if (s && s.updatedAt) {
                                    const d = new Date(s.updatedAt).getTime();
                                    if (d > latestDate) latestDate = d;
                                  }
                                });
                                return latestDate > 0
                                  ? new Date(latestDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })
                                  : "—";
                              })()}
                            </p>
                          </div>
                        </div>

                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Link href={`/academic-mgmt/syllabus/${c.classId}`} className="p-3 border-t border-border/50 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center gap-2 text-[13px] font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer">
                  View Syllabus <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
