"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSchedules } from "../../../hooks/useSchedules";
import { useClasses } from "../../../hooks/useClasses";
import { useTeachers } from "../../../hooks/useTeachers";
import { useTeacherAssignment } from "../../../hooks/useTeacherAssignment";
import {
  Plus, Search, List, Grid, MoreVertical, Edit, Trash2,
  Calendar, Filter, ChevronDown, RefreshCw, Printer, Download, Clock, Loader2
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { useAppState } from "../../../context/store";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PASTEL_COLORS = [
  "bg-rose-50 dark:bg-slate-800/60 border-rose-200 dark:border-slate-700/50",
  "bg-blue-50 dark:bg-slate-800/60 border-blue-200 dark:border-slate-700/50",
  "bg-green-50 dark:bg-slate-800/60 border-green-200 dark:border-slate-700/50",
  "bg-yellow-50 dark:bg-slate-800/60 border-yellow-200 dark:border-slate-700/50",
  "bg-purple-50 dark:bg-slate-800/60 border-purple-200 dark:border-slate-700/50",
  "bg-orange-50 dark:bg-slate-800/60 border-orange-200 dark:border-slate-700/50"
];

export default function ClassRoutinePage() {
  const { academicYear } = useAppState();
  const { classes, isLoading: classesLoading } = useClasses();
  const { teachers, isLoading: teachersLoading } = useTeachers();
  const { assignments: teacherAssignments, fetchAssignments: fetchTeacherAssignments } = useTeacherAssignment();
  const { schedules, isLoading: schedulesLoading, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } = useSchedules();

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Form states
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formDay, setFormDay] = useState("Monday");
  const [formStartTime, setFormStartTime] = useState("09:30 AM");
  const [formEndTime, setFormEndTime] = useState("10:45 AM");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeacherAssignments({ academic_year: academicYear, limit: 500 });
  }, [fetchTeacherAssignments, academicYear]);

  // Set default grid class selector
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes, selectedClassId]);

  // cascade: select teacher -> list assigned classes
  const teacherClasses = useMemo(() => {
    if (!formTeacherId) return [];
    const assigned = teacherAssignments.filter(a => {
      const tId = typeof a.teacher_id === "object" ? a.teacher_id?._id : a.teacher_id;
      return tId === formTeacherId;
    });
    const uniqueClassIds = new Set<string>();
    const result: any[] = [];
    
    assigned.forEach(a => {
      if (a.class_id) {
        const classObj = a.class_id;
        if (classObj && typeof classObj === "object" && !uniqueClassIds.has(classObj._id)) {
          uniqueClassIds.add(classObj._id);
          result.push(classObj);
        }
      }
    });
    return result;
  }, [formTeacherId, teacherAssignments]);

  // cascade: select teacher + class -> list assigned subjects
  const teacherClassSubjects = useMemo(() => {
    if (!formTeacherId || !formClassId) return [];
    const assigned = teacherAssignments.filter(a => {
      const tId = typeof a.teacher_id === "object" ? a.teacher_id?._id : a.teacher_id;
      return tId === formTeacherId;
    });
    const uniqueSubjectIds = new Set<string>();
    const result: any[] = [];

    assigned.forEach(a => {
      let match = false;
      if (a.class_id) {
        const cId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
        match = cId === formClassId;
      }

      if (match) {
        const subObj = a.subject_master_id;
        if (subObj && typeof subObj === "object" && !uniqueSubjectIds.has(subObj._id)) {
          uniqueSubjectIds.add(subObj._id);
          result.push(subObj);
        }
      }
    });
    return result;
  }, [formTeacherId, formClassId, teacherAssignments]);

  // Sync cascading dropdown selectors
  useEffect(() => {
    if (teacherClasses.length > 0) {
      // Keep or reset formClassId depending on whether it matches teacher's assigned classes
      const exists = teacherClasses.some(c => c._id === formClassId);
      if (!exists) {
        setFormClassId(teacherClasses[0]._id);
      }
    } else {
      setFormClassId("");
    }
  }, [teacherClasses, formClassId]);

  useEffect(() => {
    if (teacherClassSubjects.length > 0) {
      const exists = teacherClassSubjects.some(s => s.name === formSubject);
      if (!exists) {
        setFormSubject(teacherClassSubjects[0].name);
      }
    } else {
      setFormSubject("");
    }
  }, [teacherClassSubjects, formSubject]);

  const openAddModal = (initialDay?: string) => {
    // Select first active teacher by default
    if (teachers.length > 0) setFormTeacherId(teachers[0]._id);
    setFormDay(initialDay || "Monday");
    setFormStartTime("09:30 AM");
    setFormEndTime("10:45 AM");
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (routine: any) => {
    setSelectedRoutineId(routine._id);
    setFormTeacherId(typeof routine.teacher_id === "object" ? routine.teacher_id._id : routine.teacher_id || "");
    setFormClassId(typeof routine.class_id === "object" ? routine.class_id._id : routine.class_id || "");
    setFormSubject(routine.subject_id && typeof routine.subject_id === "object" ? routine.subject_id.name : routine.subject_id || "");
    setFormDay(routine.day.charAt(0).toUpperCase() + routine.day.slice(1));
    setFormStartTime(routine.start_time);
    setFormEndTime(routine.end_time);
    setFormError(null);
    setIsEditOpen(true);
    setActionMenuId(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formTeacherId || !formClassId || !formSubject) {
      setFormError("Teacher, Class and Subject are required.");
      return;
    }
    const res = await createSchedule({
      classId: formClassId,
      subject: formSubject,
      teacherId: formTeacherId,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: "",
      academicYear
    });
    if (res.success) {
      setIsAddOpen(false);
      fetchSchedules();
    } else {
      setFormError(res.message || "Failed to create routine");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoutineId) return;
    setFormError(null);
    if (!formTeacherId || !formClassId || !formSubject) {
      setFormError("Teacher, Class and Subject are required.");
      return;
    }
    const res = await updateSchedule(selectedRoutineId, {
      classId: formClassId,
      subject: formSubject,
      teacherId: formTeacherId,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: "",
      academicYear
    });
    if (res.success) {
      setIsEditOpen(false);
      fetchSchedules();
    } else {
      setFormError(res.message || "Failed to update routine");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this routine entry?")) {
      const res = await deleteSchedule(id);
      if (res.success) {
        fetchSchedules();
      } else {
        alert(res.message || "Failed to delete routine");
      }
    }
    setActionMenuId(null);
  };

  const getClassName = (c: any) => {
    if (typeof c === "object" && c !== null) {
      return `${c.name} - ${c.section}`;
    }
    return classes.find(item => item._id === c)?.name || "N/A";
  };

  const getTeacherName = (t: any) => {
    if (typeof t === "object" && t !== null) {
      return t.name;
    }
    return teachers.find(item => item._id === t)?.name || "N/A";
  };

  const getSubjectName = (s: any) => {
    if (typeof s === "object" && s !== null) {
      return s.name;
    }
    return s || "N/A";
  };

  const filteredRoutines = schedules.filter(r => {
    const sName = getSubjectName(r.subject_id).toLowerCase();
    const cName = getClassName(r.class_id).toLowerCase();
    const tName = getTeacherName(r.teacher_id).toLowerCase();
    const search = searchTerm.toLowerCase();

    return sName.includes(search) || cName.includes(search) || tName.includes(search);
  });

  // Timetable grid structure for class selected
  const gridSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const cId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      return cId === selectedClassId;
    });
  }, [schedules, selectedClassId]);

  const isLoading = classesLoading || teachersLoading || schedulesLoading;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Class Routine</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/academic" className="hover:text-primary">Academic</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Class Routine</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* List/Grid toggler */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-border rounded-lg p-1.5 shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => fetchSchedules()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {viewMode === "grid" && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-1.5 text-[13px] shadow-sm">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider dark:text-slate-400">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white outline-none cursor-pointer font-bold"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {c.name} - {c.section}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => openAddModal()}
            className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Routine
          </button>
        </div>
      </div>

      {/* List View Mode */}
      {viewMode === "list" ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
          {/* Table Header Section */}
          <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">All Routines</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search routines"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className={`overflow-x-auto ${actionMenuId ? 'pb-28' : ''}`}>
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span>Fetching class routines...</span>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">ID</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Teacher</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Subject</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Day</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 font-mono">Start Time</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 font-mono">End Time</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRoutines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        No routine items found.
                      </td>
                    </tr>
                  ) : (
                    filteredRoutines.map((routine) => (
                      <tr key={routine._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-primary">{routine._id.substring(routine._id.length - 8)}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-bold">{getClassName(routine.class_id)}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getTeacherName(routine.teacher_id)}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-semibold">{getSubjectName(routine.subject_id)}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">{routine.day}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">{routine.start_time}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">{routine.end_time}</td>
                        <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === routine._id ? null : routine._id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === routine._id ? "bg-primary text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuId === routine._id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                              <div className="absolute right-10 top-10 w-36 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                                <button onClick={() => openEditModal(routine)} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                  <Edit className="w-4 h-4 text-foreground" /> Edit
                                </button>
                                <button onClick={() => handleDelete(routine._id)} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                  <Trash2 className="w-4 h-4 text-foreground" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Weekly Grid View Mode */
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left p-5">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span>Fetching weekly grid...</span>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="min-w-full sm:w-[1200px]">
                {/* Headers */}
                <div className="grid grid-cols-7 gap-4 mb-4 border-b border-border pb-3">
                  {DAYS.map(day => (
                    <div key={day} className="font-bold text-[13px] uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-2">{day}</div>
                  ))}
                </div>

                {/* Grid Rows */}
                <div className="grid grid-cols-7 gap-4">
                  {DAYS.map(day => {
                    const routinesForDay = gridSchedules.filter(s => s.day.toLowerCase() === day.toLowerCase());
                    return (
                      <div key={day} className="space-y-4">
                        {routinesForDay.length === 0 ? (
                          <div
                            onClick={() => openAddModal(day)}
                            className="p-4 text-center text-[12px] text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors group"
                          >
                            <Plus className="w-4 h-4 mx-auto mb-1 opacity-50 group-hover:opacity-100 group-hover:text-primary transition-colors" />
                            <span className="group-hover:text-primary transition-colors font-medium">Add period</span>
                          </div>
                        ) : (
                          routinesForDay.map((routine, idx) => (
                            <div key={routine._id} className={`p-3 rounded-xl border shadow-sm transition-all hover:shadow-md relative group/card ${PASTEL_COLORS[idx % PASTEL_COLORS.length]}`}>
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px] font-mono mb-2">
                                <Clock className="w-3.5 h-3.5" />
                                {routine.start_time} - {routine.end_time}
                              </div>
                              <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">{getSubjectName(routine.subject_id)}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Teacher: {getTeacherName(routine.teacher_id)}</p>
                              
                              <div className="absolute right-2 top-2 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-1 bg-white/80 dark:bg-slate-950/80 p-1 rounded-lg">
                                <button onClick={() => openEditModal(routine)} className="p-1 hover:text-primary transition-colors text-slate-500 cursor-pointer dark:text-slate-400"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDelete(routine._id)} className="p-1 hover:text-red-500 transition-colors text-slate-500 cursor-pointer dark:text-slate-400"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog Modal */}
      <Modal isOpen={isAddOpen || isEditOpen} onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} title={isAddOpen ? "Add Class Routine" : "Edit Class Routine"}>
        <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="p-0 space-y-5 text-left">
          {formError && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-[13px] font-semibold">
              <span className="mt-0.5 shrink-0 text-rose-500">⚠</span>
              <span>{formError}</span>
            </div>
          )}

          {/* 1. SELECT TEACHER FIRST */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">1. Teacher <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. SELECT CLASS FROM TEACHER ASSIGNMENTS */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">2. Class <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                disabled={!formTeacherId}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                required
              >
                <option value="">Select Class</option>
                {teacherClasses.map(c => (
                  <option key={c._id} value={c._id}>{c.name} - {c.section}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {formTeacherId && teacherClasses.length === 0 && (
              <p className="text-[11px] text-red-500 font-semibold mt-1">⚠ Selected teacher has no active Class Assignments. Go to Teacher Assignment to set it up.</p>
            )}
          </div>

          {/* 3. SELECT SUBJECT */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">3. Subject <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                disabled={!formClassId}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                required
              >
                <option value="">Select Subject</option>
                {teacherClassSubjects.map(s => (
                  <option key={s._id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {formClassId && teacherClassSubjects.length === 0 && (
              <p className="text-[11px] text-red-500 font-semibold mt-1">⚠ No assigned subjects found for this teacher and class.</p>
            )}
          </div>

          {/* 4. DAY */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Day <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={formDay}
                onChange={(e) => setFormDay(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 5. START AND END TIMINGS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100 font-mono">Start Time</label>
              <TimePicker value={formStartTime} onChange={setFormStartTime} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100 font-mono">End Time</label>
              <TimePicker value={formEndTime} onChange={setFormEndTime} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); setFormError(null); }}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={teacherClasses.length === 0 || teacherClassSubjects.length === 0}
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isAddOpen ? "Add Routine" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
}

function TimePicker({ value, onChange }: TimePickerProps) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let currentHour = "09";
  let currentMinute = "00";
  let currentPeriod = "AM";
  if (match) {
    let [, h, m, p] = match;
    if (h.length === 1) h = `0${h}`;
    currentHour = h;
    currentMinute = m;
    currentPeriod = p.toUpperCase();
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const periods = ["AM", "PM"];

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${currentMinute} ${currentPeriod}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute} ${currentPeriod}`);
  };

  const handlePeriodChange = (newPeriod: string) => {
    onChange(`${currentHour}:${currentMinute} ${newPeriod}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <select
          value={currentHour}
          onChange={(e) => handleHourChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 font-mono cursor-pointer"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <span className="text-slate-400 font-bold">:</span>

      <div className="relative flex-1">
        <select
          value={currentMinute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 font-mono cursor-pointer"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <div className="relative w-[75px]">
        <select
          value={currentPeriod}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="w-full pl-3 pr-7 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
