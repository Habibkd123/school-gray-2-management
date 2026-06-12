"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSchedules } from "../../../hooks/useSchedules";
import { useClasses } from "../../../hooks/useClasses";
import { useTeachers } from "../../../hooks/useTeachers";
import { useSubjects } from "../../../hooks/useSubjects";
import { useAuth } from "../../../context/auth";
import { 
  Plus, Search, List, Grid, MoreVertical, Edit, Trash2,
  Calendar, Filter, ChevronDown, RefreshCw, Printer, Download, ToggleRight, Loader2
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";

export default function SchedulePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { classes, isLoading: classesLoading } = useClasses();
  const { teachers, isLoading: teachersLoading } = useTeachers();
  const { schedules, isLoading: schedulesLoading, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } = useSchedules();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Form states
  const [formClassId, setFormClassId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formDay, setFormDay] = useState("Monday");
  const [formStartTime, setFormStartTime] = useState("09:30 AM");
  const [formEndTime, setFormEndTime] = useState("10:30 AM");
  const [formRoom, setFormRoom] = useState("101");

  // Fetch dynamic subjects based on selected class
  const { subjects: availableSubjects } = useSubjects(formClassId);

  // Generate time slots (every 15 mins from 7 AM to 6 PM)
  const timeSlots = [];
  for (let h = 7; h <= 18; h++) {
    for (let m = 0; m < 60; m += 15) {
      const period = h >= 12 ? 'PM' : 'AM';
      let hour = h > 12 ? h - 12 : h;
      if (hour === 0) hour = 12;
      timeSlots.push(`${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`);
    }
  }

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

  const openAddModal = () => {
    if (classes.length > 0) setFormClassId(classes[0]._id);
    if (teachers.length > 0) setFormTeacherId(teachers[0]._id);
    setFormSubject("Maths");
    setFormDay("Monday");
    setFormStartTime("09:30 AM");
    setFormEndTime("10:30 AM");
    setFormRoom("101");
    setIsAddOpen(true);
  };

  const openEditModal = (schedule: any) => {
    setSelectedScheduleId(schedule._id);
    setFormClassId(typeof schedule.class_id === "object" ? schedule.class_id._id : schedule.class_id || "");
    setFormTeacherId(typeof schedule.teacher_id === "object" ? schedule.teacher_id._id : schedule.teacher_id || "");
    setFormSubject(typeof schedule.subject_id === "object" ? schedule.subject_id._id : schedule.subject_id || "");
    setFormDay(schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1));
    setFormStartTime(schedule.start_time);
    setFormEndTime(schedule.end_time);
    setFormRoom(schedule.room || "");
    setIsEditOpen(true);
    setActionMenuId(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createSchedule({
      classId: formClassId,
      subject: formSubject,
      teacherId: formTeacherId,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: formRoom
    });
    if (res.success) {
      setIsAddOpen(false);
    } else {
      alert(res.message || "Failed to create schedule");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId) return;
    const res = await updateSchedule(selectedScheduleId, {
      classId: formClassId,
      subject: formSubject,
      teacherId: formTeacherId,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: formRoom
    });
    if (res.success) {
      setIsEditOpen(false);
    } else {
      alert(res.message || "Failed to save schedule");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      const res = await deleteSchedule(id);
      if (!res.success) {
        alert(res.message || "Failed to delete schedule");
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

  const filteredSchedules = schedules.filter(s => {
    const sName = getSubjectName(s.subject_id).toLowerCase();
    const cName = getClassName(s.class_id).toLowerCase();
    const tName = getTeacherName(s.teacher_id).toLowerCase();
    const sId = s._id.toLowerCase();
    const search = searchTerm.toLowerCase();

    return sId.includes(search) || sName.includes(search) || cName.includes(search) || tName.includes(search);
  });

  const isLoading = classesLoading || teachersLoading || schedulesLoading;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Schedule</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/classes" className="hover:text-[#F59E0B]">Classes</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Schedule</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchSchedules()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#F59E0B] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button 
              onClick={openAddModal}
              className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Schedule
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Schedule Classes</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search schedules" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className={`overflow-x-auto ${actionMenuId ? 'pb-28' : ''}`}>
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
              <span>Fetching class schedules...</span>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">ID</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Subject</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Teacher</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Day</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Start Time</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">End Time</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Room</th>
                  {isAdmin && <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-20">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-6 py-12 text-center text-slate-500">
                      No schedule items mapped yet.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((schedule) => (
                    <tr key={schedule._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#F59E0B]">{schedule._id.substring(schedule._id.length - 8)}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-bold">{getClassName(schedule.class_id)}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-semibold">{getSubjectName(schedule.subject_id)}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getTeacherName(schedule.teacher_id)}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">{schedule.day}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono font-semibold">{schedule.start_time}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono font-semibold">{schedule.end_time}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">{schedule.room || "N/A"}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setActionMenuId(actionMenuId === schedule._id ? null : schedule._id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === schedule._id ? "bg-[#F59E0B] text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuId === schedule._id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                              <div className="absolute right-10 top-10 w-36 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                                <button onClick={() => openEditModal(schedule)} className="w-full px-4 py-2 text-[13px] text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                  <Edit className="w-4 h-4 text-[#0F172A] dark:text-slate-100" /> Edit
                                </button>
                                <button onClick={() => handleDelete(schedule._id)} className="w-full px-4 py-2 text-[13px] text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                                  <Trash2 className="w-4 h-4 text-[#0F172A] dark:text-slate-100" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modals */}
      <Modal isOpen={isAddOpen || isEditOpen} onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} title={isAddOpen ? "Add Schedule" : "Edit Schedule"}>
        <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-5 text-left">
          
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
            <div className="relative">
              <select 
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
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
              <select 
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                required
                disabled={!formClassId || availableSubjects.length === 0}
              >
                <option value="">Select Subject</option>
                {availableSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Teacher</label>
            <div className="relative">
              <select 
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
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
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
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
              <div className="relative">
                <select 
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer font-mono"
                  required
                >
                  <option value="">Select Start Time</option>
                  {timeSlots.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">End Time</label>
              <div className="relative">
                <select 
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer font-mono"
                  required
                >
                  <option value="">Select End Time</option>
                  {timeSlots.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class Room / Room No</label>
            <input 
              type="text" 
              value={formRoom} 
              onChange={(e) => setFormRoom(e.target.value)} 
              placeholder="e.g. 101"
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors text-slate-700 dark:text-slate-200" 
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-[#F59E0B] text-white text-[14px] font-bold rounded-lg hover:bg-[#D97706] transition-colors shadow-sm cursor-pointer"
            >
              {isAddOpen ? "Add Schedule" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
