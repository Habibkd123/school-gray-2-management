"use client";

import React, { useState } from "react";
import { useStudentAuth } from "../../context/studentAuth";
import { useSchedules } from "../../../hooks/useSchedules";
import { CalendarDays, Clock, MapPin } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday",
};
const DAY_COLORS: Record<string, string> = {
  monday: "#6366f1", tuesday: "var(--primary)", wednesday: "#10b981",
  thursday: "#f43f5e", friday: "#8b5cf6", saturday: "#0ea5e9",
};

export default function StudentRoutinePage() {
  const { studentProfile } = useStudentAuth();
  const classId =
    studentProfile?.class_id && typeof studentProfile.class_id === "object"
      ? studentProfile.class_id._id
      : (studentProfile?.class_id as string);

  const { schedules, isLoading } = useSchedules(classId);
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const [selectedDay, setSelectedDay] = useState(todayName);

  const daySchedules = schedules
    .filter((s) => s.day === selectedDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Routine</h1>
        <p className="card-subtitle text-[13px] mt-1">Your weekly class schedule</p>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              selectedDay === day
                ? "text-white shadow-lg"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            style={
              selectedDay === day
                ? {
                    background: `linear-gradient(135deg, ${DAY_COLORS[day]}, ${DAY_COLORS[day]}cc)`,
                    boxShadow: `0 4px 15px ${DAY_COLORS[day]}40`,
                  }
                : {}
            }
          >
            {DAY_LABELS[day]}
            {day === todayName && (
              <span className={`ml-1.5 text-[10px] ${selectedDay === day ? "text-white/80" : "text-indigo-500"}`}>
                (Today)
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-[13px]">Loading schedule...</div>
        ) : daySchedules.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">
              No classes on {DAY_LABELS[selectedDay]}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {daySchedules.map((cls, idx) => {
              const subject = typeof cls.subject_id === "object" ? cls.subject_id.name : String(cls.subject_id);
              const teacher = typeof cls.teacher_id === "object" ? cls.teacher_id : null;
              const color = DAY_COLORS[selectedDay] || "#6366f1";

              return (
                <div
                  key={cls._id}
                  className="flex items-center gap-4 p-5 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  {/* Time */}
                  <div className="text-center flex-shrink-0 w-20">
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">{cls.start_time}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cls.end_time}</p>
                  </div>

                  {/* Divider */}
                  <div className="w-1 h-14 rounded-full flex-shrink-0" style={{ background: color }} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white">{subject}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {teacher && (
                        <span className="text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {teacher.name.charAt(0)}
                          </span>
                          {teacher.name}
                        </span>
                      )}
                      {cls.room && (
                        <span className="text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Room {cls.room}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Period number */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ background: `${color}15`, color }}
                  >
                    {idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
