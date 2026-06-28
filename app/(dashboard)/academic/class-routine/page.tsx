"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSchedules } from "../../../hooks/useSchedules";
import { useClasses } from "../../../hooks/useClasses";
import { useTeachers } from "../../../hooks/useTeachers";
import { useSubjects } from "../../../hooks/useSubjects";
import {
  Plus, Search, List, Grid, MoreVertical, Edit, Trash2,
  Calendar, Filter, ChevronDown, RefreshCw, Printer, Download, ToggleRight, Trash, FileText, Loader2
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";

export default function ClassRoutinePage() {
  const { classes, isLoading: classesLoading } = useClasses();
  const { teachers, isLoading: teachersLoading } = useTeachers();
  const { schedules, isLoading: schedulesLoading, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } = useSchedules();

  const [searchTerm, setSearchTerm] = useState("");
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
    if (classes.length > 0 && !formClassId) {
      setFormClassId(classes[0]._id);
    }
  }, [classes, formClassId]);

  useEffect(() => {
    if (teachers.length > 0 && !formTeacherId) {
      setFormTeacherId(teachers[0]._id);
    }
  }, [teachers, formTeacherId]);

  // Load subjects for the selected class in the form
  const { subjects: formSubjects } = useSubjects(formClassId);

  // Auto-select first subject when class or subject list changes
  useEffect(() => {
    if (formSubjects.length > 0) {
      setFormSubject(formSubjects[0].name);
    } else {
      setFormSubject("");
    }
  }, [formSubjects]);

  const openAddModal = () => {
    if (classes.length > 0) setFormClassId(classes[0]._id);
    if (teachers.length > 0) setFormTeacherId(teachers[0]._id);
    setFormDay("Monday");
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
    const res = await createSchedule({
      classId: formClassId,
      subject: formSubject,
      teacherId: formTeacherId,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: ""
    });
    if (res.success) {
      setIsAddOpen(false);
    } else {
      setFormError(res.message || "Failed to create routine");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoutineId) return;
    setFormError(null);
    const res = await updateSchedule(selectedRoutineId, {
      classId: formClassId,
      subject: formSubject,
      teacherId: formTeacherId,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: ""
    });
    if (res.success) {
      setIsEditOpen(false);
    } else {
      setFormError(res.message || "Failed to update routine");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this routine entry?")) {
      const res = await deleteSchedule(id);
      if (!res.success) {
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
    const rId = r._id.toLowerCase();
    const search = searchTerm.toLowerCase();

    return rId.includes(search) || sName.includes(search) || cName.includes(search) || tName.includes(search);
  });

  const isLoading = classesLoading || teachersLoading || schedulesLoading;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
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
          <button onClick={() => fetchSchedules()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Class Routine
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Class Routine</h2>
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

        {/* Table */}
        <div className={`overflow-x-auto ${actionMenuId ? 'pb-28' : ''}`}>
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
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
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Start Time</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">End Time</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRoutines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                      No routine items mapped yet.
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
                                <Edit className="w-4 h-4 text-foreground dark:text-slate-100" /> Edit
                              </button>
                              <button onClick={() => handleDelete(routine._id)} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                <Trash2 className="w-4 h-4 text-foreground dark:text-slate-100" /> Delete
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

      {/* Add / Edit Modals */}
      <Modal isOpen={isAddOpen || isEditOpen} onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} title={isAddOpen ? "Add Class Routine" : "Edit Class Routine"}>
        <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="p-0 space-y-5 text-left">

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
            <div className="relative">
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Subject</label>
            <div className="relative">
              {formSubjects.length > 0 ? (
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                  required
                >
                  <option value="">Select Subject</option>
                  {formSubjects.map(s => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-4 py-2.5 text-[13px] bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-slate-400 dark:text-slate-500 italic">
                  No subjects available for this class — add subjects first
                </div>
              )}
              {formSubjects.length > 0 && (
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Teacher</label>
            <div className="relative">
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Day</label>
            <div className="relative">
              <select
                value={formDay}
                onChange={(e) => setFormDay(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Start Time</label>
              <TimePicker value={formStartTime} onChange={setFormStartTime} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">End Time</label>
              <TimePicker value={formEndTime} onChange={setFormEndTime} />
            </div>
          </div>



          {/* Conflict / error banner */}
          {formError && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-[13px]">
              <span className="mt-0.5 shrink-0 text-rose-500">⚠</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); setFormError(null); }}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer"
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
  // Expected value format: "09:30 AM" or "10:45 AM"
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
          className="w-full pl-3 pr-8 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 font-mono cursor-pointer"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <span className="text-slate-400 font-bold">:</span>

      <div className="relative flex-1">
        <select
          value={currentMinute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 font-mono cursor-pointer"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <div className="relative w-[75px]">
        <select
          value={currentPeriod}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="w-full pl-3 pr-7 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
