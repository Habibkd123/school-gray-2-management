"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, GraduationCap, BookOpen, ArrowRight, User, Search, RefreshCw, ChevronDown, ChevronLeft, ArrowLeft, Edit2, Trash2, Eye, Edit, CheckCircle2, Clock, FileText, Archive } from "lucide-react";
import { useTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import Link from "next/link";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";

// ── Syllabus status badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    Published: {
      label: "Published",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    Draft: {
      label: "Draft",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800",
      icon: <FileText className="w-3 h-3" />,
    },
    Archived: {
      label: "Archived",
      cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
      icon: <Archive className="w-3 h-3" />,
    },
    "Not Started": {
      label: "Not Started",
      cls: "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/30 dark:text-slate-500 dark:border-slate-700",
      icon: <Clock className="w-3 h-3" />,
    },
  };
  const c = cfg[status] ?? cfg["Not Started"];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border ${c.cls}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

export default function SyllabusClassListPage() {
  const { academicYear } = useAppState();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { assignments, isLoading, fetchAssignments } = useTeacherAssignment();
  const { teachers } = useTeachers();
  const { classes } = useClasses();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [syllabiStats, setSyllabiStats] = useState<Record<string, { total: number, completed: number, percent: number, updatedAt?: string, status?: string }>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const toggleExpand = (classId: string) => {
    setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

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
              statsMap[assignmentId] = {
                total,
                completed,
                percent,
                updatedAt: syllabus.updatedAt,
                status: syllabus.status || "Draft",   // ← capture status
              };
            }
          });

          assignments.forEach(a => {
            if (!statsMap[a._id]) {
              statsMap[a._id] = { total: 0, completed: 0, percent: 0, status: "Not Started" };
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
      fetchAssignments({ limit: "all" });
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

    return Object.values(groups).sort((a, b) => {
      const numA = parseInt(a.className.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.className.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.className.localeCompare(b.className);
    });
  }, [assignments, academicYear, filterTeacherId, classes]);

  const filteredClassGroups = useMemo(() => {
    let groups = classGroups;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      groups = groups.filter(c => {
        const nameMatch = c.className.toLowerCase().includes(term);
        const sectionMatch = c.section ? c.section.toLowerCase().includes(term) : false;
        const subjectMatch = c.assignments.some(a => {
          const subjectName = typeof a.subject_master_id === 'object' ? a.subject_master_id?.name : "";
          return subjectName.toLowerCase().includes(term);
        });
        return nameMatch || sectionMatch || subjectMatch;
      });
    }

    // Status filter: filter classes where any subject matches
    if (filterStatus) {
      groups = groups.filter(c =>
        c.assignments.some(a => {
          const stat = syllabiStats[a._id];
          return stat?.status === filterStatus;
        })
      );
    }

    return groups;
  }, [classGroups, searchTerm, filterStatus, syllabiStats]);

  const { page, setPage, pageSize, setPageSize, totalPages, totalItems, paged: paginatedGroups } = usePagination(filteredClassGroups, 9);

  // Compute overall stats for header summary
  const overallStats = useMemo(() => {
    const all = Object.values(syllabiStats);
    return {
      published: all.filter(s => s.status === "Published").length,
      draft: all.filter(s => s.status === "Draft").length,
      notStarted: all.filter(s => s.status === "Not Started").length,
      archived: all.filter(s => s.status === "Archived").length,
    };
  }, [syllabiStats]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Syllabus</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/academic" className="hover:text-primary">Academic</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Syllabus</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => fetchAssignments({ limit: "all" })} className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-350 shadow-sm font-sans">
            Academic Year: {academicYear}
          </div>
        </div>
      </div>

      {/* Status Summary Bar */}
      {!loadingStats && Object.keys(syllabiStats).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Published", count: overallStats.published, cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800", icon: <CheckCircle2 className="w-5 h-5" /> },
            { label: "Draft", count: overallStats.draft, cls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800", icon: <FileText className="w-5 h-5" /> },
            { label: "Not Started", count: overallStats.notStarted, cls: "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700", icon: <Clock className="w-5 h-5" /> },
            { label: "Archived", count: overallStats.archived, cls: "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700", icon: <Archive className="w-5 h-5" /> },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setFilterStatus(filterStatus === s.label ? "" : s.label)}
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all text-left ${s.cls} ${filterStatus === s.label ? "ring-2 ring-offset-1 ring-current" : "hover:shadow-sm"}`}
            >
              <div className="shrink-0">{s.icon}</div>
              <div>
                <p className="text-[18px] font-bold leading-none">{s.count}</p>
                <p className="text-[11px] font-semibold mt-1 opacity-80">{s.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Search Filter Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left">
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="card-subtitle flex items-center gap-2 text-[13px]">
              <span>Total</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{filteredClassGroups.length}</span>
              <span>{filteredClassGroups.length === 1 ? "Class" : "Classes"}</span>
            </div>

            {/* Teacher Filter */}
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

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status:</label>
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-850 dark:text-slate-100 font-semibold cursor-pointer appearance-none min-w-[140px]"
                >
                  <option value="">All Statuses</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Not Started">Not Started</option>
                  <option value="Archived">Archived</option>
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
        <>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {paginatedGroups.map((c) => {
              // Calculate overall progress for the class
              let totalChapters = 0;
              let completedChapters = 0;
              const subjectStatuses: string[] = [];

              c.assignments.forEach(a => {
                const stats = syllabiStats[a._id] || { total: 0, completed: 0, percent: 0, status: "Not Started" };
                totalChapters += stats.total;
                completedChapters += stats.completed;
                subjectStatuses.push(stats.status || "Not Started");
              });

              const percent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

              // Derive overall class status from subjects
              const classStatus = subjectStatuses.every(s => s === "Published")
                ? "Published"
                : subjectStatuses.some(s => s === "Published" || s === "Draft")
                  ? "Draft"
                  : "Not Started";

              return (
                <div key={c.classId} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden flex flex-col justify-between text-left hover:shadow-md transition-shadow group animate-in fade-in break-inside-avoid">
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
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Overall class status badge */}
                        <StatusBadge status={classStatus} />
                        <div className="flex items-center gap-1">
                          <Link href={`/academic-mgmt/syllabus/${c.classId}`} className="w-[30px] h-[30px] flex items-center justify-center rounded-lg border border-border bg-white dark:bg-slate-900 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors shadow-sm cursor-pointer" title="View Details">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {isAdmin && (
                            <Link href={`/academic-mgmt/syllabus/${c.classId}`} className="w-[30px] h-[30px] flex items-center justify-center rounded-lg border border-border bg-white dark:bg-slate-900 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors shadow-sm cursor-pointer" title="Edit Syllabus">
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subject list with per-subject status */}
                    <div className="p-5 space-y-3 border-b border-border">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Assigned Subjects ({c.assignments.length})
                      </p>
                      <div className="flex flex-col gap-2">
                        {c.assignments.slice(0, expandedClasses[c.classId] ? undefined : 4).map((a, idx) => {
                          const subjName = typeof a.subject_master_id === 'object' ? a.subject_master_id?.name : "Unknown Subject";
                          const subjCode = typeof a.subject_master_id === 'object' ? a.subject_master_id?.code : "—";
                          const subjStatus = syllabiStats[a._id]?.status || "Not Started";
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 group/subject transition-colors hover:border-slate-200 dark:hover:border-slate-700">
                              <div className="flex items-center gap-3 min-w-0">
                                <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase truncate">{subjName}</p>
                                  {subjCode && subjCode !== "—" && (
                                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 font-mono">Code: {subjCode}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {/* Per-subject status badge */}
                                <StatusBadge status={subjStatus} />
                                <div className="flex items-center gap-1 opacity-0 group-hover/subject:opacity-100 transition-opacity">
                                  <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors" title="Edit Subject Syllabus">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors" title="Remove Syllabus">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {c.assignments.length > 4 && (
                          <div className="text-center py-1 mt-1">
                            <button
                              onClick={() => toggleExpand(c.classId)}
                              className="text-[#E29013] font-bold text-[12px] hover:underline cursor-pointer bg-transparent border-none p-0"
                            >
                              {expandedClasses[c.classId] ? "Show Less" : `+${c.assignments.length - 4} More`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress + Last Updated */}
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
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                classStatus === "Published" ? "bg-emerald-500" : classStatus === "Draft" ? "bg-amber-400" : "bg-slate-300"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          {/* Subject status breakdown */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {c.assignments.map((a, idx) => {
                              const s = syllabiStats[a._id]?.status || "Not Started";
                              const subjName = typeof a.subject_master_id === 'object' ? a.subject_master_id?.name : "";
                              return (
                                <span
                                  key={idx}
                                  title={`${subjName}: ${s}`}
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                    s === "Published"
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800"
                                      : s === "Draft"
                                        ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
                                        : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700"
                                  }`}
                                >
                                  {subjName || "—"}
                                </span>
                              );
                            })}
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

          <div className="mt-6 border border-border rounded-xl overflow-hidden shadow-sm">
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      )}
    </div>
  );
}
