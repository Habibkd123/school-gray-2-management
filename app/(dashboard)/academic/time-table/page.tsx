"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSchedules } from "../../../hooks/useSchedules";
import { useClasses } from "../../../hooks/useClasses";
import { useTeachers } from "../../../hooks/useTeachers";
import { useSubjects } from "../../../hooks/useSubjects";
import { useRooms } from "../../../hooks/useRooms";
import {
  Plus, Search, List, Grid, MoreVertical, Edit, Trash2,
  Calendar, Filter, ChevronDown, RefreshCw, Printer, Download, Trash, FileText, Clock, Loader2
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const pastelColors = [
  "bg-rose-50 dark:bg-slate-800", "bg-blue-50 dark:bg-slate-800", "bg-green-50 dark:bg-slate-800", "bg-yellow-50 dark:bg-slate-800", "bg-purple-50 dark:bg-slate-800", "bg-orange-50 dark:bg-slate-800"
];

function parseTimeToMinutes(t: string): number {
  const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let [, h, m, period] = match;
  let hours = parseInt(h, 10);
  const mins = parseInt(m, 10);
  if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

export default function TimeTablePage() {
  const { classes, isLoading: classesLoading } = useClasses();
  const { teachers, isLoading: teachersLoading } = useTeachers();
  const { schedules, isLoading: schedulesLoading, createSchedule } = useSchedules();
  const { rooms, loading: roomsLoading } = useRooms();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  // Form states
  const [formClassId, setFormClassId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formDay, setFormDay] = useState("Monday");
  const [formStartTime, setFormStartTime] = useState("09:00 AM");
  const [formEndTime, setFormEndTime] = useState("09:45 AM");
  const [formRoom, setFormRoom] = useState("");

  const { subjects } = useSubjects(formClassId);

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (classes.length > 0 && !formClassId) {
      setFormClassId(classes[0]._id);
    }
  }, [classes, formClassId]);

  useEffect(() => {
    if (subjects.length > 0) {
      setFormSubject(subjects[0].name);
    } else {
      setFormSubject("");
    }
  }, [subjects]);

  useEffect(() => {
    if (teachers.length > 0 && !formTeacherId) {
      setFormTeacherId(teachers[0]._id);
    }
  }, [teachers, formTeacherId]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoom) {
      alert("Please select a classroom.");
      return;
    }
    if (isRoomOccupied) {
      alert(`Room ${formRoom} is already occupied on ${formDay} at this time.`);
      return;
    }
    const res = await createSchedule({
      classId: formClassId,
      subject: formSubject,
      teacherId: formTeacherId,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: formRoom
    });
    if (res.success) {
      setFormSubject("");
      setIsAddOpen(false);
    } else {
      alert(res.message || "Failed to add time table entry");
    }
  };

  const getSubjectName = (s: any) => {
    if (typeof s === "object" && s !== null) return s.name;
    return s || "N/A";
  };

  const getTeacherName = (t: any) => {
    if (typeof t === "object" && t !== null) return t.name;
    return t || "N/A";
  };

  // Filter schedules by selected class
  const classSchedules = schedules.filter((s) => {
    const cId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
    return cId === selectedClassId;
  });

  // Map database routines to time table format
  const timeTableData = classSchedules.map((s, index) => {
    const sName = getSubjectName(s.subject_id);
    const tName = getTeacherName(s.teacher_id);
    const tId = typeof s.teacher_id === "object" && s.teacher_id !== null ? s.teacher_id._id : s.teacher_id;
    const tPhoto = typeof s.teacher_id === "object" && s.teacher_id !== null ? s.teacher_id.photo_url : undefined;

    return {
      day: s.day.charAt(0).toUpperCase() + s.day.slice(1),
      time: `${s.start_time} - ${s.end_time}`,
      subject: sName,
      teacher: tName,
      teacherId: tId,
      img: tPhoto || `https://i.pravatar.cc/150?u=${index}`,
      colorIndex: index % 6
    };
  });

  // Check if classroom is occupied at selected time/day
  const isRoomOccupied = React.useMemo(() => {
    if (!formRoom.trim()) return false;
    const newStart = parseTimeToMinutes(formStartTime);
    const newEnd = parseTimeToMinutes(formEndTime);

    return schedules.some((s) => {
      if (!s.room || s.room.trim().toLowerCase() !== formRoom.trim().toLowerCase()) return false;
      if (s.day.toLowerCase() !== formDay.toLowerCase()) return false;

      const eStart = parseTimeToMinutes(s.start_time);
      const eEnd = parseTimeToMinutes(s.end_time);

      return newStart < eEnd && newEnd > eStart;
    });
  }, [formRoom, formDay, formStartTime, formEndTime, schedules]);

  const isLoading = classesLoading || teachersLoading || schedulesLoading || roomsLoading;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Time Table</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/academic" className="hover:text-[#F59E0B]">Academic</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Time Table</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-border rounded-xl px-3.5 py-2 text-[13px] shadow-sm">
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wider">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white outline-none cursor-pointer font-bold"
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.name} - {c.section}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Time Table
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left p-6">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
            <span>Fetching time table data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-full sm:w-[1000px]">
              {/* Headers */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4 border-b border-border pb-3">
                {days.map(day => (
                  <div key={day} className="font-bold text-[14px] text-[#0F172A] dark:text-slate-100 pl-2">{day}</div>
                ))}
              </div>

              {/* Time Table Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {days.map(day => (
                  <div key={day} className="space-y-4">
                    {timeTableData.filter(d => d.day === day).length === 0 ? (
                      <div
                        onClick={() => {
                          setFormDay(day);
                          setIsAddOpen(true);
                        }}
                        className="p-4 text-center text-[12px] text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <Plus className="w-4 h-4 mx-auto mb-1 opacity-50 group-hover:opacity-100 group-hover:text-[#F59E0B] transition-colors" />
                        <span className="group-hover:text-[#F59E0B] transition-colors">Add period</span>
                      </div>
                    ) : (
                      timeTableData.filter(d => d.day === day).map((item, index) => (
                        <div key={index} className={`p-4 rounded-xl ${pastelColors[item.colorIndex]} border border-white/50 dark:border-slate-700/50 shadow-sm transition-all hover:shadow-md`}>
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[12px] font-medium mb-2">
                            <Clock className="w-3.5 h-3.5" />
                            {item.time}
                          </div>
                          <div className="text-[13px] font-bold text-[#0F172A] dark:text-slate-100 mb-4">
                            Subject: {item.subject}
                          </div>
                          <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-2 flex items-center gap-3 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                            <Link href={`/teachers?search=${encodeURIComponent(item.teacher)}`} className="flex items-center gap-3 w-full">
                              <img src={item.img} alt={item.teacher} className="w-8 h-8 rounded-full object-cover border border-white dark:border-slate-700 shadow-sm" />
                              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 hover:text-[#F59E0B] transition-colors">{item.teacher}</span>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Time Table Modal */}
      {isAddOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm" onClick={() => setIsAddOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-full sm:w-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-[70] overflow-hidden text-left flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between p-6 border-b border-border bg-white dark:bg-slate-900">
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100">Add Time Table Entry</h2>
              <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
                <div className="relative">
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                    required
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {c.name} - {c.section}
                      </option>
                    ))}
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
                    className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                    required
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s._id} value={s.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {s.name}
                      </option>
                    ))}
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
                    className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                    required
                  >
                    {teachers.map(t => (
                      <option key={t._id} value={t._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Day</label>
                <div className="relative">
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                    required
                  >
                    {days.map(d => (
                      <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Start Time</label>
                  <TimePicker value={formStartTime} onChange={setFormStartTime} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">End Time</label>
                  <TimePicker value={formEndTime} onChange={setFormEndTime} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Room</label>
                <div className="relative">
                  {rooms.filter(r => r.is_active).length > 0 ? (
                    <select
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className={`w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer ${
                        isRoomOccupied ? "border-red-500 focus:border-red-500" : "border-border"
                      }`}
                      required
                    >
                      <option value="">Select Classroom</option>
                      {rooms.filter(r => r.is_active).map(r => (
                        <option key={r._id} value={r.room_no}>
                          Room {r.room_no} {r.capacity ? `(Cap: ${r.capacity})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-4 py-2.5 text-[13px] bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-slate-400 dark:text-slate-500 italic">
                      No classrooms found — add rooms in Classroom Management first
                    </div>
                  )}
                  {rooms.filter(r => r.is_active).length > 0 && (
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                {isRoomOccupied && (
                  <p className="text-[12px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                    ⚠️ Room {formRoom} is not available (occupied by another class at this time).
                  </p>
                )}
                {formRoom.trim() && !isRoomOccupied && (
                  <p className="text-[12px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                    ✓ Room {formRoom} is available.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#F59E0B] text-white text-[14px] font-bold rounded-lg hover:bg-[#D97706] transition-colors shadow-sm cursor-pointer"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
}

function TimePicker({ value, onChange }: TimePickerProps) {
  // Expected value format: "09:30 AM" or "10:45 AM"
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let currentHour = "09";
  let currentMinute = "00";
  let currentPeriod = "AM";
  if (match) {
    let [, h, m, p] = match;
    if (h.length === 1) h = `0${h}`;
    currentHour = h;
    currentMinute = m;
    currentPeriod = p.toUpperCase();
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const periods = ["AM", "PM"];

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${currentMinute} ${currentPeriod}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute} ${currentPeriod}`);
  };

  const handlePeriodChange = (newPeriod: string) => {
    onChange(`${currentHour}:${currentMinute} ${newPeriod}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <select
          value={currentHour}
          onChange={(e) => handleHourChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 font-mono cursor-pointer"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <span className="text-slate-400 font-bold">:</span>

      <div className="relative flex-1">
        <select
          value={currentMinute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 font-mono cursor-pointer"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <div className="relative w-[75px]">
        <select
          value={currentPeriod}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="w-full pl-3 pr-7 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
