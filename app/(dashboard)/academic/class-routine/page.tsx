"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSchedules, ApiSchedule } from "../../../hooks/useSchedules";
import { useClasses } from "../../../hooks/useClasses";
import { useTeachers } from "../../../hooks/useTeachers";
import { useTeacherAssignment } from "../../../hooks/useTeacherAssignment";
import { useAppState } from "../../../context/store";
import { PrintButton } from "../../../components/ui/PrintButton";
import { Modal } from "../../../components/ui/modal";
import {
  Plus, Search, List, Grid, MoreVertical, Edit, Trash2, Copy,
  Calendar, Clock, User, Home, BookOpen, AlertCircle, RefreshCw,
  ChevronRight, ChevronLeft, Check, HelpCircle,
  Loader2,
  ChevronDown,
  GraduationCap
} from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_SLOTS = [
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM"
];

// Helper: convert time string "09:30 AM" or "13:30" → minutes since midnight
function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const cleaned = t.trim().toLowerCase();

  // AM/PM Format check
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let [, h, m, period] = ampmMatch;
    let hours = parseInt(h, 10);
    const mins = parseInt(m, 10);
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  // 24-Hour Format check
  const standardMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (standardMatch) {
    const hours = parseInt(standardMatch[1], 10);
    const mins = parseInt(standardMatch[2], 10);
    return hours * 60 + mins;
  }

  return 0;
}

const getSubjectColor = (subjectName: string) => {
  const name = subjectName?.toLowerCase() || "";
  if (name.includes("math")) return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30";
  if (name.includes("spanish") || name.includes("lang")) return "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30";
  if (name.includes("computer") || name.includes("it")) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30";
  if (name.includes("physics")) return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30";
  if (name.includes("english")) return "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30";
  if (name.includes("chemistry")) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50";
  if (name.includes("science")) return "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30";

  // Fallback cyclic colors
  const colors = [
    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30",
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30",
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30",
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30",
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30",
    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30"
  ];
  return colors[name.length % colors.length];
};

