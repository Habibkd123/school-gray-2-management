"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSchedules } from "../../../hooks/useSchedules";
import { useClasses } from "../../../hooks/useClasses";
import { useTeachers } from "../../../hooks/useTeachers";
import { useSubjects } from "../../../hooks/useSubjects";
import { useAuth } from "../../../context/auth";
import { 
  Plus, Search, Edit, Trash2,
  Calendar, ChevronDown, RefreshCw, Loader2, Clock, MapPin, User, BookOpen,
  MoreVertical, CalendarDays, CheckCircle, Layout, ListVideo, Layers
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";

export default function SchedulePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { classes, isLoading: classesLoading } = useClasses();
  const { teachers, isLoading: teachersLoading } = useTeachers();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [filterClassId, setFilterClassId] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");

  // Hook to fetch schedules filtered by teacher
  const { schedules, isLoading: schedulesLoading, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } = useSchedules(
    undefined, 
    selectedTeacherId || undefined
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  
  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form states
  const [formClassId, setFormClassId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formDay, setFormDay] = useState("Monday");
  const [formStartTime, setFormStartTime] = useState("09:30 AM");
  const [formEndTime, setFormEndTime] = useState("10:30 AM");
  const [formRoom, setFormRoom] = useState("101");
  const [formPeriodNo, setFormPeriodNo] = useState("");

  // Fetch dynamic subjects based on selected class
  const { subjects: availableSubjects } = useSubjects(formClassId);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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

  // Set default teacher filter for logged-in teacher
  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacherId) {
      if (user?.role === "teacher") {
        const matchingTeacher = teachers.find(t => {
          const tUserId = typeof t.user_id === "object" && t.user_id !== null ? t.user_id._id : t.user_id;
          return tUserId === user?.id;
        });
        if (matchingTeacher) {
          setSelectedTeacherId(matchingTeacher._id);
        }
      }
    }
  }, [teachers, user, selectedTeacherId]);

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
    setFormSubject("");
    setFormDay("Monday");
    setFormStartTime("09:30 AM");
    setFormEndTime("10:30 AM");
    setFormRoom("101");
    setFormPeriodNo("");
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
    setFormPeriodNo(schedule.period_no ? schedule.period_no.toString() : "");
    setIsEditOpen(true);
    setActiveMenuId(null);
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
      room: formRoom,
      periodNo: formPeriodNo ? parseInt(formPeriodNo, 10) : undefined
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
      room: formRoom,
      periodNo: formPeriodNo ? parseInt(formPeriodNo, 10) : undefined
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
    setActiveMenuId(null);
  };

  const getClassName = (c: any) => {
    if (typeof c === "object" && c !== null) {
      return `${c.name} - ${c.section}`;
    }
    return classes.find(item => item._id === c)?.name || "N/A";
  };

  const getClassId = (c: any) => {
    if (typeof c === "object" && c !== null) return c._id;
    return c;
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

  const getSubjectColor = (subjectName: string) => {
    const colors = [
      "border-l-4 border-l-rose-500",
      "border-l-4 border-l-blue-500",
      "border-l-4 border-l-emerald-500",
      "border-l-4 border-l-violet-500",
      "border-l-4 border-l-amber-500",
      "border-l-4 border-l-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const parseTimeToMinutes = (t: string): number => {
    const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 0;
    const [, h, m, period] = match;
    let hours = parseInt(h, 10);
    const mins = parseInt(m, 10);
    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
    return hours * 60 + mins;
  };

  const filteredSchedules = schedules.filter(s => {
    const sName = getSubjectName(s.subject_id).toLowerCase();
    const cName = getClassName(s.class_id).toLowerCase();
    const tName = getTeacherName(s.teacher_id).toLowerCase();
    const sId = s._id.toLowerCase();
    const search = searchTerm.toLowerCase();

    // Filters
    if (filterClassId && getClassId(s.class_id) !== filterClassId) return false;
    if (filterSubject && getSubjectName(s.subject_id) !== filterSubject) return false;

    return sId.includes(search) || sName.includes(search) || cName.includes(search) || tName.includes(search);
  });

  // Extract unique subjects for the filter dropdown
  const uniqueSubjectsList = Array.from(new Set(schedules.map(s => getSubjectName(s.subject_id)))).sort();

  // Group schedules by Class (Kanban layout)
  const groupedSchedulesByClass = filteredSchedules.reduce((acc, schedule) => {
    const className = getClassName(schedule.class_id);
    if (!acc[className]) acc[className] = [];
    acc[className].push(schedule);
    return acc;
  }, {} as Record<string, typeof filteredSchedules>);

  // Sort each class column by Day then Time
  Object.keys(groupedSchedulesByClass).forEach(className => {
    groupedSchedulesByClass[className].sort((a, b) => {
      const dayDiff = DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
    });
  });

  // Sort class columns alphabetically
  const sortedClassNames = Object.keys(groupedSchedulesByClass).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const hasAnySchedules = filteredSchedules.length > 0;
  const isLoading = classesLoading || teachersLoading || schedulesLoading;

  // Summary Metrics
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysClassesCount = filteredSchedules.filter(s => s.day === today).length;
  const weeklyClassesCount = filteredSchedules.length;
  const uniqueClassIds = new Set(filteredSchedules.map(s => getClassId(s.class_id)));
  const assignedClassesCount = uniqueClassIds.size;
  const freePeriodsCount = Math.max(0, (assignedClassesCount * 30) - weeklyClassesCount);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border shadow-sm">
        <div className="text-left">
          <h1 className="section-title flex items-center gap-2">
            <Layout className="w-6 h-6 text-primary" />
            My Routines
          </h1>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1.5">
            View your complete weekly teaching schedule.
          </p>
          <div className="flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500 mt-3 font-medium">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300">My Routines</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => fetchSchedules(undefined, selectedTeacherId || undefined)} 
            className="w-10 h-10 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-sm cursor-pointer"
            title="Refresh Schedule"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
          {isAdmin && (
            <button 
              onClick={openAddModal}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[14px] font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Routine
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Classes */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today&apos;s Classes</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{todaysClassesCount}</h3>
          </div>
        </div>
        
        {/* Weekly Classes */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ListVideo className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Weekly Classes</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{weeklyClassesCount}</h3>
          </div>
        </div>

        {/* Assigned Classes */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Classes</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{assignedClassesCount}</h3>
          </div>
        </div>

        {/* Free Periods */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Free Periods</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{freePeriodsCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Teacher Select Filter (Admin Only) */}
          {isAdmin && (
            <div className="relative min-w-[180px] flex-1 md:flex-none">
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-[13px] font-medium bg-[#F8FAFC] dark:bg-slate-800 border border-border rounded-xl outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All Teachers</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Class Filter */}
          <div className="relative min-w-[150px] flex-1 md:flex-none">
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 text-[13px] font-medium bg-[#F8FAFC] dark:bg-slate-800 border border-border rounded-xl outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name} - {c.section}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Subject Filter */}
          <div className="relative min-w-[150px] flex-1 md:flex-none">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 text-[13px] font-medium bg-[#F8FAFC] dark:bg-slate-800 border border-border rounded-xl outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="">All Subjects</option>
              {uniqueSubjectsList.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Routine Timetable Grid (Kanban Layout) */}
      <div>
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3 dark:text-slate-400 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <span className="font-medium">Fetching routines data...</span>
          </div>
        ) : !hasAnySchedules ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-4 dark:text-slate-400 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm text-center px-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Routines Found</h3>
            <p className="text-[14px] text-slate-400 max-w-[320px]">
              {selectedTeacherId 
                ? "This teacher doesn't have any classes scheduled matching the criteria." 
                : "No schedule routines mapped yet. Click 'Add Routine' to start planning."}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm p-4 sm:p-6 overflow-hidden">
            {/* Inner Header for All Routines (as seen in image) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-border/40 gap-4">
              <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">All Routines</h2>
              
              {/* Search Bar directly opposite to All Routines */}
              <div className="relative w-full sm:w-[280px]">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search routines" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-medium outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {sortedClassNames.map((className) => {
                const routines = groupedSchedulesByClass[className];
                return (
                  <div key={className} className="bg-white dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[70vh]">
                    
                    {/* Column Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-[15px] truncate pr-2">{className}</h3>
                      </div>
                      <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-md shrink-0">
                        {routines.length} {routines.length === 1 ? 'Period' : 'Periods'}
                      </span>
                    </div>
                    
                    {/* Column Cards */}
                    <div className="space-y-4 flex-1 overflow-y-auto p-4 custom-scrollbar">
                      {routines.map((schedule) => {
                        const subjectName = getSubjectName(schedule.subject_id);
                        const isMenuOpen = activeMenuId === schedule._id;

                        return (
                          <div 
                            key={schedule._id} 
                            className="relative group bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700/50 p-3.5 transition-all duration-300 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 flex flex-col gap-3"
                          >
                            {/* Top Row: Subject & Actions */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                {/* Period Badge - More Compact */}
                                <div className="min-w-[32px] h-[32px] rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100/50 dark:border-amber-900/30 flex flex-col items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-[7px] font-bold text-amber-600/70 uppercase tracking-wider leading-none mb-[1px]">PER</span>
                                  <span className="text-[12px] font-black text-amber-600 leading-none">{schedule.period_no || "-"}</span>
                                </div>
                                
                                <div className="flex flex-col">
                                  <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide leading-tight">
                                    {subjectName}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                      {getTeacherName(schedule.teacher_id)}
                                    </span>
                                    {schedule.room && (
                                      <>
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                        <span className="text-[10px] text-slate-400">Room {schedule.room}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Menu (Admin Only) */}
                              {isAdmin && (
                                <div className="relative shrink-0">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(isMenuOpen ? null : schedule._id);
                                    }}
                                    className="w-7 h-7 rounded-full flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  
                                  {isMenuOpen && (
                                    <div className="absolute right-0 top-8 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-border py-1.5 z-10 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); openEditModal(schedule); }}
                                        className="w-full px-3 py-1.5 text-[13px] font-medium text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                      >
                                        <Edit className="w-3.5 h-3.5" /> Edit
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(schedule._id); }}
                                        className="w-full px-3 py-1.5 text-[13px] font-medium text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Bottom Row: Time and Day */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-50 dark:border-slate-700/30 mt-1">
                              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md border border-slate-100/50 dark:border-slate-700/50">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                                  {schedule.start_time} - {schedule.end_time}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                                {schedule.day}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modals */}
      <Modal isOpen={isAddOpen || isEditOpen} onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} title={isAddOpen ? "Add Routine" : "Edit Routine"}>
        <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-5 text-left">
          
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
              <select 
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
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
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Period Number</label>
              <input 
                type="number" 
                min="1"
                max="20"
                value={formPeriodNo} 
                onChange={(e) => setFormPeriodNo(e.target.value)} 
                placeholder="e.g. 1, 2, 3"
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Start Time</label>
              <div className="relative">
                <select 
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer font-mono"
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
                  className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer font-mono"
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
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" 
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
