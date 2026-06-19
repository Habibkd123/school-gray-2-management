"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParent } from "@/app/hooks/useParent";
import { ChildSelector } from "@/app/components/parent/ChildSelector";
import {
  Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, TrendingUp, Loader2, Sun
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "late" | "half_day" | "holiday" | "not_marked";
  note?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function statusStyle(status: string) {
  switch (status) {
    case "present":  return { bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" };
    case "absent":   return { bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300", dot: "bg-red-500" };
    case "late":     return { bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" };
    case "half_day": return { bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300", dot: "bg-blue-500" };
    case "holiday":  return { bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300", dot: "bg-purple-500" };
    default:         return { bg: "bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-400 dark:text-slate-500", dot: "" };
  }
}

// SVG circular progress ring
function CircleProgress({ pct, color }: { pct: number; color: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
      <circle
        cx="50" cy="50" r={r}
        fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        className="transition-all duration-700"
      />
    </svg>
  );
}

export default function ParentAttendancePage() {
  const { children, selectedChild, selectedChildId, setSelectedChildId, isLoading: isParentLoading } = useParent();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch whenever child or month changes
  useEffect(() => {
    if (selectedChildId) {
      fetchAttendance();
    } else {
      setRecords([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId, currentDate.getMonth(), currentDate.getFullYear()]);

  const fetchAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/parent/attendance?studentId=${selectedChildId}&month=${monthStr}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      } else {
        setError(data.message || "Failed to fetch attendance");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  // Build a lookup: "YYYY-MM-DD" → record
  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach(r => {
      // Normalize: take only date part (handles ISO strings with T)
      const dateKey = r.date.substring(0, 10);
      map[dateKey] = r;
    });
    return map;
  }, [records]);

  const getRecord = (day: number): AttendanceRecord | undefined => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return recordMap[key];
  };

  // Stats
  const stats = useMemo(() => ({
    present:  records.filter(r => r.status === "present").length,
    absent:   records.filter(r => r.status === "absent").length,
    late:     records.filter(r => r.status === "late").length,
    half_day: records.filter(r => r.status === "half_day").length,
    holiday:  records.filter(r => r.status === "holiday").length,
  }), [records]);

  const totalWorking = stats.present + stats.absent + stats.late + stats.half_day;
  const attendedDays  = stats.present + stats.late + stats.half_day * 0.5;
  const pct = totalWorking > 0 ? Math.round((attendedDays / totalWorking) * 100) : 0;
  const pctColor = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  // Current streak (consecutive present/late days from today backwards)
  const streak = useMemo(() => {
    let count = 0;
    for (let d = (isCurrentMonth ? today.getDate() : daysInMonth); d >= 1; d--) {
      const rec = getRecord(d);
      if (rec && (rec.status === "present" || rec.status === "late")) count++;
      else if (rec && rec.status !== "holiday") break;
    }
    return count;
  }, [recordMap, daysInMonth, isCurrentMonth]);

  return (
    <div className="space-y-6 max-w-full sm:w-[1200px] mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border card-shadow">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-500" />
            Attendance Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitor your child's daily presence</p>
        </div>
        <div className="w-full sm:w-[250px]">
          <ChildSelector
            childrenList={children}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            isLoading={isParentLoading}
          />
        </div>
      </div>

      {!selectedChild ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-xl border border-border text-center text-slate-500">
          <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-medium">Select a child to view their attendance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── LEFT: Stats ── */}
          <div className="space-y-4">

            {/* Circle + percentage */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 card-shadow text-center">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 text-[14px]">
                {MONTH_NAMES[month]} {year}
              </h3>

              <div className="relative w-36 h-36 mx-auto mb-5">
                <CircleProgress pct={pct} color={pctColor} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{pct}%</span>
                  <span className="text-[11px] text-slate-400 font-semibold mt-0.5">Attendance</span>
                </div>
              </div>

              {/* Stat rows */}
              <div className="space-y-2.5">
                {[
                  { label: "Present",  val: stats.present,  icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Absent",   val: stats.absent,   icon: <XCircle className="w-4 h-4 text-red-500" />,          color: "text-red-600 dark:text-red-400" },
                  { label: "Late",     val: stats.late,     icon: <AlertCircle className="w-4 h-4 text-amber-500" />,    color: "text-amber-600 dark:text-amber-400" },
                  { label: "Half Day", val: stats.half_day, icon: <Sun className="w-4 h-4 text-blue-400" />,             color: "text-blue-600 dark:text-blue-400" },
                  { label: "Holiday",  val: stats.holiday,  icon: <CalendarIcon className="w-4 h-4 text-purple-400" />,  color: "text-purple-600 dark:text-purple-400" },
                ].map(({ label, val, icon, color }) => (
                  <div key={label} className="flex items-center justify-between text-[13px] px-1">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">{icon} {label}</span>
                    <span className={`font-bold ${color}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak card */}
            <div className="bg-gradient-to-br from-primary to-indigo-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-white/80" />
                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Current Streak</p>
              </div>
              <p className="text-4xl font-black">{streak} <span className="text-lg font-semibold text-white/70">days</span></p>
              <p className="text-[12px] text-white/60 mt-1">Consecutive attendance</p>
            </div>

            {/* Working days */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-4 card-shadow">
              <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Working Days Tracked</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {Math.round(attendedDays)} <span className="text-sm text-slate-400 font-medium">/ {totalWorking}</span>
              </p>
              <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: pctColor }}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-xl border border-red-200 dark:border-red-800/40 text-sm flex items-start gap-2">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
          </div>

          {/* ── RIGHT: Calendar ── */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 card-shadow">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[16px] text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {MONTH_NAMES[month]} {year}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {DAY_NAMES.map(d => (
                <div key={d} className={`text-center text-[11px] font-bold py-1 ${d === "Sun" || d === "Sat" ? "text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty cells */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const record = getRecord(day);
                  const { bg, dot } = statusStyle(record?.status || "not_marked");
                  const isToday = isCurrentMonth && today.getDate() === day;
                  const isSunday = new Date(year, month, day).getDay() === 0;
                  const isSaturday = new Date(year, month, day).getDay() === 6;
                  const isWeekend = isSunday || isSaturday;

                  return (
                    <div
                      key={day}
                      title={record ? `${record.status}${record.note ? " — " + record.note : ""}` : "Not marked"}
                      className={`
                        relative aspect-square flex flex-col items-center justify-center rounded-xl border text-[13px] font-semibold
                        transition-all duration-150 cursor-default
                        ${record ? bg : isWeekend ? "bg-slate-50/50 dark:bg-slate-800/30 border-transparent text-slate-300 dark:text-slate-600" : "bg-slate-50 dark:bg-slate-800/40 border-transparent text-slate-400 dark:text-slate-500"}
                        ${isToday ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-900" : ""}
                      `}
                    >
                      <span>{day}</span>
                      {dot && (
                        <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dot}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-slate-500">
              {[
                { color: "bg-emerald-500", label: "Present" },
                { color: "bg-red-500",     label: "Absent" },
                { color: "bg-amber-500",   label: "Late" },
                { color: "bg-blue-500",    label: "Half Day" },
                { color: "bg-purple-500",  label: "Holiday" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