export default function ClassRoutinePage() {
  const { academicYear, activeRole } = useAppState();
  const { classes, isLoading: classesLoading } = useClasses();
  const { teachers, isLoading: teachersLoading } = useTeachers();
  const { assignments: teacherAssignments, fetchAssignments: fetchTeacherAssignments } = useTeacherAssignment();
  const { schedules, isLoading: schedulesLoading, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } = useSchedules();

  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  // Filters State
  const [filterYear, setFilterYear] = useState(academicYear);
  const [filterClassName, setFilterClassName] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [creationStep, setCreationStep] = useState<1 | 2 | 3>(1);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<ApiSchedule | null>(null);

  // Form Fields
  const [formAcademicYear, setFormAcademicYear] = useState(academicYear);
  const [formClassName, setFormClassName] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formDay, setFormDay] = useState("Monday");
  const [formSubject, setFormSubject] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00 AM");
  const [formEndTime, setFormEndTime] = useState("10:00 AM");
  const [formRoom, setFormRoom] = useState("");
  const [formPeriodNo, setFormPeriodNo] = useState("1");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = activeRole === "admin";
  const isTeacherRole = activeRole === "teacher";
  const isStudentOrParent = activeRole === "student";

  // Load dependency data on mount
  useEffect(() => {
    fetchTeacherAssignments({ academic_year: filterYear, limit: 1000 });
  }, [fetchTeacherAssignments, filterYear]);

  // Sync routine parameters list
  const loadFilteredSchedules = useCallback(() => {
    fetchSchedules({
      academicYear: filterYear,
      classId: classes.find(c => c.name === filterClassName && c.section === filterSection)?._id || "",
      teacherId: filterTeacherId,
      day: filterDay,
      status: filterStatus !== "all" ? filterStatus : "",
      search: searchTerm
    });
  }, [fetchSchedules, filterYear, filterClassName, filterSection, filterTeacherId, filterDay, filterStatus, searchTerm, classes]);

  useEffect(() => {
    loadFilteredSchedules();
  }, [loadFilteredSchedules]);

  // Derived filter selections lists
  const classNames = useMemo(() => {
    return Array.from(new Set(classes.map(c => c.name))).sort();
  }, [classes]);

  const sectionsForClassName = useMemo(() => {
    if (!filterClassName) return [];
    return Array.from(new Set(classes.filter(c => c.name === filterClassName).map(c => c.section).filter(Boolean))).sort();
  }, [classes, filterClassName]);

  const sectionsForFormClassName = useMemo(() => {
    if (!formClassName) return [];
    return Array.from(new Set(classes.filter(c => c.name === formClassName).map(c => c.section).filter(Boolean))).sort();
  }, [classes, formClassName]);

  // Wizard cascading logic: subjects assigned to class
  const wizardSubjects = useMemo(() => {
    if (!formClassName) return [];
    const classAssigned = teacherAssignments.filter(a =>
      a.class_id?.name === formClassName &&
      (formSection ? a.class_id?.section === formSection : true) &&
      a.academic_year === formAcademicYear
    );
    const assignedNames = Array.from(new Set(classAssigned.map(a => a.subject_master_id?.name).filter(Boolean)));
    if (assignedNames.length > 0) return assignedNames;

    // Resilient fallback: list all subject master catalog names to prevent dead-locks
    return Array.from(new Set(teacherAssignments.map(a => a.subject_master_id?.name).filter(Boolean)));
  }, [formClassName, formSection, formAcademicYear, teacherAssignments]);

  // Wizard cascading logic: teachers assigned to subject in class
  const wizardTeachers = useMemo(() => {
    if (!formClassName || !formSubject) return [];
    const matched = teacherAssignments.filter(a =>
      a.class_id?.name === formClassName &&
      (formSection ? a.class_id?.section === formSection : true) &&
      a.subject_master_id?.name === formSubject &&
      a.academic_year === formAcademicYear
    );
    const matchedTeachers = matched.map(a => a.teacher_id).filter(Boolean);
    if (matchedTeachers.length > 0) {
      // Remove duplicates
      const unique: any[] = [];
      const seen = new Set();
      matchedTeachers.forEach((t: any) => {
        if (!seen.has(t._id)) {
          seen.add(t._id);
          unique.push(t);
        }
      });
      return unique;
    }

    // Resilient fallback: list all active teachers in system
    return teachers.map(t => ({ _id: t._id, name: t.name }));
  }, [formClassName, formSection, formSubject, formAcademicYear, teacherAssignments, teachers]);

  // Set default Wizard Form values
  const resetForm = () => {
    setFormAcademicYear(academicYear);
    setFormClassName(classNames[0] || "");
    setFormSection("");
    setFormDay("Monday");
    setFormSubject("");
    setFormTeacherId("");
    setFormStartTime("09:00 AM");
    setFormEndTime("10:00 AM");
    setFormRoom("");
    setFormPeriodNo("1");
    setFormStatus("Active");
    setFormError(null);
    setCreationStep(1);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (routine: ApiSchedule) => {
    const clsObj = typeof routine.class_id === "object" ? routine.class_id : null;
    const teacherObj = typeof routine.teacher_id === "object" ? routine.teacher_id : null;
    const subjectObj = typeof routine.subject_id === "object" ? routine.subject_id : null;

    setFormAcademicYear(routine.academic_year || academicYear);
    setFormClassName(clsObj ? clsObj.name : "");
    setFormSection(clsObj ? clsObj.section : "");
    setFormDay(routine.day.charAt(0).toUpperCase() + routine.day.slice(1));
    setFormSubject(subjectObj ? subjectObj.name : (typeof routine.subject_id === "string" ? routine.subject_id : ""));
    setFormTeacherId(teacherObj ? teacherObj._id : (typeof routine.teacher_id === "string" ? routine.teacher_id : ""));
    setFormStartTime(routine.start_time);
    setFormEndTime(routine.end_time);
    setFormRoom(routine.room || "");
    setFormPeriodNo(routine.period_no ? String(routine.period_no) : "1");
    setFormStatus(routine.status === "Inactive" ? "Inactive" : "Active");
    setFormError(null);

    setActiveRoutine(routine);
    setIsEditOpen(true);
    setActionMenuId(null);
  };

  const handleOpenDuplicate = (routine: ApiSchedule) => {
    handleOpenEdit(routine);
    // Switch to create mode by overriding flags
    setIsEditOpen(false);
    setIsAddOpen(true);
    setCreationStep(1);
  };

  const handleToggleArchive = async (routine: ApiSchedule) => {
    const newStatus = routine.status === "Inactive" ? "Active" : "Inactive";
    const res = await updateSchedule(routine._id, { status: newStatus as any });
    if (res.success) {
      loadFilteredSchedules();
    } else {
      alert(res.message || "Failed to update routine status");
    }
    setActionMenuId(null);
  };

  const handleDeleteRoutine = async (id: string) => {
    if (confirm("Are you sure you want to delete this routine entry? This cannot be undone.")) {
      const res = await deleteSchedule(id);
      if (res.success) {
        loadFilteredSchedules();
      } else {
        alert(res.message || "Failed to delete routine");
      }
    }
    setActionMenuId(null);
  };

  // Submit Logic
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const matchedClass = classes.find(c => c.name === formClassName && c.section === formSection);
    if (!matchedClass) {
      setFormError(`Selected Class / Section combination "${formClassName} - ${formSection}" does not exist in your School. Please add the Class first.`);
      return;
    }

    if (!formSubject) {
      setFormError("Please select a Subject.");
      return;
    }

    const payload = {
      classId: matchedClass._id,
      subject: formSubject,
      teacherId: formTeacherId || undefined,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: formRoom,
      academicYear: formAcademicYear,
      periodNo: formPeriodNo ? parseInt(formPeriodNo, 10) : undefined,
      status: formStatus
    };

    let res;
    if (isEditOpen && activeRoutine) {
      res = await updateSchedule(activeRoutine._id, payload);
    } else {
      res = await createSchedule(payload);
    }

    if (res.success) {
      setIsAddOpen(false);
      setIsEditOpen(false);
      loadFilteredSchedules();
    } else {
      setFormError(res.message || "Overlap conflict detected or database validation failed.");
    }
  };

  // Extract unique sorted time slots for Grid View Matrix
  const timeSlots = useMemo(() => {
    const slots = new Set<string>();
    schedules.forEach(s => {
      if (s.start_time && s.end_time) {
        slots.add(`${s.start_time} - ${s.end_time}`);
      }
    });
    if (slots.size === 0) {
      return DEFAULT_SLOTS;
    }
    return Array.from(slots).sort((a, b) => {
      const startA = a.split(" - ")[0];
      const startB = b.split(" - ")[0];
      return parseTimeToMinutes(startA) - parseTimeToMinutes(startB);
    });
  }, [schedules]);

  // Group schedules by day for the column layout
  const routinesByDay = useMemo(() => {
    const grouped: Record<string, ApiSchedule[]> = {};
    DAYS.forEach(day => {
      grouped[day.toLowerCase()] = [];
    });

    schedules.forEach(s => {
      const d = s.day.toLowerCase();
      if (grouped[d]) {
        grouped[d].push(s);
      }
    });

    // Sort by start_time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
    });

    return grouped;
  }, [schedules]);

  // Group schedules by class for Class View (Records Table replacement)
  const routinesByClass = useMemo(() => {
    const groups: Record<string, { class: any, routines: ApiSchedule[] }> = {};
    schedules.forEach(s => {
      const cls = typeof s.class_id === "object" ? s.class_id : null;
      if (!cls) return;
      const key = `${cls.name} ${cls.section || ""}`.trim();
      if (!groups[key]) {
        groups[key] = { class: cls, routines: [] };
      }
      groups[key].routines.push(s);
    });

    // Sort routines within each group by Day and Time
    const dayOrder: Record<string, number> = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };
    Object.values(groups).forEach(g => {
      g.routines.sort((a, b) => {
        if (dayOrder[a.day] !== dayOrder[b.day]) {
          return (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
        }
        return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
      });
    });

    // Sort groups by class name
    return Object.values(groups).sort((a, b) => {
      const nameA = a.class.name || "";
      const nameB = b.class.name || "";
      return nameA.localeCompare(nameB);
    });
  }, [schedules]);

  const isLoading = classesLoading || teachersLoading || schedulesLoading;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* 1. Header Banner */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Routine Planner</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span>Academic</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Class Routine</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* List/Grid layout toggle */}
          <div className="flex items-center bg-[#F8FAFC] dark:bg-slate-900 border border-border rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 transition-colors ${viewMode === "grid" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <Grid className="w-3.5 h-3.5" /> Timetable
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <List className="w-3.5 h-3.5" /> Class View
            </button>
          </div>

          <button onClick={() => loadFilteredSchedules()} className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* ERP central print button */}
          <PrintButton targetId="printable-timetable" label="Export" variant="outline" />

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Unified Advanced Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end mb-6">
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Year</label>
          <div className="relative">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Class Name</label>
          <div className="relative">
            <select
              value={filterClassName}
              onChange={(e) => { setFilterClassName(e.target.value); setFilterSection(""); }}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              <option value="">All Classes</option>
              {classNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Section</label>
          <div className="relative">
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              disabled={!filterClassName}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-50"
            >
              <option value="">All Sections</option>
              {sectionsForClassName.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Teacher</label>
          <div className="relative">
            <select
              value={filterTeacherId}
              onChange={(e) => setFilterTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Day</label>
          <div className="relative">
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              <option value="">All Days</option>
              {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Status</label>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="col-span-1 sm:col-span-2 space-y-1.5 relative">
          <label className="text-[13px] font-semibold text-foreground dark:text-slate-100">Quick Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search teacher, subject, room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors shadow-sm bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)]"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Timetable Visual Grid Layout */}
      <div id="printable-timetable" className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden p-5">
        <div className="border-b border-border pb-4 mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-left">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
            {filterClassName ? `${filterClassName} - ${filterSection || "All Sections"}` : "Master Academic Timetable"} ({filterYear})
            {!isLoading && (
              <span className="ml-2 text-[13px] font-normal text-slate-400">({schedules.length} slots)</span>
            )}
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[14px] font-medium">Loading schedules...</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">No schedules created</h3>
            <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">
              There are no timetable slots registered matching your current filter selections.
            </p>
            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 btn btn-primary flex items-center gap-2"
              >
                Create First Slot
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="flex flex-col gap-8 pb-4">
            {/* The 6-Column Grid for Days */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {DAYS.map(day => {
                const dayRoutines = routinesByDay[day.toLowerCase()] || [];
                return (
                  <div key={day} className="flex flex-col gap-4">
                    <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{day}</h3>

                    {dayRoutines.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-border">
                        <span className="text-[13px] font-medium">No classes</span>
                      </div>
                    ) : (
                      dayRoutines.map(routine => {
                        const subjectObj = typeof routine.subject_id === "object" ? routine.subject_id : null;
                        const teacherObj = typeof routine.teacher_id === "object" ? routine.teacher_id : null;
                        const subjectName = subjectObj ? subjectObj.name : String(routine.subject_id);

                        return (
                          <div
                            key={routine._id}
                            className={`rounded-xl p-4 flex flex-col gap-2 relative group transition-all hover:-translate-y-0.5 hover:shadow-md ${getSubjectColor(subjectName)}`}
                          >
                            <div className="flex items-center gap-1.5 text-[13px] font-semibold opacity-90">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{routine.start_time} - {routine.end_time}</span>
                            </div>

                            <div className="text-[14px] font-bold mt-1">
                              {subjectName}
                            </div>

                            <div className="bg-white/90 dark:bg-slate-900 border border-white/50 dark:border-slate-800 rounded-lg p-2 flex items-center gap-2 shadow-sm mt-1">
                              <div className="w-6 h-6 rounded overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                {teacherObj?.photo_url ? (
                                  <img src={teacherObj.photo_url} alt="T" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">
                                {teacherObj ? teacherObj.name : "N/A"}
                              </span>
                            </div>

                            {/* Action Hover menu */}
                            {isAdmin && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-slate-900 rounded p-1 shadow-sm border border-border">
                                <button onClick={() => handleOpenEdit(routine)} className="p-1 hover:text-primary text-slate-500"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleOpenDuplicate(routine)} className="p-1 hover:text-primary text-slate-500"><Copy className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteRoutine(routine._id)} className="p-1 hover:text-red-600 text-slate-500"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>

            {/* Static Breaks Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 mt-4 border-t border-border">
              <div className="border border-border bg-white dark:bg-slate-900 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                <span className="w-max bg-primary text-white text-[12px] font-bold px-2.5 py-1 rounded">Morning Break</span>
                <div className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" /> 10:30 to 10:45 AM
                </div>
              </div>
              <div className="border border-border bg-white dark:bg-slate-900 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                <span className="w-max bg-amber-500 text-white text-[12px] font-bold px-2.5 py-1 rounded">Lunch</span>
                <div className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" /> 12:15 to 01:30 PM
                </div>
              </div>
              <div className="border border-border bg-white dark:bg-slate-900 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                <span className="w-max bg-sky-600 text-white text-[12px] font-bold px-2.5 py-1 rounded">Evening Break</span>
                <div className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" /> 03:30 to 03:45 PM
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Class View mode */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {routinesByClass.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-500">
                No routines found for selected criteria.
              </div>
            ) : (
              routinesByClass.map((group, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-[16px]">
                          {group.class.name} {group.class.section ? `- ${group.class.section}` : ""}
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-200/50 dark:bg-slate-700 px-2 py-1 rounded-md">
                      {filterYear || academicYear}
                    </span>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">
                      Routine Periods ({group.routines.length})
                    </div>
                    <div className="space-y-3">
                      {group.routines.map((routine, ridx) => {
                        const subjectObj = typeof routine.subject_id === "object" ? routine.subject_id : null;
                        const teacherObj = typeof routine.teacher_id === "object" ? routine.teacher_id : null;
                        const subjectName = subjectObj ? subjectObj.name : String(routine.subject_id);

                        return (
                          <div key={routine._id} className="group relative bg-[#F8FAFC] dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3.5 flex items-start gap-3 transition-colors">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0 mt-0.5">
                              <img
                                src={teacherObj?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherObj?.name || "T")}&background=d68600&color=fff&bold=true`}
                                alt="Teacher Avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[13px] tracking-wide uppercase">
                                  PER {routine.period_no || ridx + 1}: {subjectName}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${routine.status === "Inactive" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20"}`}>
                                  {routine.day.substring(0, 3)}
                                </span>
                              </div>
                              <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 uppercase text-slate-700 dark:text-slate-300">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{teacherObj?.name || "Unknown Teacher"}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{routine.start_time} - {routine.end_time}</span>
                                  {routine.room && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                      <span>Room {routine.room}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                                <button onClick={() => handleOpenEdit(routine)} className="text-slate-400 hover:text-primary transition-colors p-1" title="Edit">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteRoutine(routine._id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Wizard creation Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Timetable Period">
        <div className="p-0 text-left space-y-6">
          {formError && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-2.5 text-rose-600 dark:text-rose-400 text-[12px] font-semibold">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Wizard step bullets */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[12px] ${creationStep >= 1 ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>1</span>
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Class</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[12px] ${creationStep >= 2 ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>2</span>
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Subject</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[12px] ${creationStep >= 3 ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>3</span>
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Teacher & Time</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {creationStep === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Academic Year <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formAcademicYear} onChange={(e) => setFormAcademicYear(e.target.value)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                      <option value="2026-2027">2026-2027</option>
                      <option value="2027-2028">2027-2028</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Class Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formClassName} onChange={(e) => { setFormClassName(e.target.value); setFormSection(""); }} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                      <option value="">Select Class</option>
                      {classNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Section <span className="text-slate-400 text-[11px]">(optional)</span></label>
                  <div className="relative">
                    <select value={formSection} onChange={(e) => setFormSection(e.target.value)} disabled={!formClassName} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer disabled:opacity-50 focus:border-primary/50" required>
                      <option value="">Select Section</option>
                      {sectionsForFormClassName.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Day <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formDay} onChange={(e) => setFormDay(e.target.value)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                      {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!formClassName) {
                        setFormError("Class Name is required.");
                        return;
                      }
                      setFormError(null);
                      setCreationStep(2);
                    }}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <span>Next Step</span> <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {creationStep === 2 && (
              <div className="space-y-4">
                <div className="bg-[#F8FAFC] dark:bg-slate-900 p-3 rounded-lg border border-border text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                  Class Room Target: <strong className="text-slate-800 dark:text-white">{formClassName} - {formSection || "All"}</strong>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Subject (Assigned to Class) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                      <option value="">Select Subject</option>
                      {wizardSubjects.map(subName => <option key={subName} value={subName}>{subName}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                  {wizardSubjects.length === 0 && (
                    <p className="text-[11px] text-amber-500 font-bold mt-1">⚠ No subjects assigned to this class. Using catalog master lists instead.</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCreationStep(1)}
                    className="btn btn-outline flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formSubject) {
                        setFormError("Please select a Subject.");
                        return;
                      }
                      setFormError(null);
                      setCreationStep(3);
                    }}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <span>Next Step</span> <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {creationStep === 3 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Teacher (Assigned to Subject) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formTeacherId} onChange={(e) => setFormTeacherId(e.target.value)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                      <option value="">Select Teacher</option>
                      {wizardTeachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                  {wizardTeachers.length === 0 && (
                    <p className="text-[11px] text-amber-500 font-bold mt-1">⚠ No teachers mapped. Active fallbacks are loaded.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Start Time <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="09:00 AM"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 font-medium shadow-sm focus:border-primary/50"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-foreground dark:text-slate-100">End Time <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="10:00 AM"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 font-medium shadow-sm focus:border-primary/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Room Number <span className="text-slate-400 text-[11px]">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="102-B"
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 font-medium shadow-sm focus:border-primary/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Period Number</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={formPeriodNo}
                      onChange={(e) => setFormPeriodNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 font-medium shadow-sm focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCreationStep(2)}
                    className="btn btn-outline flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <span>Save Routine Period</span> <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </Modal>

      {/* 5. Standard editing modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Timetable Period Slot">
        <form onSubmit={handleSave} className="p-0 text-left space-y-4 font-bold">
          {formError && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-2.5 text-rose-600 dark:text-rose-400 text-[12px] font-semibold">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Academic Year <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={formAcademicYear} onChange={(e) => setFormAcademicYear(e.target.value)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Class Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formClassName} onChange={(e) => { setFormClassName(e.target.value); setFormSection(""); }} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                  <option value="">Select Class</option>
                  {classNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Section <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <div className="relative">
                <select value={formSection} onChange={(e) => setFormSection(e.target.value)} disabled={!formClassName} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer disabled:opacity-50 focus:border-primary/50" required>
                  <option value="">Select Section</option>
                  {sectionsForFormClassName.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Day <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formDay} onChange={(e) => setFormDay(e.target.value)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                  {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Subject <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                  <option value="">Select Subject</option>
                  {wizardSubjects.map(subName => <option key={subName} value={subName}>{subName}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Teacher <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={formTeacherId} onChange={(e) => setFormTeacherId(e.target.value)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50" required>
                <option value="">Select Teacher</option>
                {wizardTeachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Start Time <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="09:00 AM"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 font-medium shadow-sm focus:border-primary/50"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">End Time <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="10:00 AM"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 font-medium shadow-sm focus:border-primary/50"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Room Number <span className="text-slate-400 text-[11px]">(optional)</span></label>
              <input
                type="text"
                placeholder="102-B"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 font-medium shadow-sm focus:border-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Period Number</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={formPeriodNo}
                onChange={(e) => setFormPeriodNo(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 font-medium shadow-sm focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-foreground dark:text-slate-100">Status <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)} className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm cursor-pointer focus:border-primary/50">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="p-4 flex justify-end gap-3 pt-4 border-t border-border mt-6 -mx-6 mb-[-24px] bg-[#F8FAFC] dark:bg-slate-900/50 rounded-b-xl">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
