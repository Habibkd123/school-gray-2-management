"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Clock, BookOpen, Award, X, ChevronLeft, ChevronRight, Users, UserCheck, FileText, CheckCircle2, Calendar as CalendarIcon, Megaphone } from "lucide-react";
import { useTeachers } from "../../hooks/useTeachers";
import { useStudents } from "../../hooks/useStudents";
import { useClasses } from "../../hooks/useClasses";
import { useSchedules } from "../../hooks/useSchedules";
import { useHolidays } from "../../hooks/useHolidays";
import { useResults } from "../../hooks/useResults";
import { useLeave } from "../../hooks/useLeave";
import { useNotices } from "../../hooks/useNotices";
import { useTeacherAssignment } from "../../hooks/useTeacherAssignment";
import { useAppState } from "../../context/store";
import { useThemeColors } from "../SchoolThemeProvider";
import { getAuthHeaders } from "@/lib/utils/session";

interface TeacherDashboardProps {
  user: any;
}

const getScheduleProgress = (day: string, start: string, end: string) => {
  try {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const parseTimeToMinutes = (tStr: string) => {
      const parts = tStr.trim().toLowerCase().match(/^(\d+):(\d+)\s*(am|pm)?$/);
      if (!parts) return 0;
      let hrs = parseInt(parts[1], 10);
      const mins = parseInt(parts[2], 10);
      const ampme = parts[3];
      if (ampme === 'pm' && hrs < 12) hrs += 12;
      if (ampme === 'am' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };

    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (day.toLowerCase() !== currentDay) {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const scheduleDayIdx = days.indexOf(day.toLowerCase());
      const currentDayIdx = days.indexOf(currentDay);
      if (scheduleDayIdx < currentDayIdx) return 100;
      if (scheduleDayIdx > currentDayIdx) return 0;
    }

    if (currentMinutes < startMinutes) return 0;
    if (currentMinutes > endMinutes) return 100;
    return Math.round(((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100);
  } catch {
    return 50;
  }
};

const TeacherDashboard = React.memo(function TeacherDashboard({ user }: TeacherDashboardProps) {
  const theme = useThemeColors();
  const { academicYear } = useAppState();

  const { teachers } = useTeachers();
  const { students, fetchStudents } = useStudents({ skip: true });
  const { classes } = useClasses();
  const { holidays } = useHolidays();
  const { results } = useResults();
  const { leaveRequests: leaves } = useLeave();
  const { notices } = useNotices();
  const { assignments: teacherAssignments, fetchAssignments: fetchTeacherAssignments } = useTeacherAssignment();

  const [teacherSyllabi, setTeacherSyllabi] = useState<any[]>([]);
  const [todaysAttendanceStatus, setTodaysAttendanceStatus] = useState<string>("—");

  const currentTeacherProfile = useMemo(() => {
    if (teachers.length === 0) return null;
    return teachers.find(t => {
      const tUserId = typeof t.user_id === "object" ? t.user_id?._id : t.user_id;
      return tUserId === user?.id;
    });
  }, [teachers, user?.id]);

  const { schedules } = useSchedules(undefined, currentTeacherProfile?._id);

  useEffect(() => {
    if (currentTeacherProfile) {
      fetchTeacherAssignments({ teacher_id: currentTeacherProfile._id, academic_year: academicYear, limit: 500 });
      fetchStudents({ academic_year: academicYear, limit: 1000 });
    }
  }, [currentTeacherProfile, fetchTeacherAssignments, fetchStudents, academicYear]);

  useEffect(() => {
    if (currentTeacherProfile) {
      fetch(`/api/syllabus?teacher_id=${currentTeacherProfile._id}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeacherSyllabi(data.data || []);
          }
        })
        .catch(err => console.error(err));
    }
  }, [currentTeacherProfile]);

  // Calendar dates
  const today = new Date();
  const currentDayName = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  // Assigned Classes & Subjects
  const teacherSchedules = useMemo(() => {
    if (!currentTeacherProfile) return [];
    return schedules.filter(s => {
      const tId = typeof s.teacher_id === 'object' && s.teacher_id !== null ? s.teacher_id._id : s.teacher_id;
      return tId === currentTeacherProfile._id;
    });
  }, [schedules, currentTeacherProfile]);

  const uniqueClasses = useMemo(() => Array.from(new Set(teacherSchedules.map(s => {
    if (typeof s.class_id === 'object' && s.class_id !== null) {
      return `${s.class_id?.name} ${s.class_id?.section}`;
    }
    return String(s.class_id);
  }))), [teacherSchedules]);

  const uniqueSubjects = useMemo(() => Array.from(new Set(teacherSchedules.map(s => {
    if (typeof s.subject_id === 'object' && s.subject_id !== null) {
      return s.subject_id.name;
    }
    return String(s.subject_id);
  }))), [teacherSchedules]);

  const todaysClasses = useMemo(() => {
    return teacherSchedules
      .filter(s => s.day === currentDayName)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [teacherSchedules, currentDayName]);

  const myLeaves = useMemo(() => {
    return leaves.filter(l => {
      const lUserId = typeof l.user_id === 'object' ? l.user_id?._id : l.user_id;
      return lUserId === user?.id;
    }).sort((a, b) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime());
  }, [leaves, user?.id]);

  const approvedLeaves = useMemo(() => myLeaves.filter(l => l.status === "approved").length, [myLeaves]);
  const pendingLeaves = useMemo(() => myLeaves.filter(l => l.status === "pending").length, [myLeaves]);

  const teacherClassIds = useMemo(() => {
    const ids = new Set<string>();
    teacherSchedules.forEach(s => {
      const cId = typeof s.class_id === 'object' && s.class_id !== null ? (s.class_id as any)._id : s.class_id;
      if (cId) ids.add(String(cId));
    });
    return ids;
  }, [teacherSchedules]);

  const teacherStudents = useMemo(() => {
    return students.filter(s => {
      const cId = typeof s.class_id === 'object' && s.class_id !== null ? (s.class_id as any)._id : s.class_id;
      return cId && teacherClassIds.has(String(cId));
    });
  }, [students, teacherClassIds]);

  const totalTeacherStudentsCount = teacherStudents.length;

  const myClassTeacherClasses = useMemo(() => {
    if (!currentTeacherProfile) return [];
    return classes.filter(c => {
      const ctId = typeof c.class_teacher_id === 'object' && c.class_teacher_id !== null
        ? (c.class_teacher_id as any)._id
        : c.class_teacher_id;
      return String(ctId) === String(currentTeacherProfile._id);
    });
  }, [classes, currentTeacherProfile]);

  useEffect(() => {
    if (!currentTeacherProfile) return;
    if (myClassTeacherClasses.length === 0) {
      setTodaysAttendanceStatus("N/A");
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const checkAttendance = async () => {
      try {
        let takenCount = 0;
        for (const cls of myClassTeacherClasses) {
          const res = await fetch(
            `/api/attendance/student?date=${todayStr}&classId=${cls._id}&academic_year=${academicYear}`,
            { headers: getAuthHeaders() }
          );
          const data = await res.json();
          if (data.success && data.data && data.data.length > 0) takenCount++;
        }
        setTodaysAttendanceStatus(
          takenCount === myClassTeacherClasses.length ? "Taken" : `${takenCount}/${myClassTeacherClasses.length}`
        );
      } catch {
        setTodaysAttendanceStatus("—");
      }
    };
    checkAttendance();
  }, [currentTeacherProfile, myClassTeacherClasses, academicYear]);

  const pendingOrInProgressChapters = useMemo(() => {
    const list: any[] = [];
    teacherSyllabi.forEach(syl => {
      const assignment = teacherAssignments.find(a => a._id === syl.teacher_assignment_id);
      const className = assignment?.class_id && typeof assignment.class_id === 'object'
        ? `${(assignment.class_id as any).name} ${(assignment.class_id as any).section || ""}`.trim()
        : "Class";
      const subjectName = assignment?.subject_master_id && typeof assignment.subject_master_id === 'object'
        ? (assignment.subject_master_id as any).name
        : "Subject";
      (syl.chapters || []).forEach((ch: any) => {
        if (ch.status !== "Completed") list.push({ ...ch, className, subjectName });
      });
    });
    return list;
  }, [teacherSyllabi, teacherAssignments]);

  const teacherSubjectIds = useMemo(() => new Set(teacherSchedules.map(s => typeof s.subject_id === 'object' ? s.subject_id._id : s.subject_id)), [teacherSchedules]);
  const teacherResults = useMemo(() => results.filter(r => teacherSubjectIds.has(typeof r.subject_id === 'object' ? r.subject_id._id : r.subject_id)), [results, teacherSubjectIds]);

  const bestPerformers = useMemo(() => [...teacherResults]
    .map(r => ({
      ...r,
      percentage: r.total_marks > 0 ? (r.marks_obtained / r.total_marks) * 100 : 0
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3)
    , [teacherResults]);

  const studentMarksList = useMemo(() => {
    return teacherResults.map(r => {
      const studentInfo = typeof r.student_id === 'object' ? r.student_id as any : null;
      const foundStudent = students.find(s => s._id === studentInfo?._id);
      const classIdObj = foundStudent ? foundStudent.class_id : null;
      let className = "—";
      let sectionName = "—";
      if (classIdObj) {
        if (typeof classIdObj === 'object') {
          className = (classIdObj as any).name || "—";
          sectionName = (classIdObj as any).section || "—";
        } else {
          const cls = classes.find(c => c._id === classIdObj);
          if (cls) { className = cls.name; sectionName = (cls as any).section || "—"; }
        }
      }
      const percentage = r.total_marks > 0 ? (r.marks_obtained / r.total_marks) * 100 : 0;
      const cgpa = (percentage / 20).toFixed(1);
      return {
        id: (foundStudent as any)?.admission_no || (foundStudent as any)?.roll_no || r._id.slice(-5),
        name: studentInfo?.name || "Student",
        photo: foundStudent ? (foundStudent as any)?.photo_url || null : null,
        class: className,
        section: sectionName,
        marks: `${Math.round(percentage)}%`,
        cgpa,
        status: r.is_pass !== false ? "Pass" : "Fail"
      };
    });
  }, [teacherResults, students, classes]);

  const syllabusStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    const inProgressList: any[] = [];

    teacherSyllabi.forEach(syl => {
      const assignment = teacherAssignments.find(a => a._id === syl.teacher_assignment_id);
      const className = assignment?.class_id?.name || "Class";
      const subjectName = assignment?.subject_master_id?.name || "Subject";

      (syl.chapters || []).forEach((ch: any) => {
        total++;
        if (ch.status === "Completed") completed++;
        if (ch.status === "In Progress") {
          inProgressList.push({
            ...ch,
            className,
            subjectName
          });
        }
      });
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      completionRate,
      pendingRate: total > 0 ? 100 - completionRate : 0,
      inProgressList
    };
  }, [teacherSyllabi, teacherAssignments]);

  const latestNotice = notices.filter(n => n.is_published).sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime())[0];

  return (
    <div className="space-y-6 text-left">
      {/* Top Row: Banner, Profile, Syllabus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Welcome Banner */}
        <div className="lg:col-span-6 relative overflow-hidden bg-[#1975D1] rounded-xl text-white p-6 md:p-8 flex flex-col justify-center text-left card-shadow min-h-[160px]">
          <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none" style={{ backgroundImage: "url('/asset 11.svg')", backgroundSize: "cover", backgroundPosition: "center right" }}></div>
          <div className="relative z-10">
            <h2 className="text-[22px] font-bold">Good Morning {user?.name || "Teacher"}</h2>
            <p className="text-[13px] text-white/80 mt-1">Have a Good day at work</p>
            {latestNotice && (
              <div className="mt-4 text-[12px] text-white/90 font-medium">
                Notice : {latestNotice.title}
              </div>
            )}
          </div>
          <img src="/student-performer-01.png" alt="" className="absolute right-4 bottom-0 h-[90%] object-contain" />
        </div>

        {/* Profile Card */}
        <div className="lg:col-span-3 bg-[var(--sidebar-bg)] rounded-xl p-5 card-shadow flex items-center gap-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#2D3748] rounded-full opacity-50"></div>
          <img src={(user as any)?.photo_url || "/asset 12.webp"} alt="Profile" className="w-[72px] h-[72px] rounded-lg object-cover border-2 border-slate-700 z-10 bg-slate-800" />
          <div className="z-10 text-left">
            <span className="bg-white text-primary text-[9px] font-bold px-2 py-0.5 rounded uppercase dark:bg-slate-900">#{(user as any)?.employee_id || "T094001"}</span>
            <h3 className="text-[15px] font-bold text-white mt-1.5">{user?.name || "Teacher Name"}</h3>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1" title={`Classes : ${uniqueClasses.join(', ')} • ${uniqueSubjects.join(', ')}`}>
              Classes : {uniqueClasses.length > 0 ? uniqueClasses.slice(0, 2).join(', ') : "None"}  <span className="mx-1">•</span> {uniqueSubjects.length > 0 ? uniqueSubjects[0] : "No Subject"}
            </p>
          </div>
          <button className="absolute bottom-4 right-4 bg-primary text-white text-[11px] font-bold px-3 py-1.5 rounded z-10 hover:bg-[var(--primary-hover)]">
            Edit Profile
          </button>
        </div>

        {/* Syllabus Progress */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center justify-between text-left">
          <div className="w-[80px] h-[80px] relative shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--danger)" strokeWidth="16" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--primary)" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * syllabusStats.completionRate) / 100} />
            </svg>
          </div>
          <div className="flex-1 ml-6">
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-3">Syllabus</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-primary"></span> Completed : {syllabusStats.completionRate}%
              </div>
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-danger"></span> Pending : {syllabusStats.pendingRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 8 + 4 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8-span) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Class */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
            <div className="flex items-center justify-between mb-5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Today's Class</h3>
                <div className="flex items-center gap-1">
                  <button className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> {today.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' })} <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {todaysClasses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {todaysClasses.map((cls, idx) => {
                  const colors = [
                    { bg: "bg-danger", text: "text-danger" },
                    { bg: "bg-primary", text: "text-primary" },
                    { bg: "bg-success", text: "text-success" },
                    { bg: "bg-info", text: "text-info" },
                  ];
                  const color = colors[idx % colors.length];

                  return (
                    <div key={cls._id || idx} className="bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50">
                      <div className={`${color.bg} text-white text-[11px] font-bold rounded-md px-2 py-1.5 flex items-center justify-center gap-1.5 w-max mb-3`}>
                        <Clock className="w-3 h-3" /> {cls.start_time} - {cls.end_time}
                      </div>
                      <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        {typeof cls.class_id === 'object' ? `${cls.class_id?.name} ${cls.class_id?.section}` : 'Class'} <span className="text-slate-400 dark:text-slate-500 ml-1 font-normal">• {typeof cls.subject_id === 'object' ? cls.subject_id.name : 'Subject'}</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-[13px] text-slate-500 dark:text-slate-400 text-center py-6 border border-dashed border-border rounded-xl">
                No classes scheduled for today
              </div>
            )}
          </div>

          {/* In-Progress Chapters */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              In-Progress Chapters
            </h3>
            {syllabusStats.inProgressList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {syllabusStats.inProgressList.map((ch, idx) => (
                  <div key={idx} className="bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                        CH {ch.chapter_no}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {ch.className} • {ch.subjectName}
                      </span>
                    </div>
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{ch.chapter_name}</h4>
                    {ch.target_date && (
                      <p className="text-[11px] text-slate-500 mt-1 dark:text-slate-400">Target: {new Date(ch.target_date).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-slate-500 dark:text-slate-400 text-center py-6 border border-dashed border-border rounded-xl">
                No chapters currently in progress
              </div>
            )}
          </div>

          {/* Attendance & Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* My Leaves Summary */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">My Leaves Summary</h3>
                <Link href="/leave/apply" className="text-[11px] border border-border px-2 py-1 rounded font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Apply Leave
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase mb-1">Approved Leaves</p>
                  <p className="text-[20px] font-bold text-success">{approvedLeaves}</p>
                </div>
                <div className="text-center p-4 bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase mb-1">Pending Requests</p>
                  <p className="text-[20px] font-bold text-primary">{pendingLeaves}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col space-y-3">
                <h4 className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 border-b border-border pb-2">Recent Leave Requests</h4>
                {myLeaves.length > 0 ? (
                  myLeaves.slice(0, 3).map((leave, idx) => (
                    <div key={leave._id || idx} className="flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white capitalize">{leave.leave_type} Leave</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(leave.from_date).toLocaleDateString()} - {new Date(leave.to_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${leave.status === 'approved' ? 'bg-success/10 text-success' :
                        leave.status === 'rejected' ? 'bg-danger/10 text-danger' :
                          'bg-[var(--section-alt)] text-primary'
                        }`}>
                        {leave.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 text-center py-4">No recent leave requests</div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Best Performers */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Best Performers</h3>
                </div>

                <div className="space-y-5">
                  {bestPerformers.length > 0 ? (
                    bestPerformers.map((result, idx) => {
                      const colors = [
                        { bg: 'bg-primary', bgTrack: 'bg-primary/10 dark:bg-primary/20' },
                        { bg: 'bg-warning', bgTrack: 'bg-warning/10 dark:bg-warning/20' },
                        { bg: 'bg-info', bgTrack: 'bg-info/10 dark:bg-info/20' },
                      ];
                      const color = colors[idx % colors.length];
                      const studentInfo = typeof result.student_id === 'object' ? result.student_id : null;
                      const studentName = studentInfo?.name || "Student";
                      const studentPhoto = (studentInfo as any)?.photo_url || null;

                      return (
                        <div key={result._id || idx} className="flex items-center justify-between text-[12px] font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2 w-28 truncate" title={studentName}>
                            {studentPhoto ? (
                              <img src={studentPhoto} alt={studentName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className={`w-6 h-6 rounded-full ${color.bgTrack} flex items-center justify-center shrink-0`}>
                                <span className="text-[9px]">{studentName.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <span className="truncate">{studentName}</span>
                          </div>
                          <div className={`flex-1 mx-3 h-5 ${color.bgTrack} rounded-full relative overflow-hidden flex items-center px-1`}>
                            <div className={`absolute left-0 top-0 h-full ${color.bg} rounded-full`} style={{ width: `${Math.min(100, result.percentage)}%` }}></div>
                            <div className="flex -space-x-1.5 relative z-10 ml-1">
                              <span className="text-[9px] text-white mix-blend-difference">{typeof result.subject_id === 'object' ? result.subject_id.name : ""}</span>
                            </div>
                          </div>
                          <span className="w-10 text-right">{Math.round(result.percentage)}%</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 text-center py-4">No results published yet for your subjects.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4-span) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {todaysClasses.length}
              </h4>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Today's Classes</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {totalTeacherStudentsCount}
              </h4>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Total Students</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {todaysAttendanceStatus}
              </h4>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Attendance Status</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
              <Award className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {teacherAssignments.length}
              </h4>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Assignments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Plan Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Syllabus / Lesson Plan</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pendingOrInProgressChapters.length > 0 ? (
            pendingOrInProgressChapters.slice(0, 4).map((ch, idx) => {
              const bgColors = [
                'bg-success/10 text-success',
                'bg-primary/10 text-primary',
                'bg-info/10 text-info',
                'bg-danger/10 text-danger'
              ];
              const bgClass = bgColors[idx % bgColors.length];

              return (
                <div key={idx} className="border border-border rounded-xl p-4 flex flex-col justify-between h-[140px] hover:shadow-md transition-shadow">
                  <div className={`${bgClass} text-[11px] font-bold text-center py-1.5 rounded-md mb-3`}>
                    {ch.className}
                  </div>
                  <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-2 line-clamp-2" title={ch.chapter_name}>
                    Ch {ch.chapter_no}: {ch.chapter_name}
                  </h4>
                  <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
                      {ch.subjectName}
                    </span>
                    <span className={`text-[10.5px] font-bold ${ch.status === 'In Progress' ? 'text-amber-500' : 'text-slate-400'}`}>
                      {ch.status}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-[13px] text-slate-500 border border-dashed border-border rounded-xl">
              All chapters are completed! No pending lesson plans.
            </div>
          )}
        </div>
      </div>

      {/* Student Marks Table */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left overflow-x-auto">
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-6">Student Marks</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[12px] text-slate-500 dark:text-slate-400 font-bold border-b border-border">
              <th className="py-3 px-4 rounded-tl-lg">ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Class</th>
              <th className="py-3 px-4">Section</th>
              <th className="py-3 px-4">Marks %</th>
              <th className="py-3 px-4">CGPA</th>
              <th className="py-3 px-4 rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700 dark:text-slate-200 font-medium">
            {studentMarksList.length > 0 ? (
              studentMarksList.slice(0, 5).map((row, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/20">
                  <td className="py-3 px-4">{row.id}</td>
                  <td className="py-3 px-4 flex items-center gap-2">
                    {row.photo ? (
                      <img src={row.photo} className="w-6 h-6 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {row.name}
                  </td>
                  <td className="py-3 px-4">{row.class}</td>
                  <td className="py-3 px-4">{row.section}</td>
                  <td className="py-3 px-4">{row.marks}</td>
                  <td className="py-3 px-4">{row.cgpa}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${row.status === "Pass" ? "bg-success text-white" : "bg-danger text-white"}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No student marks found for your subjects.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default TeacherDashboard;
