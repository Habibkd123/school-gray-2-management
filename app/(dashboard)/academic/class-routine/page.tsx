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
  ChevronRight, ChevronLeft, Check, HelpCircle
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
  if (name.includes("math")) return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
  if (name.includes("science") || name.includes("phys") || name.includes("chem") || name.includes("bio")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (name.includes("english") || name.includes("grammar") || name.includes("lit")) {
    return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800";
  }
  if (name.includes("computer") || name.includes("it") || name.includes("programming") || name.includes("coding")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800";
  }
  if (name.includes("history") || name.includes("civics") || name.includes("geog") || name.includes("social")) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800";
  }
  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700";
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

  // Grouped details for Grid View Matrix mapping
  const gridMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, ApiSchedule[]>> = {};
    DAYS.forEach(day => {
      matrix[day.toLowerCase()] = {};
      timeSlots.forEach(slot => {
        matrix[day.toLowerCase()][slot] = [];
      });
    });

    schedules.forEach(s => {
      const d = s.day.toLowerCase();
      const slot = `${s.start_time} - ${s.end_time}`;
      if (matrix[d] && matrix[d][slot]) {
        matrix[d][slot].push(s);
      }
    });
    return matrix;
  }, [schedules, timeSlots]);

  const isLoading = classesLoading || teachersLoading || schedulesLoading;

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Class Routine Planner
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            Build and optimize conflict-free schedules automatically integrated with teacher workload profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* List/Grid layout toggle */}
          <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${viewMode === "grid" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              <Grid className="w-3.5 h-3.5" /> Timetable
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${viewMode === "list" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              <List className="w-3.5 h-3.5" /> Records Table
            </button>
          </div>

          <button onClick={() => loadFilteredSchedules()} className="w-9 h-9 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Slot
            </button>
          )}

          {/* ERP central print button */}
          <PrintButton targetId="printable-timetable" label="Export Timetable" variant="outline" />
        </div>
      </div>

      {/* 2. Unified Advanced Filters Panel */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm text-left grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg outline-none"
          >
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Class Name</label>
          <select
            value={filterClassName}
            onChange={(e) => { setFilterClassName(e.target.value); setFilterSection(""); }}
            className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg outline-none"
          >
            <option value="">All Classes</option>
            {classNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Section</label>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            disabled={!filterClassName}
            className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg outline-none disabled:opacity-50"
          >
            <option value="">All Sections</option>
            {sectionsForClassName.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Teacher</label>
          <select
            value={filterTeacherId}
            onChange={(e) => setFilterTeacherId(e.target.value)}
            className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg outline-none"
          >
            <option value="">All Teachers</option>
            {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Day</label>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg outline-none"
          >
            <option value="">All Days</option>
            {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg outline-none"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="col-span-1 sm:col-span-2 space-y-1 relative">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search teacher, subject, room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Timetable Visual Grid Layout */}
      <div id="printable-timetable" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden text-left p-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
              {filterClassName ? `${filterClassName} - ${filterSection || "All Sections"}` : "Master Academic Timetable"} ({filterYear})
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Weekly schedule overview sorted by day period slots.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{schedules.length} Timetable slots</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin" />
            <span className="text-xs font-semibold">Loading scheduler matrices...</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">No schedules created</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              There are no timetable slots registered matching your current filter selections.
            </p>
            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md"
              >
                Create First Slot
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Visual Table Grid Matrix */
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full border-collapse min-w-[900px] text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-500 text-left w-48">Time Slot</th>
                  {DAYS.map(day => (
                    <th key={day} className="p-4 font-bold text-slate-700 dark:text-slate-200 text-center">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
                    <td className="p-4 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{slot}</span>
                      </div>
                    </td>
                    {DAYS.map(day => {
                      const slotsForCell = gridMatrix[day.toLowerCase()][slot] || [];
                      return (
                        <td key={day} className="p-3 align-top min-h-24 w-40 border-r border-slate-100 dark:border-slate-900 last:border-r-0">
                          {slotsForCell.length === 0 ? (
                            <div className="h-full flex items-center justify-center p-4 text-slate-300 dark:text-slate-800">
                              <span className="text-[10px] tracking-wide font-medium">—</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {slotsForCell.map(routine => {
                                const cls = typeof routine.class_id === "object" ? routine.class_id : null;
                                const subjectObj = typeof routine.subject_id === "object" ? routine.subject_id : null;
                                const teacherObj = typeof routine.teacher_id === "object" ? routine.teacher_id : null;
                                const subjectName = subjectObj ? subjectObj.name : String(routine.subject_id);

                                return (
                                  <div
                                    key={routine._id}
                                    className={`p-3 rounded-lg border text-left relative group shadow-sm transition-all hover:shadow-md ${getSubjectColor(subjectName)}`}
                                  >
                                    <div className="font-bold text-[13px] leading-tight pr-5">{subjectName}</div>
                                    
                                    <div className="text-[11px] mt-1.5 flex items-center gap-1.5 opacity-80 font-medium">
                                      <User className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{teacherObj ? teacherObj.name : "N/A"}</span>
                                    </div>

                                    <div className="text-[10px] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 opacity-85">
                                      <span className="font-bold uppercase tracking-wider">{cls ? `${cls.name}-${cls.section}` : "Class"}</span>
                                      {routine.room && (
                                        <>
                                          <span>•</span>
                                          <span className="font-semibold bg-white/40 dark:bg-black/25 px-1 py-0.2 rounded font-mono">Room {routine.room}</span>
                                        </>
                                      )}
                                    </div>

                                    {routine.status === "Inactive" && (
                                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-400" title="Archived" />
                                    )}

                                    {/* Action Hover menu */}
                                    {isAdmin && (
                                      <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 shadow-sm">
                                        <button onClick={() => handleOpenEdit(routine)} className="p-0.5 hover:text-indigo-600 text-slate-500 cursor-pointer" title="Edit"><Edit className="w-3 h-3" /></button>
                                        <button onClick={() => handleOpenDuplicate(routine)} className="p-0.5 hover:text-indigo-600 text-slate-500 cursor-pointer" title="Duplicate"><Copy className="w-3 h-3" /></button>
                                        <button onClick={() => handleDeleteRoutine(routine._id)} className="p-0.5 hover:text-red-600 text-slate-500 cursor-pointer" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Records Table view mode */
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500">
                  <th className="p-4 text-left">Day</th>
                  <th className="p-4 text-left">Period</th>
                  <th className="p-4 text-left">Class</th>
                  <th className="p-4 text-left">Subject</th>
                  <th className="p-4 text-left">Teacher</th>
                  <th className="p-4 text-left">Room</th>
                  <th className="p-4 text-left">Time Slot</th>
                  <th className="p-4 text-left">Status</th>
                  {isAdmin && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {schedules.map((routine, idx) => {
                  const cls = typeof routine.class_id === "object" ? routine.class_id : null;
                  const subjectObj = typeof routine.subject_id === "object" ? routine.subject_id : null;
                  const teacherObj = typeof routine.teacher_id === "object" ? routine.teacher_id : null;
                  const subjectName = subjectObj ? subjectObj.name : String(routine.subject_id);

                  return (
                    <tr key={routine._id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-4 font-bold text-slate-900 dark:text-white capitalize">{routine.day}</td>
                      <td className="p-4 font-mono font-bold text-slate-500">Period {routine.period_no || idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{cls ? `${cls.name} - ${cls.section}` : "N/A"}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getSubjectColor(subjectName)}`}>
                          {subjectName}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-700 dark:text-slate-300">{teacherObj ? teacherObj.name : "N/A"}</td>
                      <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">{routine.room || "—"}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{routine.start_time} - {routine.end_time}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${routine.status === "Inactive" ? "bg-slate-100 text-slate-600 dark:bg-slate-800" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20"}`}>
                          {routine.status || "Active"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleOpenEdit(routine)} className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-indigo-600 cursor-pointer" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleOpenDuplicate(routine)} className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-indigo-600 cursor-pointer" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleToggleArchive(routine)} className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-amber-600 cursor-pointer" title={routine.status === "Inactive" ? "Activate" : "Archive"}><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                            <button onClick={() => handleDeleteRoutine(routine._id)} className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-red-600 cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Wizard creation Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Timetable Period">
        <div className="p-0 text-left space-y-6">
          {formError && (
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-semibold shadow-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Wizard step bullets */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${creationStep >= 1 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>1</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Class</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${creationStep >= 2 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>2</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Subject</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${creationStep >= 3 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>3</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Teacher & Time</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {creationStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Academic Year *</label>
                  <select value={formAcademicYear} onChange={(e) => setFormAcademicYear(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Class Name *</label>
                  <select value={formClassName} onChange={(e) => { setFormClassName(e.target.value); setFormSection(""); }} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
                    <option value="">Select Class</option>
                    {classNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Section (if available)</label>
                  <select value={formSection} onChange={(e) => setFormSection(e.target.value)} disabled={!formClassName} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold disabled:opacity-50" required>
                    <option value="">Select Section</option>
                    {sectionsForFormClassName.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Day *</label>
                  <select value={formDay} onChange={(e) => setFormDay(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
                    {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
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
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {creationStep === 2 && (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Class Room Target: <strong className="text-slate-800 dark:text-white">{formClassName} - {formSection || "All"}</strong>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Subject (Assigned to Class) *</label>
                  <select value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
                    <option value="">Select Subject</option>
                    {wizardSubjects.map(subName => <option key={subName} value={subName}>{subName}</option>)}
                  </select>
                  {wizardSubjects.length === 0 && (
                    <p className="text-[10px] text-amber-500 font-bold mt-1">⚠ No subjects assigned to this class. Using catalog master lists instead.</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCreationStep(1)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
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
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {creationStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Teacher (Assigned to Subject) *</label>
                  <select value={formTeacherId} onChange={(e) => setFormTeacherId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
                    <option value="">Select Teacher</option>
                    {wizardTeachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                  {wizardTeachers.length === 0 && (
                    <p className="text-[10px] text-amber-500 font-bold mt-1">⚠ No teachers mapped. Active fallbacks are loaded.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Start Time *</label>
                    <input
                      type="text"
                      placeholder="09:00 AM"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">End Time *</label>
                    <input
                      type="text"
                      placeholder="10:00 AM"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Room Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="102-B"
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Period Number</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={formPeriodNo}
                      onChange={(e) => setFormPeriodNo(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreationStep(2)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    Save Routine Period <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </Modal>

      {/* 5. Standard editing modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Timetable Period Slot">
        <form onSubmit={handleSave} className="p-0 text-left space-y-4">
          {formError && (
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-semibold shadow-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Academic Year *</label>
            <select value={formAcademicYear} onChange={(e) => setFormAcademicYear(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Class Name *</label>
              <select value={formClassName} onChange={(e) => { setFormClassName(e.target.value); setFormSection(""); }} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
                <option value="">Select Class</option>
                {classNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Section</label>
              <select value={formSection} onChange={(e) => setFormSection(e.target.value)} disabled={!formClassName} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold disabled:opacity-50" required>
                <option value="">Select Section</option>
                {sectionsForFormClassName.map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Day *</label>
              <select value={formDay} onChange={(e) => setFormDay(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
                {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Subject *</label>
              <select value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
                <option value="">Select Subject</option>
                {wizardSubjects.map(subName => <option key={subName} value={subName}>{subName}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Teacher *</label>
            <select value={formTeacherId} onChange={(e) => setFormTeacherId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold" required>
              <option value="">Select Teacher</option>
              {wizardTeachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Start Time *</label>
              <input
                type="text"
                placeholder="09:00 AM"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">End Time *</label>
              <input
                type="text"
                placeholder="10:00 AM"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Room Number (Optional)</label>
              <input
                type="text"
                placeholder="102-B"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Period Number</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={formPeriodNo}
                onChange={(e) => setFormPeriodNo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Status *</label>
            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-600 font-bold">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-md cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
