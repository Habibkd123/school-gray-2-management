"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowLeft, Calendar, Users, Home, Loader2, AlertCircle } from "lucide-react";
import { useStudentAttendance } from "@/app/hooks/useStudentAttendance";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";

export default function AttendanceConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { academicYear } = useAppState();

  const classId = searchParams.get("classId") || "";
  const dateParam = searchParams.get("date") || "";
  const streamId = searchParams.get("streamId") || "";

  const { classes } = useClasses();
  const { attendance, isLoading, error, fetchAttendance } = useStudentAttendance();

  useEffect(() => {
    if (academicYear && dateParam && classId) {
      fetchAttendance({
        academic_year: academicYear,
        date: dateParam,
        classId,
        streamId: streamId || undefined,
      });
    }
  }, [academicYear, dateParam, classId, streamId, fetchAttendance]);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c._id === classId);
  }, [classes, classId]);

  const stats = useMemo(() => {
    if (!attendance?.records) return { total: 0, present: 0, absent: 0, late: 0, leave: 0, half_day: 0 };
    const counts = { total: 0, present: 0, absent: 0, late: 0, leave: 0, half_day: 0 };
    attendance.records.forEach((r) => {
      counts.total++;
      if (r.status === "present") counts.present++;
      else if (r.status === "absent") counts.absent++;
      else if (r.status === "late") counts.late++;
      else if (r.status === "leave") counts.leave++;
      else if (r.status === "half_day") counts.half_day++;
    });
    return counts;
  }, [attendance]);

  const formattedDate = useMemo(() => {
    if (!dateParam) return "";
    try {
      return new Date(dateParam).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateParam;
    }
  }, [dateParam]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 text-left">
      {/* Back button */}
      <button
        onClick={() => router.push("/attendance/student")}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-bold text-xs transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Student Attendance</span>
      </button>

      {/* Main card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-8 card-shadow flex flex-col items-center text-center space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading submission summary...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-rose-500">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : !attendance ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <AlertCircle className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">No submission record found for this class and date.</p>
          </div>
        ) : (
          <>
            {/* Animated Success Badge */}
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Submitted!</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Class attendance has been recorded successfully and registers are locked.
              </p>
            </div>

            {/* Attendance Details Card */}
            <div className="w-full bg-slate-50 dark:bg-slate-800/40 border border-border rounded-xl p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Date</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formattedDate}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Class & Section</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selectedClass ? `${selectedClass.name} - ${selectedClass.section}` : "Class Register"}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Metrics Grid */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Total", value: stats.total, color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200" },
                { label: "Present", value: stats.present, color: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" },
                { label: "Absent", value: stats.absent, color: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30" },
                { label: "Late", value: stats.late, color: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" },
                { label: "Leave", value: stats.leave, color: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center justify-center p-3.5 border rounded-xl ${item.color} shadow-sm`}
                >
                  <span className="text-xl font-bold">{item.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 mt-0.5">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="w-full pt-4 flex flex-col sm:flex-row gap-3 justify-center border-t border-border/50">
              <button
                onClick={() => router.push("/attendance/student")}
                className="px-6 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Mark Attendance for Another Class
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
