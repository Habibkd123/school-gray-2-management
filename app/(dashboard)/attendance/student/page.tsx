"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  AlertCircle,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  RefreshCcw,
  ArrowLeft,
  GraduationCap,
  User,
  Printer,
  Download,
  Calendar,
  Layers,
  Edit,
  History
} from "lucide-react";
import { useStudentAttendance } from "@/app/hooks/useStudentAttendance";
import { useClasses } from "@/app/hooks/useClasses";
import { useStreams } from "@/app/hooks/useStreams";
import { useStudents } from "@/app/hooks/useStudents";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useAuth } from "@/app/context/auth";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAppState } from "@/app/context/store";
import { getAuthHeaders } from "@/lib/utils/session";
import { PrintService } from "@/app/lib/print-service";

export default function StudentAttendancePage() {
  const router = useRouter();
  const { academicYear } = useAppState();
  const { enableStreams } = useAcademicConfig();

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
  const [filterYear, setFilterYear] = useState(academicYear || "2026");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStreamId, setFilterStreamId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Mode state
  const [mode, setMode] = useState<"take" | "view" | "edit">("take");
  const [actionsOpen, setActionsOpen] = useState(false);

  // Attendance Records state
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: string; note: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [localError, setLocalError] = useState("");
  // Edit Reason & History Modal State
  const [editReason, setEditReason] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Daily statistics and list
  const [dailyAttendances, setDailyAttendances] = useState<any[]>([]);
  const [loadingDailyAttendances, setLoadingDailyAttendances] = useState(false);

  // Selected student rows for bulk operations
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (!loadingAttendance && !loadingStudents && !loadingDailyAttendances && isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [loadingAttendance, loadingStudents, loadingDailyAttendances]);

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

  // Fetch all students for dashboard overview if no class is selected
  useEffect(() => {
    if (!filterClassId && filterYear) {
      fetchStudents({ academic_year: filterYear, limit: 1000 });
    }
  }, [filterClassId, filterYear, fetchStudents]);

  // Fetch student registers when filters change
  useEffect(() => {
    if (filterClassId) {
      fetchStudents({
        classId: filterClassId,
        streamId: filterStreamId || undefined,
        limit: 500,
      });
    }
  }, [filterClassId, filterStreamId, fetchStudents]);

  // Fetch existing class attendance record
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
    setSelectedStudentIds([]);
  }, [filterClassId, filterDate]);

  // Sync component state with database attendance records
  useEffect(() => {
    const newRecords: Record<string, { status: string; note: string }> = {};
    
    // First, set defaults for all students in the class
    students.forEach(s => {
      newRecords[s._id] = { status: "present", note: "" };
    });

    // Overlay existing records from database
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

  // Calculate dynamic dashboard statistics
  const dashboardStats = useMemo(() => {
    let completedClasses = 0;
    let pendingClasses = 0;
    let totalStudents = 0;
    let studentsPresent = 0;
    let studentsAbsent = 0;
    let studentsLate = 0;
    let studentsLeave = 0;

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
          if (rec.status === "present" || rec.status === "half_day" || rec.status === "official_duty") {
            studentsPresent++;
          } else if (rec.status === "absent") {
            studentsAbsent++;
          } else if (rec.status === "late") {
            studentsLate++;
          } else if (rec.status === "leave" || rec.status === "medical_leave") {
            studentsLeave++;
          }
        });
      } else {
        pendingClasses++;
      }
    });

    const attendancePercentage = totalStudents > 0
      ? Math.round(((studentsPresent + studentsLate + (studentsLeave * 0.5)) / totalStudents) * 100)
      : 0;

    return {
      totalClasses: filteredClasses.length,
      completedClasses,
      pendingClasses,
      totalStudents,
      studentsPresent,
      studentsAbsent,
      studentsLate,
      studentsLeave,
      attendancePercentage,
    };
  }, [filteredClasses, dailyAttendances, students, filterStreamId]);

  // Date permission helper info
  const dateInfo = useMemo(() => {
    if (!filterDate) return { isToday: false, isYesterday: false, isPast: false };
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
    return { isToday, isYesterday, isPast };
  }, [filterDate]);

  // Determine editing rights (Principal/Admin have unrestricted rights, Teachers restricted to today)
  const teacherPermission = useMemo(() => {
    if (!isTeacher) return { canEdit: true, message: "" };

    if (!attendance) {
      if (dateInfo.isToday) return { canEdit: true, message: "" };
      return { canEdit: false, message: "Teachers can only submit attendance for the current date." };
    }

    if (dateInfo.isToday) {
      return { canEdit: true, message: "Editing today's attendance requires an audit reason." };
    }

    return { canEdit: false, message: "Teachers are restricted from editing historical attendance logs." };
  }, [isTeacher, attendance, dateInfo]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
  };

  const markAll = (status: string) => {
    const targetIds = selectedStudentIds.length > 0 ? selectedStudentIds : students.map(s => s._id);
    setAttendanceRecords(prev => {
      const copy = { ...prev };
      targetIds.forEach(id => {
        if (copy[id]) copy[id].status = status;
      });
      return copy;
    });
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
      setSuccessMsg("Attendance register successfully recorded!");
      setEditReason("");
      fetchDailyAttendances(filterYear, filterDate);
      
      if (dateInfo.isToday) {
        router.push(`/attendance/student/confirmation?classId=${filterClassId}&date=${filterDate}${filterStreamId ? `&streamId=${filterStreamId}` : ""}`);
      } else {
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    }
  };

  // Row selection helpers
  const handleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    const list = filteredStudents.map(s => s._id);
    if (selectedStudentIds.length === list.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(list);
    }
  };

  // Bulk CSV Export
  const handleBulkExport = () => {
    const targetStudents = selectedStudentIds.length > 0
      ? students.filter(s => selectedStudentIds.includes(s._id))
      : students;

    let csv = "Admission No,Roll No,Student Name,Class,Status,Note\n";
    targetStudents.forEach(s => {
      const rec = attendanceRecords[s._id] || { status: "present", note: "" };
      const classNameStr = typeof s.class_id === "object" && s.class_id ? s.class_id.name : "Class";
      csv += `"${s.admission_no || "N/A"}","${s.roll_no || "-"}","${s.name}","${classNameStr}","${rec.status}","${rec.note || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `student_attendance_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Local matching of search query + status filters
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchQuery = !searchQuery
        ? true
        : s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.admission_no || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.roll_no || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = !statusFilter
        ? true
        : (attendanceRecords[s._id]?.status || "present") === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [students, searchQuery, statusFilter, attendanceRecords]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header Panel */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            {filterClassId && (
              <button
                onClick={() => setFilterClassId("")}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors mr-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
            )}
            Student Attendance Desk
          </h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span className="hover:text-primary cursor-pointer" onClick={() => setFilterClassId("")}>Attendance</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Student Attendance</span>
          </div>
        </div>

        {filterClassId && (
          <div className="relative">
            <button
              onClick={() => setActionsOpen(!actionsOpen)}
              className="btn btn-outline flex items-center gap-2"
            >
              <span>Register Actions</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${actionsOpen ? "rotate-180" : ""}`} />
            </button>
            
            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-xl z-50 overflow-hidden text-[13px] font-semibold text-slate-700 dark:text-slate-300 py-1.5">
                  {!attendance && (
                    <button
                      onClick={() => { setMode("take"); setActionsOpen(false); }}
                      disabled={isTeacher && !dateInfo.isToday}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Start Attendance Entry
                    </button>
                  )}

                  {attendance && (
                    <button
                      onClick={() => { setMode("edit"); setActionsOpen(false); }}
                      disabled={!teacherPermission.canEdit}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Edit Attendance Logs
                    </button>
                  )}

                  {attendance && (
                    <button
                      onClick={() => { setMode("view"); setActionsOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                    >
                      View Current Records
                    </button>
                  )}
                  
                  <div className="h-px bg-border my-1.5"></div>
                  
                  {attendance && (attendance as any).edit_history && (attendance as any).edit_history.length > 0 && (
                    <button
                      onClick={() => { setIsHistoryOpen(true); setActionsOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                    >
                      View Edit History Logs
                    </button>
                  )}
                  
                  <button
                    onClick={() => { PrintService.print("printable-area", { pageSize: "A4" }); setActionsOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Register Sheet
                  </button>
                  <button
                    onClick={() => { handleBulkExport(); setActionsOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV Register
                  </button>
                  
                  <div className="h-px bg-border my-1.5"></div>
                  
                  <button
                    onClick={() => {
                      fetchAttendance({
                        academic_year: filterYear, date: filterDate, classId: filterClassId, streamId: filterStreamId || undefined
                      });
                      setActionsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer text-slate-500"
                  >
                    <span>Refresh Registers</span>
                    <RefreshCcw className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Standard Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex flex-col gap-4 text-left shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-1">Academic Year</label>
            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
              >
                <option value="2026">Session 2026</option>
                <option value="2027">Session 2027</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-450 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-1">Attendance Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-1.8 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
            />
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-1">Class Selection</label>
            <div className="relative">
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
              >
                <option value="">Select Class</option>
                {filteredClasses.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.section ? `- ${c.section}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-450 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {enableStreams && (
            <div className="flex flex-col gap-1 w-full sm:w-44">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-1">Stream</label>
              <div className="relative">
                <select
                  value={filterStreamId}
                  onChange={(e) => setFilterStreamId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
                >
                  <option value="">All Streams</option>
                  {streams.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-450 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          {filterClassId && (
            <>
              <div className="flex flex-col gap-1 w-full sm:w-44">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-1">Attendance Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-955 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                    <option value="late">Late</option>
                    <option value="half_day">Half Day</option>
                    <option value="holiday">Holiday</option>
                    <option value="medical_leave">Medical Leave</option>
                    <option value="official_duty">Official Duty</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-450 mb-1">Search Student</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Student name, admission no, roll no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.8 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DASHBOARD OVERVIEW VIEW */}
      {!filterClassId ? (
        <div className={`space-y-6 relative transition-opacity duration-200 ${(loadingDailyAttendances || loadingStudents) && !isInitialLoad.current ? "opacity-60 pointer-events-none" : ""}`}>
          {(loadingDailyAttendances || loadingStudents) && !isInitialLoad.current && (
            <div className="absolute top-2 right-0 z-10 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-border shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Syncing...</span>
            </div>
          )}
          {(loadingDailyAttendances || loadingStudents) && isInitialLoad.current ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-bold">Compiling dynamic attendance metrics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-left">
              {/* Total Classes */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-655 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.totalClasses}</h3>
                  <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Total Classes</p>
                </div>
              </div>

              {/* Attendance Completed */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.completedClasses}</h3>
                  <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Completed</p>
                </div>
              </div>

              {/* Attendance Pending */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-650 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.pendingClasses}</h3>
                  <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Pending</p>
                </div>
              </div>

              {/* Attendance Percentage */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.attendancePercentage}%</h3>
                  <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Attendance %</p>
                </div>
              </div>

              {/* Students Present */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.studentsPresent}</h3>
                  <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Present</p>
                </div>
              </div>

              {/* Students Absent */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-650 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{dashboardStats.studentsAbsent}</h3>
                  <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Absent</p>
                </div>
              </div>
            </div>
          )}

          {/* Class List Cards Grid */}
          {filteredClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm gap-3 text-slate-400">
              <GraduationCap className="w-12 h-12 opacity-20" />
              <p className="text-xs font-bold">No active classes registered.</p>
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

                // Correct Teacher Designation/Meta Loading
                const teacherObj = cls.class_teacher_id;
                const teacherName = teacherObj ? (typeof teacherObj === "object" ? teacherObj.name : "Assigned") : "Not Assigned";
                const employeeId = teacherObj && typeof teacherObj === "object" ? teacherObj.employee_id : "";

                return (
                  <div
                    key={cls._id}
                    onClick={() => setFilterClassId(cls._id)}
                    className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="p-5 border-b border-border bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary/20 transition-colors">
                          <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-[14px] font-extrabold text-slate-850 dark:text-white leading-tight group-hover:text-primary transition-colors">
                            {cls.name} {cls.section ? <span className="text-slate-400 font-semibold text-xs">- {cls.section}</span> : ""}
                          </h3>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5">{classStudents.length} Students</p>
                        </div>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        isCompleted 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {isCompleted ? "Completed" : "Pending"}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-1.5 text-xs text-slate-550">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold">
                            Class Teacher: <span className="font-extrabold text-slate-800 dark:text-slate-200">{teacherName}</span>
                          </span>
                        </div>
                        {employeeId && (
                          <p className="text-[10px] text-slate-400 font-bold tracking-wide pl-5">Emp ID: {employeeId}</p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterClassId(cls._id);
                        }}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                          isCompleted 
                            ? "border border-border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60" 
                            : "bg-primary text-white hover:bg-primary/95 shadow-sm"
                        }`}
                      >
                        {isCompleted ? "View Daily Registers" : "Mark Attendance Register"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // ATTENDANCE MARKING REGISTER
        <>
          {/* Permission warning bar */}
          {!teacherPermission.canEdit && (
            <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-250 text-amber-700 rounded-xl p-4 flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 dark:text-amber-400 text-xs uppercase tracking-wide">View-Only Register Lock</h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-350 mt-1">{teacherPermission.message}</p>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div
            className={`erp-table-wrap text-left relative transition-opacity duration-200 ${
              (loadingStudents || loadingAttendance) && !isInitialLoad.current ? "opacity-60 pointer-events-none" : ""
            }`}
            id="printable-area"
          >
            {(loadingStudents || loadingAttendance) && !isInitialLoad.current && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-border shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Syncing...</span>
              </div>
            )}
            {(loadingStudents || loadingAttendance) && isInitialLoad.current ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-bold">Loading student registers...</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border bg-slate-50 dark:bg-slate-950/20 flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {(mode === "edit" || mode === "take") && teacherPermission.canEdit && (
                  <>
                    <button
                      onClick={() => markAll("present")}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                    >
                      All Present
                    </button>
                    <button
                      onClick={() => markAll("absent")}
                      className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-200"
                    >
                      All Absent
                    </button>
                    <button
                      onClick={() => markAll("leave")}
                      className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border border-amber-200"
                    >
                      All Leave
                    </button>
                  </>
                )}
                {mode === "view" && (
                  <span className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg uppercase tracking-wider">
                    Viewing Saved Register
                  </span>
                )}
              </div>
              
              <div className="text-[11px] font-extrabold text-slate-500">
                Register Students Count: <span className="font-mono text-slate-850 dark:text-white text-xs">{filteredStudents.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="w-10 col-center">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                        onChange={handleSelectAllStudents}
                        className="w-4 h-4 accent-primary cursor-pointer rounded"
                      />
                    </th>
                    <th className="w-24">Roll No</th>
                    <th>Student Name</th>
                    <th className="w-52">Attendance Status</th>
                    <th>Verification Note</th>
                    <th className="col-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => (
                      <tr key={student._id}>
                        <td className="col-center">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student._id)}
                            onChange={() => handleSelectStudent(student._id)}
                            className="w-4 h-4 accent-primary cursor-pointer rounded"
                          />
                        </td>
                        <td className="font-mono font-bold text-slate-500 dark:text-slate-400">
                          {student.roll_no || "-"}
                        </td>
                        <td className="font-bold text-slate-850 dark:text-white">
                          {student.name}
                        </td>
                        <td>
                          <select
                            value={attendanceRecords[student._id]?.status || "present"}
                            onChange={(e) => handleStatusChange(student._id, e.target.value)}
                            disabled={!teacherPermission.canEdit || submitting || mode === "view"}
                            className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold outline-none border cursor-pointer appearance-none bg-no-repeat bg-[right_10px_center] ${
                              attendanceRecords[student._id]?.status === "present"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : attendanceRecords[student._id]?.status === "absent"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : ["leave", "medical_leave", "half_day"].includes(attendanceRecords[student._id]?.status)
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-border"
                            }`}
                            style={{
                              backgroundImage:
                                'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22currentColor%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                              backgroundSize: "8px",
                            }}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="leave">Leave</option>
                            <option value="late">Late</option>
                            <option value="half_day">Half Day</option>
                            <option value="holiday">Holiday</option>
                            <option value="medical_leave">Medical Leave</option>
                            <option value="official_duty">Official Duty</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder={teacherPermission.canEdit && mode !== "view" ? "Add remark/reason..." : "—"}
                            value={attendanceRecords[student._id]?.note || ""}
                            onChange={(e) => handleNoteChange(student._id, e.target.value)}
                            disabled={!teacherPermission.canEdit || submitting || mode === "view"}
                            className="w-full px-3 py-1.5 border border-transparent hover:border-border focus:border-primary rounded-lg text-xs outline-none bg-transparent focus:bg-white dark:focus:bg-slate-900 transition-all disabled:opacity-60"
                          />
                        </td>
                        <td className="col-right">
                          <button
                            onClick={() => router.push(`/attendance/student/${student._id}`)}
                            className="px-3 py-1 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-750 rounded transition-colors"
                          >
                            Logs
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions footer bar */}
            <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                {successMsg && (
                  <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {successMsg}
                  </span>
                )}
                {localError && (
                  <span className="text-rose-500 text-xs font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {localError}
                  </span>
                )}
              </div>
              
              {(mode === "edit" || mode === "take") && (
                <div className="flex flex-wrap items-end gap-3 w-full sm:w-auto justify-end">
                  {attendance && mode === "edit" && (
                    <div className="flex flex-col gap-1 text-left w-full sm:w-[240px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Reason for Edit <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Corrected selection error"
                        value={editReason}
                        onChange={(e) => {
                          setEditReason(e.target.value);
                          setLocalError("");
                        }}
                        className="w-full px-3 py-1.5 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                  {teacherPermission.canEdit && (
                    <button
                      onClick={handleSave}
                      disabled={submitting || !!(attendance && !editReason.trim())}
                      className="px-5 py-2.2 bg-primary hover:bg-primary/95 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save Attendance Register</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            </>
          )}
        </div>

          {/* Floating Bulk Operations bar */}
          {selectedStudentIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 z-50 animate-bounce-short font-sans text-xs">
              <div>
                <span className="font-black text-emerald-450">{selectedStudentIds.length}</span> students selected
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div className="flex gap-2">
                <button
                  onClick={() => { markAll("present"); setSelectedStudentIds([]); }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Mark Present
                </button>
                <button
                  onClick={() => { markAll("absent"); setSelectedStudentIds([]); }}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Mark Absent
                </button>
                <button
                  onClick={() => { markAll("leave"); setSelectedStudentIds([]); }}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Mark Leave
                </button>
                <button
                  onClick={handleBulkExport}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-750 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-750"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={() => setSelectedStudentIds([])}
                  className="px-3 py-2 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ATTENDANCE EDIT HISTORY MODAL ── */}
      {isHistoryOpen && attendance && (attendance as any).edit_history && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col z-50 shadow-2xl text-left">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-550" />
                  <span>Register Edit Audit History Logs</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Timeline log audit of all edits applied to this register.</p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-slate-450" />
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
                    <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold">
                          {entry.edited_by_name?.charAt(0) || "A"}
                        </div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {entry.edited_by_name || "Admin/Principal"}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-400">{entryDate}</span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="text-xs bg-slate-50/50 dark:bg-slate-950/20 px-3 py-2 rounded-lg border border-border/50 italic text-slate-655 pl-3">
                        <span className="font-bold not-italic text-slate-450 mr-1.5">Reason for Edit:</span>
                        {entry.reason || "No reason provided"}
                      </div>

                      <div className="overflow-x-auto border border-border/60 rounded-lg">
                        <table className="erp-table text-xs">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-950/20 text-slate-500 border-b border-border/60 font-bold">
                            <tr>
                              <th className="px-3 py-2 w-1/3">Student Name</th>
                              <th className="px-3 py-2">Old Status</th>
                              <th className="px-3 py-2">Updated Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 font-semibold text-slate-700 dark:text-slate-300">
                            {entry.changes?.map((change: any, cIdx: number) => (
                              <tr key={cIdx} className="hover:bg-slate-50/30">
                                <td className="px-3 py-2 font-bold text-slate-850 dark:text-white">
                                  {change.student_name || "Student"}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="capitalize text-slate-400 line-through">
                                    {change.old_status}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`capitalize px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                    change.new_status === "present"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : change.new_status === "absent"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}>
                                    {change.new_status}
                                  </span>
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

            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-950/20 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-100 bg-white transition-colors cursor-pointer"
              >
                Close History Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
