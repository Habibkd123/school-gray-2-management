"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Clock, BookOpen, Percent, CheckCircle2, X, FileText, Award, TrendingUp, Calendar as CalendarIcon, Megaphone } from "lucide-react";
import { useStudents } from "../../hooks/useStudents";
import { useSchedules } from "../../hooks/useSchedules";
import { useNotices } from "../../hooks/useNotices";
import { useHolidays } from "../../hooks/useHolidays";
import { useResults } from "../../hooks/useResults";
import { useLeave } from "../../hooks/useLeave";
import { useHomework } from "../../hooks/useHomework";
import { useAttendanceSummary, AttendanceSummaryRecord } from "../../hooks/useAttendanceSummary";
import { useAppState } from "../../context/store";
import { useThemeColors } from "../SchoolThemeProvider";
import { getAuthHeaders } from "@/lib/utils/session";

interface StudentDashboardProps {
  user?: any;
  studentId?: string;
  classId?: string;
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

const StudentDashboard = React.memo(function StudentDashboard({ user, studentId, classId }: StudentDashboardProps) {
  const theme = useThemeColors();
  const { academicYear } = useAppState();

  const { students } = useStudents({ skip: !!studentId });
  const { notices } = useNotices();
  const { holidays } = useHolidays();
  const { results } = useResults();
  const { leaveRequests: leaves } = useLeave();
  const { homework } = useHomework(undefined);

  const student = useMemo(() => {
    if (studentId) return null;
    return students.find((s) => {
      const sUserId = typeof s.user_id === "object" && s.user_id ? s.user_id._id : s.user_id;
      return sUserId === user?.id;
    }) || null;
  }, [students, user?.id, studentId]);

  const displayStudentId = studentId || student?._id;
  const displayStudentClassId = classId || (typeof student?.class_id === "object" ? student?.class_id?._id : student?.class_id);

  const { schedules } = useSchedules(displayStudentClassId);

  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState<AttendanceSummaryRecord | null>(null);
  const [studentWeeklyAttendance, setStudentWeeklyAttendance] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);

  const { fetchSummary, fetchDetail } = useAttendanceSummary();

  useEffect(() => {
    if (displayStudentId) {
      const fetchMonthly = async () => {
        const todayDate = new Date();
        const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().split('T')[0];
        const summaryData = await fetchSummary(startOfMonth, endOfMonth, "student");
        if (summaryData && summaryData[displayStudentId]) {
          setStudentAttendanceSummary(summaryData[displayStudentId]);
        } else {
          setStudentAttendanceSummary({ present: 0, absent: 0, late: 0, holiday: 0, half_day: 0, leave: 0 });
        }
      };

      const fetchWeekly = async () => {
        const todayDate = new Date();
        const monday = new Date(todayDate);
        const dayOfWeek = todayDate.getDay(); 
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        monday.setDate(todayDate.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startOfWeek = monday.toISOString().split('T')[0];
        const endOfWeek = sunday.toISOString().split('T')[0];

        const details = await fetchDetail(startOfWeek, endOfWeek, "student", displayStudentId);
        if (details) {
          setStudentWeeklyAttendance(details);
        } else {
          setStudentWeeklyAttendance([]);
        }
      };

      fetchMonthly();
      fetchWeekly();
    }
  }, [displayStudentId, fetchSummary, fetchDetail]);

  useEffect(() => {
    if (displayStudentClassId) {
      fetch(`/api/assessments?class_id=${displayStudentClassId}&academic_year=${academicYear}`, {
        headers: getAuthHeaders(),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAssessments(data.data || []);
          }
        })
        .catch(err => console.error(err));
    }
  }, [displayStudentClassId, academicYear]);

  // Derived state calculations
  const today = new Date();
  const currentDayName = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  const studentHomework = useMemo(() => homework.filter(hw => {
    const hwClassId = typeof hw.class_id === 'object' ? hw.class_id?._id : hw.class_id;
    return hwClassId === displayStudentClassId;
  }), [homework, displayStudentClassId]);

  const studentSchedules = useMemo(() => schedules.filter(s => {
    const sClassId = typeof s.class_id === 'object' ? s.class_id?._id : s.class_id;
    return sClassId === displayStudentClassId;
  }), [schedules, displayStudentClassId]);

  const studentResults = useMemo(() => results.filter(r => {
    const rStudentId = typeof r.student_id === 'object' ? r.student_id?._id : r.student_id;
    return rStudentId === displayStudentId;
  }), [results, displayStudentId]);

  const studentLeaves = useMemo(() => leaves.filter(l => {
    const lUserId = typeof l.user_id === 'object' ? l.user_id?._id : l.user_id;
    return lUserId === displayStudentId;
  }), [leaves, displayStudentId]);

  const studentTodaysClasses = useMemo(() => studentSchedules
    .filter(s => s.day === currentDayName)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    , [studentSchedules, currentDayName]);

  const totalAttendanceDays = studentAttendanceSummary
    ? (studentAttendanceSummary.present + studentAttendanceSummary.absent + studentAttendanceSummary.late + studentAttendanceSummary.half_day + (studentAttendanceSummary.leave ?? 0))
    : 0;
  const studentAttendanceRate = totalAttendanceDays > 0 && studentAttendanceSummary
    ? Math.round((studentAttendanceSummary.present / totalAttendanceDays) * 100)
    : 100;
  const pendingHwCount = studentHomework.filter(hw => hw.status !== "completed").length;

  const averageGrade = studentResults.length > 0
    ? Math.round(studentResults.reduce((acc, r) => acc + (r.total_marks > 0 ? (r.marks_obtained / r.total_marks) * 100 : 0), 0) / studentResults.length)
    : 0;

  const totalSubjectsCount = useMemo(() => {
    const seen = new Set();
    studentSchedules.forEach(s => {
      const subId = typeof s.subject_id === 'object' && s.subject_id ? s.subject_id._id : s.subject_id;
      if (subId) seen.add(subId);
    });
    return seen.size;
  }, [studentSchedules]);

  const latestNotice = notices.filter(n => n.is_published).sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime())[0];

