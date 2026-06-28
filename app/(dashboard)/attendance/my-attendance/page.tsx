"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "../../../context/auth";
import { useStudents } from "../../../hooks/useStudents";
import { useTeachers } from "../../../hooks/useTeachers";
import { useAttendanceSummary } from "../../../hooks/useAttendanceSummary";

export default function MyAttendancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const { students, isLoading: studentsLoading } = useStudents({ skip: !isStudent });
  const { teachers, isLoading: teachersLoading } = useTeachers({ skip: !isTeacher });
  const { fetchDetail, isLoading: summaryLoading } = useAttendanceSummary();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [records, setRecords] = useState<Array<{ date: string; status: string; note?: string }>>([]);

  // Resolve DB profile ID matching user.id
  useEffect(() => {
    if (isStudent && students.length > 0) {
      const studentProfile = students.find(s => {
        const sUserId = typeof s.user_id === "object" && s.user_id ? s.user_id._id : s.user_id;
        return sUserId === user?.id;
      });
      if (studentProfile) {
        setProfileId(studentProfile._id);
        const cId = typeof studentProfile.class_id === "object" && studentProfile.class_id
          ? studentProfile.class_id._id
          : studentProfile.class_id;
        setClassId(cId || null);
      }
    } else if (isTeacher && teachers.length > 0) {
      const teacherProfile = teachers.find(t => {
        const tUserId = typeof t.user_id === "object" && t.user_id ? t.user_id._id : t.user_id;
        return tUserId === user?.id;
      });
      if (teacherProfile) {
        setProfileId(teacherProfile._id);
      }
    }
  }, [user, students, teachers, isStudent, isTeacher]);

  // Load attendance details when profileId/month updates
  useEffect(() => {
    if (!profileId) return;
    if (isStudent && !classId) return;

    const loadAttendance = async () => {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      const start = `${yearStr}-${monthStr}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

      const type = isStudent ? "student" : "teacher";

      const res = await fetchDetail(start, end, type, profileId, classId || undefined);
      if (res) {
        const sorted = [...res].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setRecords(sorted);
      } else {
        setRecords([]);
      }
    };

    loadAttendance();
  }, [profileId, classId, selectedMonth, isStudent, fetchDetail]);

  const pageLoading = authLoading || (isStudent && studentsLoading) || (isTeacher && teachersLoading) || summaryLoading;

  if (!isStudent && !isTeacher) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div>
            <h1 className="page-title">My Attendance</h1>
            <p className="page-desc mt-1">
              View your attendance records and statistics.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-8 card-shadow text-center max-w-md mx-auto mt-8">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-2">Roster Not Tracked</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Attendance tracking is only configured for **Student** and **Teacher** roles. Your account role ({user?.role?.replace("_", " ")}) does not have an attendance schedule.
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics from loaded records
  const workingDays = records.filter(r => r.status !== "holiday").length;
  const presentCount = records.filter(r => r.status === "present").length;
  const lateCount = records.filter(r => r.status === "late").length;
  const absentCount = records.filter(r => r.status === "absent").length;
  const halfDayCount = records.filter(r => r.status === "half_day").length;

  const attendanceRate = workingDays > 0
    ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / workingDays) * 100)
    : 0;

  const getStatusBadgeClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30";
      case "absent":
        return "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/30";
      case "late":
        return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/30";
      case "half_day":
        return "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/30";
      case "holiday":
        return "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/30";
      default:
        return "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-border";
    }
  };

  const getStatusDotClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "bg-emerald-500";
      case "absent":
        return "bg-rose-500";
      case "late":
        return "bg-amber-500";
      case "half_day":
        return "bg-indigo-500";
      case "holiday":
        return "bg-sky-500";
      default:
        return "bg-slate-400";
    }
  };

  const formatStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "Present";
      case "absent":
        return "Absent";
      case "late":
        return "Late";
      case "half_day":
        return "Half Day";
      case "holiday":
        return "Holiday";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="page-desc mt-1">
            View your attendance records and statistics.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-border rounded-xl px-3.5 py-2 text-[13px] shadow-sm">
          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wider">Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-slate-900 dark:text-white outline-none cursor-pointer font-bold font-mono"
          />
        </div>
      </div>

      {pageLoading && records.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span>Loading your attendance...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Working Days</span>
                <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white block mt-1">
                {workingDays}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Present Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-2xl font-bold text-emerald-600 block mt-1">
                {attendanceRate}%
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Late</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold text-amber-600 block mt-1">
                {lateCount}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Absent</span>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-2xl font-bold text-rose-600 block mt-1">
                {absentCount}
              </span>
            </div>
          </div>

          {/* List */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left">
            <div className="px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                Detailed Attendance Records
              </h2>
              {pageLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
            </div>
            {records.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-[13px]">
                No attendance records found for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400">
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Day</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Note / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white dark:bg-slate-900">
                    {records.map((rec) => {
                      const dateObj = new Date(rec.date);
                      const formattedDate = dateObj.toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      });
                      const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });

                      return (
                        <tr key={rec.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white font-mono">
                            {formattedDate}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                            {weekday}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusBadgeClasses(rec.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotClasses(rec.status)}`} />
                              {formatStatus(rec.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {rec.note || <span className="text-slate-300 dark:text-slate-600">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
