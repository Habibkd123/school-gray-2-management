"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, RefreshCcw, Trash2, Loader2, AlertCircle,
  BookOpen, Layers, GraduationCap, User, MoreVertical
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { useTeacherAssignment, PopulatedTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useSubjectAssignment } from "@/app/hooks/useSubjectAssignment";
import { useSubjectMaster } from "@/app/hooks/useSubjectMaster";
import { useStreams } from "@/app/hooks/useStreams";
import { useClasses } from "@/app/hooks/useClasses";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";

const ACADEMIC_YEARS = ["2026-2027"];

export default function TeacherAssignmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { academicYear } = useAppState();
  const { enableStreams, enableSections } = useAcademicConfig();

  const { assignments, isLoading, error, fetchAssignments, createAssignment, deleteAssignment } = useTeacherAssignment();
  const [activeDropdownCardKey, setActiveDropdownCardKey] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);

  const handleBulkDelete = async () => {
    if (!groupToDelete) return;
    setSubmitting(true);
    const assignmentIds: string[] = [];
    for (const classInfo of Object.values(groupToDelete.classes) as any[]) {
      for (const sub of classInfo.subjects) {
        assignmentIds.push(sub.assignmentId);
      }
    }
    try {
      await Promise.all(assignmentIds.map(id => deleteAssignment(id)));
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
    setIsBulkDeleteOpen(false);
    setGroupToDelete(null);
    doFetch();
  };
  const { assignments: subjectAssignments, fetchAssignments: fetchSubjectAssignments } = useSubjectAssignment();
  const { subjects: subjectList } = useSubjectMaster();
  const { streams } = useStreams({ skip: !enableStreams });
  const { classes } = useClasses({ filterByYear: true });
  const { teachers } = useTeachers();

  useEffect(() => {
    fetchSubjectAssignments({ academic_year: academicYear, limit: 500 });
  }, [fetchSubjectAssignments, academicYear]);

  // Filter state
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStreamId, setFilterStreamId] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterYear, setFilterYear] = useState(academicYear);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<PopulatedTeacherAssignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [formYear, setFormYear] = useState(academicYear);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formStreamId, setFormStreamId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");

  const doFetch = useCallback(() => {
    fetchAssignments({
      class_id: filterClassId || undefined,
      stream_id: filterStreamId || undefined,
      teacher_id: filterTeacherId || undefined,
      academic_year: filterYear || undefined,
      limit: 200,
    });
  }, [fetchAssignments, filterClassId, filterStreamId, filterTeacherId, filterYear]);

  useEffect(() => { doFetch(); }, [doFetch]);

  // Trigger auto stream select on class select
  useEffect(() => {
    if (!formClassId) {
      setFormStreamId("");
      return;
    }
    const selectedClass = classes.find(c => c._id === formClassId);
    if (!selectedClass) {
      setFormStreamId("");
      return;
    }

    // Auto stream selection for Class 11/12
    if (enableStreams) {
      const isHigherClass = selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12");
      if (isHigherClass) {
        const activeStreams = streams.filter(s => s.status === "Active");
        let foundStreamId = "";
        for (const stream of activeStreams) {
          const escapedStreamName = stream.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedStreamName}\\b`, 'i');
          if (regex.test(selectedClass.name)) {
            foundStreamId = stream._id;
            break;
          }
        }
        setFormStreamId(foundStreamId);
      } else {
        setFormStreamId("");
      }
    } else {
      setFormStreamId("");
    }
  }, [formClassId, classes, streams, enableStreams]);

  const filteredStreams = useMemo(() => {
    if (!enableStreams || !formClassId) return [];

    const selectedClass = classes.find(c => c._id === formClassId);
    if (!selectedClass) return [];

    const isHigherClass = selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12");
    if (!isHigherClass) return [];

    const activeStreams = streams.filter(s => s.status === "Active");
    const matchedStreams = activeStreams.filter(stream => {
      const escapedStreamName = stream.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedStreamName}\\b`, 'i');
      return regex.test(selectedClass.name);
    });

    if (matchedStreams.length > 0) {
      return matchedStreams;
    }

    return activeStreams;
  }, [formClassId, classes, streams, enableStreams]);

  const filteredSubjectList = useMemo(() => {
    if (!formClassId) return [];

    const assignedForClass = subjectAssignments.filter(sa => {
      const saClassId = typeof sa.class_id === "object" ? sa.class_id?._id : sa.class_id;
      const saStreamId = sa.stream_id ? (typeof sa.stream_id === "object" ? sa.stream_id?._id : sa.stream_id) : "";
      return saClassId === formClassId && (!formStreamId || saStreamId === formStreamId);
    });

    const assignedSubjectMasterIds = new Set(assignedForClass.map(sa =>
      typeof sa.subject_master_id === "object" ? sa.subject_master_id?._id : sa.subject_master_id
    ));

    return subjectList.filter(s => assignedSubjectMasterIds.has(s._id) && s.status === "Active");
  }, [subjectList, subjectAssignments, formClassId, formStreamId]);

  const resetForm = () => {
    setFormYear(academicYear);
    setFormTeacherId("");
    setFormClassId("");
    setFormStreamId("");
    setFormSubjectId("");
    setFormError("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYear || !formTeacherId || !formSubjectId || !formClassId) {
      setFormError("Academic year, teacher, class, and subject are all required."); return;
    }

    const selectedClass = classes.find(c => c._id === formClassId);
    const isHigherClass = selectedClass ? (selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12")) : false;

    setSubmitting(true);
    const res = await createAssignment({
      academic_year: formYear,
      teacher_id: formTeacherId,
      class_id: formClassId,
      stream_id: enableStreams && isHigherClass && formStreamId ? formStreamId : undefined,
      subject_master_id: formSubjectId,
    });
    setSubmitting(false);
    if (res.success) {
      setIsAddOpen(false); resetForm(); doFetch();
    } else {
      setFormError(res.message);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    await deleteAssignment(selected._id);
    setSubmitting(false); setIsDeleteOpen(false);
    doFetch();
  };

  // Filter displayed assignments by search
  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.teacher_id?.name?.toLowerCase().includes(q) ||
      a.subject_master_id?.name?.toLowerCase().includes(q) ||
      a.class_id?.name?.toLowerCase().includes(q) ||
      (a.stream_id?.name?.toLowerCase().includes(q) ?? false) ||
      (a.class_id?.section?.toLowerCase().includes(q) ?? false)
    );
  });

  // Group assignments by Teacher
  const groupedAssignments = useMemo(() => {
    const teacherGroups: Record<string, {
      teacherId: string;
      teacherName: string;
      academic_year: string;
      classes: Record<string, {
        className: string;
        section?: string;
        streamName?: string;
        subjects: {
          assignmentId: string;
          subjectId: string;
          name: string;
          originalRecord: PopulatedTeacherAssignment;
        }[];
      }>;
    }> = {};

    filteredAssignments.forEach(a => {
      const teacherId = typeof a.teacher_id === "object" ? a.teacher_id?._id : a.teacher_id;
      const teacherName = (typeof a.teacher_id === "object" ? a.teacher_id?.name : "Teacher") || "Teacher";
      const classId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
      const className = (typeof a.class_id === "object" ? a.class_id?.name : "Class") || "Class";
      const section = typeof a.class_id === "object" ? a.class_id?.section : "";
      const streamId = a.stream_id ? (typeof a.stream_id === "object" ? a.stream_id._id : a.stream_id) : "";
      const streamName = a.stream_id ? (typeof a.stream_id === "object" ? a.stream_id.name : "") : "";
      
      const teacherKey = `${teacherId}-${a.academic_year}`;
      const classKey = `${classId}-${streamId}`;

      if (!teacherGroups[teacherKey]) {
        teacherGroups[teacherKey] = {
          teacherId: String(teacherId),
          teacherName,
          academic_year: a.academic_year,
          classes: {}
        };
      }

      if (!teacherGroups[teacherKey].classes[classKey]) {
        teacherGroups[teacherKey].classes[classKey] = {
          className,
          section,
          streamName: streamName || undefined,
          subjects: []
        };
      }

      teacherGroups[teacherKey].classes[classKey].subjects.push({
        assignmentId: a._id,
        subjectId: typeof a.subject_master_id === "object" ? a.subject_master_id._id : a.subject_master_id,
        name: typeof a.subject_master_id === "object" ? a.subject_master_id.name : "Subject",
        originalRecord: a,
      });
    });

    return Object.values(teacherGroups);
  }, [filteredAssignments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Assignment</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Academic Management</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Teacher Assignment</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={doFetch} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm dark:text-slate-400">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#d68600] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors">
              <Plus className="w-4 h-4" /><span>Assign Teacher</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Year</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
              <option value="">All Years</option>
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Teacher</label>
            <select value={filterTeacherId} onChange={(e) => setFilterTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Class</label>
            <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
            </select>
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Stream</label>
              <select value={filterStreamId} onChange={(e) => setFilterStreamId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
                <option value="">All Streams</option>
                {streams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full focus:border-[#10B981]/50 transition-colors bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Grid View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-[14px] font-medium">Loading assignments...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500 bg-white dark:bg-slate-900 border border-border rounded-xl">
          <AlertCircle className="w-6 h-6" /><p className="text-[14px] font-medium">{error}</p>
        </div>
      ) : groupedAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 border border-border rounded-xl">
          <User className="w-10 h-10 opacity-30" />
          <p className="text-[14px] font-medium">No teacher assignments found</p>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="mt-2 px-4 py-2 text-[13px] font-bold bg-primary hover:bg-[#d68600] text-white rounded-lg">
              Assign First Teacher
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {groupedAssignments.map((group, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden flex flex-col justify-between text-left hover:shadow-md transition-shadow h-fit">
              <div>
                {/* Header of group (Teacher) */}
                <div className="p-4 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight">
                        {group.teacherName}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {group.academic_year}
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cardKey = `${group.teacherId}-${group.academic_year}`;
                          setActiveDropdownCardKey(activeDropdownCardKey === cardKey ? null : cardKey);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeDropdownCardKey === `${group.teacherId}-${group.academic_year}` && (
                        <>
                          <div className="fixed inset-0 z-45" onClick={(e) => { e.stopPropagation(); setActiveDropdownCardKey(null); }} />
                          <div className="absolute right-0 top-7 w-44 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left font-medium">
                            <button
                              type="button"
                              onClick={() => {
                                router.push(`/academic-mgmt/teacher-assignment/details?teacherId=${group.teacherId}&year=${group.academic_year}`);
                                setActiveDropdownCardKey(null);
                              }}
                              className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer"
                            >
                              👁 View Details
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormTeacherId(group.teacherId);
                                    setFormYear(group.academic_year);
                                    setIsAddOpen(true);
                                    setActiveDropdownCardKey(null);
                                  }}
                                  className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer"
                                >
                                  ✏ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGroupToDelete(group);
                                    setIsBulkDeleteOpen(true);
                                    setActiveDropdownCardKey(null);
                                  }}
                                  className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 transition-colors cursor-pointer"
                                >
                                  🗑 Delete
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assigned classes and subjects */}
                <div className="p-4 space-y-4">
                  {Object.entries(group.classes).map(([classKey, classInfo]) => (
                    <div key={classKey} className="space-y-2 border border-slate-100 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-900/50">
                      <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                        {classInfo.className}{classInfo.section ? ` - ${classInfo.section}` : ""}
                        {classInfo.streamName && <span className="text-purple-500">• {classInfo.streamName}</span>}
                      </p>
                      <div className="flex flex-col gap-1.5 pt-1">
                        {classInfo.subjects.map((sub, sIdx) => (
                          <div key={sIdx} className="group flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 truncate">{sub.name}</p>
                            </div>

                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setSelected(sub.originalRecord); setIsDeleteOpen(true); }}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Assignment Modal */}
      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Assign Teacher" size="lg">
        <form onSubmit={handleAdd} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Academic Year <span className="text-red-500">*</span></label>
              <select value={formYear} onChange={(e) => setFormYear(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Year</option>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Teacher <span className="text-red-500">*</span></label>
              <select value={formTeacherId} onChange={(e) => setFormTeacherId(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Class <span className="text-red-500">*</span></label>
              <select value={formClassId} onChange={(e) => setFormClassId(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Subject <span className="text-red-500">*</span></label>
              <select value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Subject</option>
                {filteredSubjectList.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            {enableStreams && filteredStreams.length > 0 && (
              <div className="flex flex-col gap-1.5" style={{ display: "none" }}>
                <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Stream</label>
                <select value={formStreamId} onChange={(e) => setFormStreamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">No Stream</option>
                  {filteredStreams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[#d68600] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Assign Teacher
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove Assignment">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Remove teacher <span className="font-bold text-red-500">{selected?.teacher_id?.name}</span> from {" "}
            <span className="font-bold text-foreground dark:text-white">
              {selected?.class_id?.name} - {selected?.subject_master_id?.name}
            </span>?
            <br /><br />
            <span className="text-red-500 font-bold bg-red-50 p-2 rounded block">Warning: This will also delete any Syllabus created for this assignment!</span>
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-[14px] font-bold rounded-lg">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Remove
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal isOpen={isBulkDeleteOpen} onClose={() => { setIsBulkDeleteOpen(false); setGroupToDelete(null); }} title="Remove Teacher Assignments">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to remove all assignments for teacher <span className="font-bold text-red-500">{groupToDelete?.teacherName}</span> for academic year <span className="font-bold text-primary">{groupToDelete?.academic_year}</span>?
            <br /><br />
            <span className="text-red-500 font-bold bg-red-50 p-2 rounded block">Warning: This will delete all class assignments and their associated syllabus records for this teacher!</span>
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setIsBulkDeleteOpen(false); setGroupToDelete(null); }} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-[14px] font-bold rounded-lg">Cancel</button>
            <button onClick={handleBulkDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Remove All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