  return (
    <div className="space-y-6 text-left">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{studentTodaysClasses.length}</h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Today's Classes</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{totalSubjectsCount}</h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Total Subjects</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-lg">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{studentAttendanceRate}%</h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Attendance Rate</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 text-teal-500 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{studentAttendanceSummary?.present ?? 0}</h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Present Days</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Schedule */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-5">Today's Schedule</h3>
            {studentTodaysClasses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {studentTodaysClasses.map((schedule) => {
                  const subjectInfo = typeof schedule.subject_id === 'object' ? (schedule.subject_id as any)?.name : String(schedule.subject_id || '');
                  const progressVal = getScheduleProgress(schedule.day, schedule.start_time, schedule.end_time);
                  return (
                    <div key={schedule._id} className="border border-border rounded-xl p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">{schedule.start_time} - {schedule.end_time}</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">{subjectInfo}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progressVal}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="card-subtitle text-[13px] py-4 text-center">No classes scheduled for today.</p>
            )}
          </div>

          {/* Pending Homework */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Homework Assignment</h3>
              <Link href="/academic/class-home-work" className="text-xs font-semibold text-primary hover:underline">View All</Link>
            </div>
            {studentHomework.length > 0 ? (
              <div className="space-y-4">
                {studentHomework.slice(0, 3).map((hw) => {
                  const subjectName = typeof hw.subject_id === 'object' ? (hw.subject_id as any)?.name : "Subject";
                  return (
                    <div key={hw._id} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">{hw.title}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{subjectName} • Due: {new Date(hw.due_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${hw.status === 'completed' ? 'bg-success/15 text-success' : 'bg-amber-500/15 text-amber-600'}`}>
                        {hw.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="card-subtitle text-[13px] py-4 text-center">No homework recorded yet.</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Latest Notice */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-4">Latest Notice</h3>
            {latestNotice ? (
              <div className="space-y-2">
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-primary shrink-0" />
                  {latestNotice.title}
                </h4>
                <p className="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-4">{latestNotice.content}</p>
                <p className="text-[11px] text-slate-400 mt-2">Posted on: {new Date(latestNotice.publish_date).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="card-subtitle text-[13px] py-4 text-center">No notices posted.</p>
            )}
          </div>

          {/* Leave Records Summary */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-4">Leaves & Attendance</h3>
            <div className="space-y-3">
              {studentLeaves.length > 0 ? (
                studentLeaves.slice(0, 3).map((leave, idx) => (
                  <div key={leave._id || idx} className="flex justify-between items-center text-[12px]">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 capitalize">{leave.leave_type} Leave</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(leave.from_date).toLocaleDateString()} - {new Date(leave.to_date).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${leave.status === 'approved' ? 'bg-success/15 text-success' : 'bg-amber-500/15 text-amber-600'}`}>
                      {leave.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="card-subtitle text-[13px] py-4 text-center">No leave logs submitted.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StudentDashboard;
