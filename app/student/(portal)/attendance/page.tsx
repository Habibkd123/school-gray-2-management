"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useStudentAuth } from "../../context/studentAuth";
import { useAttendanceSummary } from "../../../hooks/useAttendanceSummary";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Info,
} from "lucide-react";

export default function StudentAttendancePage() {
  const { studentProfile } = useStudentAuth();
  const { fetchDetail, isLoading: isSummaryLoading } = useAttendanceSummary();

  const classId =
    studentProfile?.class_id && typeof studentProfile.class_id === "object"
      ? studentProfile.class_id._id
      : (studentProfile?.class_id as string);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<
    Array<{ date: string; status: string; note?: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Format month name
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const loadAttendance = useCallback(async () => {
    if (!studentProfile?._id || !classId) return;

    setLoading(true);
    // Fetch start and end of the selected month
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    const startDateStr = startOfMonth.toISOString().split("T")[0];
    const endDateStr = endOfMonth.toISOString().split("T")[0];

    const data = await fetchDetail(
      startDateStr,
      endDateStr,
      "student",
      studentProfile._id,
      classId
    );

    if (data) {
      setAttendanceRecords(data);
    } else {
      setAttendanceRecords([]);
    }
    setLoading(false);
  }, [year, month, studentProfile?._id, classId, fetchDetail]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Stats calculation
  const totalMarked = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const absentCount = attendanceRecords.filter((r) => r.status === "absent").length;
  const lateCount = attendanceRecords.filter((r) => r.status === "late").length;
  const halfDayCount = attendanceRecords.filter((r) => r.status === "half_day").length;
  const holidayCount = attendanceRecords.filter((r) => r.status === "holiday").length;
  const leaveCount = attendanceRecords.filter((r) => r.status === "leave").length;

  const activeDays = totalMarked - holidayCount;
  const presentRate =
    activeDays > 0
      ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / activeDays) * 100)
      : 0;

  // Status mapping
  const statusStyles: Record<
    string,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    present: {
      label: "Present",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-500",
      border: "border-emerald-200 dark:border-emerald-500/20",
    },
    absent: {
      label: "Absent",
      bg: "bg-rose-50 dark:bg-rose-500/10",
      text: "text-rose-700 dark:text-rose-400",
      dot: "bg-rose-500",
      border: "border-rose-200 dark:border-rose-500/20",
    },
    late: {
      label: "Late",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
      border: "border-amber-200 dark:border-amber-500/20",
    },
    half_day: {
      label: "Half Day",
      bg: "bg-orange-50 dark:bg-orange-500/10",
      text: "text-orange-700 dark:text-orange-400",
      dot: "bg-orange-500",
      border: "border-orange-200 dark:border-orange-500/20",
    },
    holiday: {
      label: "Holiday",
      bg: "bg-sky-50 dark:bg-sky-500/10",
      text: "text-sky-700 dark:text-sky-400",
      dot: "bg-sky-500",
      border: "border-sky-200 dark:border-sky-500/20",
    },
    leave: {
      label: "Leave",
      bg: "bg-violet-50 dark:bg-violet-500/10",
      text: "text-violet-700 dark:text-violet-400",
      dot: "bg-violet-500",
      border: "border-violet-200 dark:border-violet-500/20",
    },
  };

  const getRecordForDay = (day: number) => {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
    return attendanceRecords.find((r) => {
      const d = new Date(r.date);
      const recDateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getUTCDate()).padStart(2, "0")}`;
      return targetDateStr === recDateStr;
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Attendance</h1>
          <p className="card-subtitle text-[13px] mt-1">
            Track your daily attendance status and view monthly reports
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 px-3 min-w-[120px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            disabled={
              year >= new Date().getFullYear() && month >= new Date().getMonth()
            }
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Stats Summary ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Present</span>
          </div>
          <p className="section-title">{presentCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Days present</p>
        </div>

        {/* Absent */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Absent</span>
          </div>
          <p className="section-title">{absentCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Days absent</p>
        </div>

        {/* Leave */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
              <Clock className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leave</span>
          </div>
          <p className="section-title">{leaveCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Days on leave</p>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full opacity-5" style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)", transform: "translate(30px, -30px)" }} />
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Percentage</span>
          </div>
          <p className="section-title">{presentRate}%</p>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Based on {activeDays} class days
          </p>
        </div>
      </div>

      {/* ── Main Layout: Calendar + Daily Feed ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            Calendar View
          </h3>

          {/* Calendar Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="text-[11px] font-bold text-slate-400 tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Slots */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Empty slots before first day */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="aspect-square bg-slate-50/50 dark:bg-slate-800/10 border border-transparent rounded-xl"
                />
              ))}

              {/* Days of Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const rec = getRecordForDay(day);
                const styles = rec ? statusStyles[rec.status] : null;

                return (
                  <div
                    key={`day-${day}`}
                    className={`aspect-square relative rounded-xl border flex flex-col items-center justify-center transition-all duration-200 select-none ${
                      styles
                        ? `${styles.bg} ${styles.border}`
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`text-[12px] font-bold ${
                        styles ? styles.text : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {day}
                    </span>
                    {styles && (
                      <span className={`w-1.5 h-1.5 rounded-full absolute bottom-2 ${styles.dot}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legends */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            {Object.entries(statusStyles).map(([key, style]) => (
              <div key={key} className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                <span className="text-slate-600 dark:text-slate-350">{style.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Feed/Detailed List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[480px]">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-4 flex-shrink-0">
            Logs & Notes
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-[13px]">Loading logs...</div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Info className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-[12px]">No logs found for this period</p>
              </div>
            ) : (
              [...attendanceRecords]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((rec, index) => {
                  const styles = statusStyles[rec.status] || {
                    label: rec.status,
                    bg: "bg-slate-50",
                    text: "text-slate-600",
                    dot: "bg-slate-400",
                    border: "border-slate-100",
                  };
                  const dateObj = new Date(rec.date);

                  return (
                    <div
                      key={index}
                      className={`flex flex-col gap-1 p-3 rounded-xl border ${styles.bg} ${styles.border}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-slate-900 dark:text-white">
                          {dateObj.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          })}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${styles.text}`}>
                          {styles.label}
                        </span>
                      </div>
                      {rec.note && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1 bg-white/40 dark:bg-black/10 p-2 rounded-lg leading-relaxed">
                          Note: {rec.note}
                        </p>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
