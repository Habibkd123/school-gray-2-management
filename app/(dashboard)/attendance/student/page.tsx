"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, AlertCircle, Save, Calendar, CheckCircle2, XCircle, Clock, ChevronDown, RefreshCcw, ArrowLeft, GraduationCap, User } from "lucide-react";
import { useStudentAttendance, StudentAttendanceRecord } from "@/app/hooks/useStudentAttendance";
import { useClasses } from "@/app/hooks/useClasses";
import { useStreams } from "@/app/hooks/useStreams";
import { useStudents } from "@/app/hooks/useStudents";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useAuth } from "@/app/context/auth";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAppState } from "@/app/context/store";
import { getAuthHeaders } from "@/lib/utils/session";

export default function StudentAttendancePage() {
  const router = useRouter();
  const { academicYear } = useAppState();
  const { enableStreams, enableSections } = useAcademicConfig();

  const { attendance, isLoading: loadingAttendance, error, fetchAttendance, saveAttendance } = useStudentAttendance();
  const { classes } = useClasses({ filterByYear: true });
  const { streams } = useStreams({ skip: !enableStreams });
  const { students, fetchStudents, isLoading: loadingStudents } = useStudents({ skip: true });

  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const { teachers } = useTeachers({ skip: !isTeacher });
  const { assignments, fetchAssignments } = useTeacherAssignment();

  const teacherProfile = useMemo(() => {
    if (!isTeacher || teachers.length === 0) return null;
    return teachers.find(t => {
      const tUserId = typeof t.user_id === "object" ? t.user_id?._id : t.user_id;
      return tUserId === user?.id;
    });
  }, [isTeacher, teachers, user]);

  useEffect(() => {
    if (isTeacher && teacherProfile?._id && academicYear) {
      fetchAssignments({ teacher_id: teacherProfile._id, academic_year: academicYear, limit: 5000 });
    }
  }, [isTeacher, teacherProfile?._id, academicYear, fetchAssignments]);

  const filteredClasses = useMemo(() => {
    if (isTeacher) {
      if (!teacherProfile) return [];
      
      const assignedClassIds = new Set(
        assignments
          .filter(a => a.academic_year === academicYear)
          .map(a => typeof a.class_id === "object" ? a.class_id?._id : a.class_id)
          .filter(Boolean)
      );

      return classes.filter(cls => {
        const ctId = typeof cls.class_teacher_id === "object" ? cls.class_teacher_id?._id : cls.class_teacher_id;
        return ctId === teacherProfile._id || assignedClassIds.has(cls._id);
      });
    }
    return classes;
  }, [classes, isTeacher, teacherProfile, assignments, academicYear]);

  // Filters
  const [filterYear, setFilterYear] = useState(academicYear);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStreamId, setFilterStreamId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // New Mode State
  const [mode, setMode] = useState<"take" | "view" | "edit">("take");
  const [actionsOpen, setActionsOpen] = useState(false);

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: string; note: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Reason & History Modal State
  const [editReason, setEditReason] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [localError, setLocalError] = useState("");

  // Today's dynamic summary and daily attendances
  const [dailyAttendances, setDailyAttendances] = useState<any[]>([]);
  const [loadingDailyAttendances, setLoadingDailyAttendances] = useState(false);

  const fetchDailyAttendances = useCallback(async (year: string, date: string, streamId?: string) => {
    setLoadingDailyAttendances(true);
    try {
      const qs = new URLSearchParams();
      qs.set("academic_year", year);
      qs.set("date", date);
      if (streamId) qs.set("streamId", streamId);
      const res = await fetch(`/api/attendance/student?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setDailyAttendances(data.data);
      } else {
        setDailyAttendances([]);
      }
    } catch (err) {
      console.error("Failed to fetch daily attendances:", err);
      setDailyAttendances([]);
    } finally {
      setLoadingDailyAttendances(false);
    }
  }, []);

  useEffect(() => {
    if (filterYear && filterDate) {
      fetchDailyAttendances(filterYear, filterDate, filterStreamId || undefined);
    }
  }, [filterYear, filterDate, filterStreamId, fetchDailyAttendances]);

  // Sync back-to-dashboard refetch for all students
  useEffect(() => {
    if (!filterClassId && filterYear) {
      fetchStudents({ academic_year: filterYear, limit: 1000 });
    }
  }, [filterClassId, filterYear, fetchStudents]);

  // Dashboard calculation stats
  const dashboardStats = useMemo(() => {
    let completedClasses = 0;
    let pendingClasses = 0;
    let totalStudents = 0;
    let studentsPresent = 0;
    let studentsAbsent = 0;

    const attendanceMap: Record<string, any> = {};
    dailyAttendances.forEach(att => {
      const classIdStr = typeof att.class_id === "object" ? att.class_id?._id : att.class_id;
      if (classIdStr) {
        attendanceMap[classIdStr] = att;
      }
    });

    filteredClasses.forEach(cls => {
      const att = attendanceMap[cls._id];
      const classStudentsCount = students.filter(s => {
        const sClassId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
        const matchesClass = sClassId === cls._id;
        const sStreamId = typeof (s as any).stream_id === "object" && (s as any).stream_id ? ((s as any).stream_id as any)._id : (s as any).stream_id;
        const matchesStream = !filterStreamId || sStreamId === filterStreamId;
        return matchesClass && matchesStream;
      }).length;

      totalStudents += classStudentsCount;

      if (att && att.records && att.records.length > 0) {
        completedClasses++;
        att.records.forEach((rec: any) => {
          if (rec.status === "present" || rec.status === "late" || rec.status === "half_day") {
            studentsPresent++;
          } else if (rec.status === "absent") {
            studentsAbsent++;
          }
        });
      } else {
        pendingClasses++;
      }
    });

    return {
      totalClasses: filteredClasses.length,
      completedClasses,
      pendingClasses,
      totalStudents,
      studentsPresent,
      studentsAbsent,
    };
  }, [filteredClasses, dailyAttendances, students, filterStreamId]);

  // Date permission helper info
  const dateInfo = useMemo(() => {
    if (!filterDate) return { isToday: false, isYesterday: false, isPast: false, elapsedMs: 0 };
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const utcToday = d.toISOString().split("T")[0];
    const isToday = (filterDate === localToday || filterDate === utcToday);

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const localYesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;
    const utcYesterday = yesterdayDate.toISOString().split("T")[0];
    const isYesterday = (filterDate === localYesterday || filterDate === utcYesterday);

    const isPast = !isToday && !isYesterday;

    let elapsedMs = 0;
    if (attendance) {
      const submittedAt = attendance.createdAt || attendance.updatedAt;
      if (submittedAt) {
        elapsedMs = Date.now() - new Date(submittedAt).getTime();
      }
    }

    return { isToday, isYesterday, isPast, elapsedMs };
  }, [filterDate, attendance]);

  // Determine if user (especially teacher) can edit
  const teacherPermission = useMemo(() => {
    if (!isTeacher) return { canEdit: true, message: "" };

    // If not submitted yet:
    if (!attendance) {
      if (dateInfo.isToday) {
        return { canEdit: true, message: "" };
      }
      return { canEdit: false, message: "Teachers can only submit attendance for today." };
    }

    // If already submitted:
    if (dateInfo.isToday) {
      return { canEdit: true, message: "Editing today's attendance requires a reason." };
    }

    return { canEdit: false, message: "Teachers cannot edit attendance of previous dates." };
  }, [isTeacher, attendance, dateInfo]);

  // Auto-fetch students when filters change
  useEffect(() => {
    if (filterClassId) {
      fetchStudents({
        classId: filterClassId,
        streamId: filterStreamId || undefined,
        limit: 500,
      });
    }
  }, [filterClassId, filterStreamId, fetchStudents]);

  // Fetch existing attendance
  useEffect(() => {
    if (filterClassId && filterDate && filterYear) {
      fetchAttendance({
        academic_year: filterYear,
        date: filterDate,
        classId: filterClassId,
        streamId: filterStreamId || undefined,
      });
    }
  }, [filterYear, filterDate, filterClassId, filterStreamId, fetchAttendance]);

  // Reset reason field when date/class changes
  useEffect(() => {
    setEditReason("");
    setLocalError("");
  }, [filterClassId, filterDate]);

  // Sync state when attendance changes
  useEffect(() => {
    const newRecords: Record<string, { status: string; note: string }> = {};
    
    // First, set defaults for all students
    students.forEach(s => {
      newRecords[s._id] = { status: "present", note: "" };
    });

    // Then, overlay existing records from database
    if (attendance?.records) {
      attendance.records.forEach(r => {
        const sId = typeof r.student_id === "object" && r.student_id ? r.student_id._id : r.student_id;
        if (sId) {
          newRecords[sId.toString()] = { status: r.status, note: r.note || "" };
        }
      });
      setMode("view");
    } else {
      setMode("take");
    }
    setAttendanceRecords(newRecords);
  }, [attendance, students]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
  };

  const markAll = (status: string) => {
    const newRecords = { ...attendanceRecords };
    students.forEach(s => {
      if (newRecords[s._id]) newRecords[s._id].status = status;
    });
    setAttendanceRecords(newRecords);
  };

  const handleSave = async () => {
    if (!filterClassId || !filterDate || !filterYear) return;
    if (!teacherPermission.canEdit) return;

    if (attendance && (!editReason || editReason.trim() === "")) {
      setLocalError("A reason is mandatory when editing attendance.");
      return;
    }

    setSubmitting(true);
    setSuccessMsg("");
    setLocalError("");

    const recordsToSave = Object.keys(attendanceRecords).map(student_id => ({
      student_id,
      status: attendanceRecords[student_id].status,
      note: attendanceRecords[student_id].note,
    }));

    const res = await saveAttendance({
      academic_year: filterYear,
      date: filterDate,
      classId: filterClassId,
      streamId: filterStreamId || undefined,
      records: recordsToSave,
      reason: attendance ? editReason : undefined,
    });

    setSubmitting(false);
    if (res.success) {
      setSuccessMsg("Attendance saved successfully!");
      setEditReason("");
      fetchDailyAttendances(filterYear, filterDate);
      
      // Redirect to confirmation page if same day
      if (dateInfo.isToday) {
        router.push(`/attendance/student/confirmation?classId=${filterClassId}&date=${filterDate}${filterStreamId ? `&streamId=${filterStreamId}` : ""}`);
      } else {
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    }
  };

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {filterClassId && (
              <button
                onClick={() => setFilterClassId("")}
                className="p-1.5 bg-slate-105 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mr-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-650 dark:text-slate-300" />
              </button>
            )}
            Student Attendance
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span className={filterClassId ? "hover:text-primary transition-colors cursor-pointer" : "text-slate-900 dark:text-white font-medium"} onClick={() => setFilterClassId("")}>Attendance</span>
            {filterClassId && (
              <>
                <span>/</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {classes.find(c => c._id === filterClassId)?.name}
                </span>
              </>
            )}
          </div>
        </div>
        
        {filterClassId && (
          <div className="relative">
          <button 
            onClick={() => setActionsOpen(!actionsOpen)} 
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-lg text-[13px] font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            Actions 
            <ChevronDown className={`w-4 h-4 transition-transform ${actionsOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {actionsOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-lg z-50 overflow-hidden text-[13px] font-medium text-slate-700 dark:text-slate-300 py-1">
              {!attendance && (
                <button 
                  onClick={() => { setMode("take"); setActionsOpen(false); }}
                  disabled={isTeacher && !dateInfo.isToday}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Take Attendance
                </button>
              )}

              {attendance && (
                <button 
                  onClick={() => { setMode("edit"); setActionsOpen(false); }}
                  disabled={!teacherPermission.canEdit}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Attendance
                </button>
              )}

              {attendance && (
                <button 
                  onClick={() => { setMode("view"); setActionsOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  View Attendance
                </button>
              )}
              
              <div className="h-px bg-border my-1"></div>
              
              <button 
                onClick={() => { router.push("/reports/attendance-report"); setActionsOpen(false); }}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                Attendance Report
              </button>

              {attendance && (attendance as any).edit_history && (attendance as any).edit_history.length > 0 && (
                <button 
                  onClick={() => { setIsHistoryOpen(true); setActionsOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  Attendance History
                </button>
              )}
              
              <div className="h-px bg-border my-1"></div>
              
              <button onClick={() => { window.print(); setActionsOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50">Export Report (PDF)</button>
              <button onClick={() => { window.print(); setActionsOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50">Print Attendance</button>
              
              <div className="h-px bg-border my-1"></div>
              
              <button 
                onClick={() => { 
                  fetchAttendance({
                    academic_year: filterYear, date: filterDate, classId: filterClassId, streamId: filterStreamId || undefined
                  }); 
                  setActionsOpen(false); 
                }} 
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between"
              >
                Refresh Data <RefreshCcw className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 min-w-[140px] text-left">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Date</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900 font-medium" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-[140px] text-left">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Class</label>
            <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900 font-medium">
              <option value="">Select Class</option>
              {filteredClasses.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
            </select>
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 min-w-[140px] text-left">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Stream</label>
              <select value={filterStreamId} onChange={(e) => setFilterStreamId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900 font-medium">
                <option value="">All Streams</option>
                {streams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {!filterClassId ? (
        // DASHBOARD Landing page view
        <div className="space-y-6">
          {/* Summary Cards */}
          {loadingDailyAttendances || loadingStudents ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-[14px] font-medium">Loading dashboard overview...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-left">
              {/* Total Classes */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.totalClasses}</h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">Total Classes</p>
                </div>
              </div>

              {/* Attendance Completed */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.completedClasses}</h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">Completed</p>
                </div>
              </div>

              {/* Attendance Pending */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.pendingClasses}</h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">Pending</p>
                </div>
              </div>

              {/* Total Students */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.totalStudents}</h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">Total Students</p>
                </div>
              </div>

              {/* Students Present */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.studentsPresent}</h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">Present</p>
                </div>
              </div>

              {/* Students Absent */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.studentsAbsent}</h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">Absent</p>
                </div>
              </div>
            </div>
          )}

          {/* Class List Grid */}
          {filteredClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow gap-3 text-slate-400">
              <GraduationCap className="w-12 h-12 opacity-20" />
              <p className="text-[14px] font-medium">No classes found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {filteredClasses.map(cls => {
                const att = dailyAttendances.find(a => {
                  const classIdStr = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
                  return classIdStr === cls._id;
                });

                const isCompleted = att && att.records && att.records.length > 0;
                const classStudents = students.filter(s => {
                  const sClassId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
                  const matchesClass = sClassId === cls._id;
                  const sStreamId = typeof (s as any).stream_id === "object" && (s as any).stream_id ? ((s as any).stream_id as any)._id : (s as any).stream_id;
                  const matchesStream = !filterStreamId || sStreamId === filterStreamId;
                  return matchesClass && matchesStream;
                });

                const teacherName = typeof cls.class_teacher_id === "object" ? cls.class_teacher_id?.name : "Not Assigned";

                return (
                  <div
                    key={cls._id}
                    onClick={() => setFilterClassId(cls._id)}
                    className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="p-5 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary/20 transition-colors">
                          <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-bold text-slate-800 dark:text-white leading-tight group-hover:text-primary transition-colors">
                            {cls.name} {cls.section ? <span className="text-slate-400 font-medium text-[13px]">- {cls.section}</span> : ""}
                          </h3>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5">{classStudents.length} Students</p>
                        </div>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isCompleted 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" 
                          : "bg-amber-100 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {isCompleted ? "Attendance Completed" : "Attendance Pending"}
                      </span>
                    </div>

                    <div className="p-5 bg-slate-50/20 dark:bg-slate-900/10 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <p className="font-semibold text-slate-600 dark:text-slate-355">
                          Class Teacher: <span className="font-bold text-slate-800 dark:text-slate-200">{teacherName}</span>
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterClassId(cls._id);
                        }}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                          isCompleted 
                            ? "border border-border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50" 
                            : "bg-primary text-white hover:bg-[var(--primary-hover)] shadow-sm"
                        }`}
                      >
                        {isCompleted ? "View Attendance" : "Mark Attendance"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // ATTENDANCE MARKING/VIEWING VIEW
        <>
          {/* Permission message banner */}
          {!teacherPermission.canEdit && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Attendance View-Only</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{teacherPermission.message}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
            {loadingStudents || loadingAttendance ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-[14px] font-medium">Loading records...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
                <AlertCircle className="w-8 h-8" />
                <p className="text-[14px] font-medium">{error}</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <p className="text-[14px] font-medium">No students found for this selection.</p>
              </div>
            ) : (
              <div>
                <div className="p-4 border-b border-border bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    {(mode === "edit" || mode === "take") && teacherPermission.canEdit && (
                      <>
                        <button onClick={() => markAll("present")} className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded cursor-pointer">Mark All Present</button>
                        <button onClick={() => markAll("absent")} className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 rounded cursor-pointer">Mark All Absent</button>
                        <button onClick={() => markAll("leave")} className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded cursor-pointer">Mark All Leave</button>
                      </>
                    )}
                    {mode === "view" && (
                      <span className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">View Only Mode</span>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                    <input type="text" placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[14px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-border dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-20">Roll No</th>
                        <th className="px-4 py-3 font-semibold">Student Name</th>
                        <th className="px-4 py-3 font-semibold w-48">Status</th>
                        <th className="px-4 py-3 font-semibold">Note</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.map(student => (
                        <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{student.roll_no || "-"}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{student.name}</td>
                          <td className="px-4 py-3">
                            <select
                              value={attendanceRecords[student._id]?.status || "present"}
                              onChange={(e) => handleStatusChange(student._id, e.target.value)}
                              disabled={!teacherPermission.canEdit || submitting || mode === "view"}
                              className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold outline-none border-0 appearance-none bg-no-repeat bg-[right_10px_center] ${
                                attendanceRecords[student._id]?.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                attendanceRecords[student._id]?.status === 'absent' ? 'bg-red-100 text-red-700' :
                                attendanceRecords[student._id]?.status === 'leave' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                              }`}
                              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22currentColor%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundSize: '8px' }}
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="leave">Leave</option>
                              <option value="late">Late</option>
                              <option value="half_day">Half Day</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" placeholder={teacherPermission.canEdit ? "Add note..." : ""}
                              value={attendanceRecords[student._id]?.note || ""}
                              onChange={(e) => handleNoteChange(student._id, e.target.value)}
                              disabled={!teacherPermission.canEdit || submitting || mode === "view"}
                              className="w-full px-3 py-1.5 border border-transparent hover:border-border focus:border-primary rounded text-[13px] outline-none bg-transparent focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-50" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => router.push(`/attendance/student/${student._id}`)} 
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded text-xs font-bold transition-colors whitespace-nowrap"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                  <div>
                    {successMsg && <span className="text-emerald-500 text-[13px] font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {successMsg}</span>}
                    {localError && <span className="text-rose-500 text-[13px] font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {localError}</span>}
                  </div>
                  
                  {(mode === "edit" || mode === "take") && (
                    <div className="flex flex-wrap items-end gap-4 w-full sm:w-auto justify-end">
                      {attendance && mode === "edit" && (
                        <div className="flex flex-col gap-1 text-left w-full sm:w-[240px]">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason for Edit <span className="text-rose-500">*</span></span>
                          <input
                            type="text"
                            placeholder="e.g. Corrected entry error"
                            value={editReason}
                            onChange={(e) => {
                              setEditReason(e.target.value);
                              setLocalError("");
                            }}
                            className="w-full px-3 py-1.5 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                          />
                        </div>
                      )}
                      {teacherPermission.canEdit && (
                        <button onClick={handleSave} disabled={submitting}
                          className="px-6 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[14px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save Attendance
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ATTENDANCE EDIT HISTORY MODAL ── */}
      {isHistoryOpen && attendance && (attendance as any).edit_history && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <span>Attendance Edit History Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Audit log of all changes made to this register after first submission.</p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-450 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {[...((attendance as any).edit_history || [])].reverse().map((entry: any, index: number) => {
                const entryDate = new Date(entry.edited_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });
                return (
                  <div key={index} className="border border-border/80 rounded-xl overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-500">
                          {entry.edited_by_name?.charAt(0) || "A"}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {entry.edited_by_name || "Admin/Principal"}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">{entryDate}</span>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3.5">
                      {/* Reason */}
                      <div className="text-[12.5px] bg-slate-50/50 dark:bg-slate-800/20 px-3 py-2 rounded-lg border border-border/50 italic text-slate-600 dark:text-slate-300">
                        <span className="font-semibold not-italic text-slate-500 mr-1.5">Reason:</span>
                        {entry.reason || "No reason provided"}
                      </div>

                      {/* Changes Table */}
                      <div className="overflow-x-auto border border-border/60 rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-800/60 text-slate-500 border-b border-border/60 font-semibold">
                            <tr>
                              <th className="px-3 py-2 w-1/3">Student</th>
                              <th className="px-3 py-2">Previous Status</th>
                              <th className="px-3 py-2">Updated Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 font-medium">
                            {entry.changes?.map((change: any, cIdx: number) => (
                              <tr key={cIdx} className="hover:bg-slate-50/30">
                                <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-bold">
                                  {change.student_name || "Student"}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="capitalize text-slate-400 dark:text-slate-400 line-through">
                                    {change.old_status}
                                  </span>
                                  {change.old_note && (
                                    <span className="block text-[10px] text-slate-400 italic">Note: "{change.old_note}"</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`capitalize px-2 py-0.5 rounded text-[11px] font-bold ${
                                    change.new_status === "present" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" :
                                    change.new_status === "absent" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400" :
                                    "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                  }`}>
                                    {change.new_status}
                                  </span>
                                  {change.new_note && (
                                    <span className="block text-[10px] text-slate-500 italic mt-0.5">Note: "{change.new_note}"</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-border bg-slate-50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
