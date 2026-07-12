"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, GraduationCap, Calendar, Loader2,
  User, AlertCircle, RefreshCw, Layers, ShieldCheck, Mail, Phone,
  Clock, History, CheckCircle, Info
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface TeacherDetail {
  _id: string;
  name: string;
  employee_id?: string;
  phone?: string;
  email?: string;
  designation?: string;
  photo_url?: string;
  user_id?: {
    is_active: boolean;
    email?: string;
  };
}

interface ClassSubjectAssignment {
  _id: string;
  class_id: {
    _id: string;
    name: string;
    section?: string;
  };
  stream_id?: {
    _id: string;
    name: string;
  };
  section_id?: {
    _id: string;
    name: string;
  };
  subject_master_id: {
    _id: string;
    name: string;
    subject_code?: string;
  };
  assignment_type: string;
  status: string;
  remarks?: string;
  weekly_periods?: number;
  created_by?: {
    _id: string;
    name: string;
  };
  updated_by?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  history?: Array<{
    action: string;
    changes?: string;
    updated_by?: any;
    date: string;
    remarks?: string;
  }>;
}

interface TimetableEntry {
  _id: string;
  class_id: {
    name: string;
    section: string;
  };
  subject_id: {
    name: string;
  };
  day: string;
  start_time: string;
  end_time: string;
  room?: string;
}

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function TeacherAssignmentDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const teacherId = searchParams.get("teacherId") || "";
  const year = searchParams.get("year") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);

  const fetchData = async () => {
    if (!teacherId || !year) {
      setError("Teacher ID and Academic Year are required parameters.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch Teacher Details
      const teacherRes = await fetch(`/api/teachers/${teacherId}`, { headers: getAuthHeaders() });
      const teacherData = await teacherRes.json();
      if (!teacherRes.ok || !teacherData.success) {
        throw new Error(teacherData.message || "Failed to fetch teacher profile.");
      }

      // Fetch Teacher Assignments
      const assignRes = await fetch(
        `/api/teacher-assignment?teacher_id=${teacherId}&academic_year=${year}&limit=200`,
        { headers: getAuthHeaders() }
      );
      const assignData = await assignRes.json();
      if (!assignRes.ok || !assignData.success) {
        throw new Error(assignData.message || "Failed to fetch teacher assignments.");
      }

      // Fetch Timetable/Schedules
      const scheduleRes = await fetch(
        `/api/schedules?teacherId=${teacherId}`,
        { headers: getAuthHeaders() }
      );
      const scheduleData = await scheduleRes.json();
      if (!scheduleRes.ok || !scheduleData.success) {
        throw new Error(scheduleData.message || "Failed to fetch teacher schedules.");
      }

      setTeacher(teacherData.data);
      setAssignments(assignData.data.assignments || []);
      setTimetable(scheduleData.data || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teacherId, year]);

  const stats = useMemo(() => {
    const classIds = new Set(assignments.map((a) => a.class_id?._id).filter(Boolean));
    const totalPeriods = assignments.reduce((sum, a) => sum + (a.weekly_periods || 0), 0);
    return {
      classesCount: classIds.size,
      periodsCount: totalPeriods
    };
  }, [assignments]);

  const auditHistory = useMemo(() => {
    const list: any[] = [];
    assignments.forEach(assign => {
      if (assign.history && Array.isArray(assign.history)) {
        assign.history.forEach(h => {
          list.push({
            ...h,
            subjectName: assign.subject_master_id?.name || "No Subject",
            className: assign.class_id?.name || "No Class",
            sectionName: assign.class_id?.section || "",
            createdByName: assign.created_by?.name || "Administrator"
          });
        });
      }
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assignments]);

  // Timetable grouped by day for easy visual layout
  const timetableByDay = useMemo(() => {
    const map: Record<string, TimetableEntry[]> = {};
    DAYS_OF_WEEK.forEach(day => { map[day] = []; });
    timetable.forEach(entry => {
      const day = (entry.day || "").toLowerCase();
      if (map[day]) map[day].push(entry);
    });
    // Sort each day's entries by time
    DAYS_OF_WEEK.forEach(day => {
      map[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return map;
  }, [timetable]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 text-slate-400 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading teacher workload mapping details...</p>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-slate-400 min-h-screen">
        <AlertCircle className="w-12 h-12 text-rose-500 opacity-80" />
        <p className="font-semibold text-[15px] text-slate-800 dark:text-slate-200">
          {error || "Teacher profile not found."}
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm bg-white dark:bg-slate-900 border border-border rounded-lg hover:bg-slate-50 font-bold transition-colors cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const teacherEmail = teacher.email || teacher.user_id?.email || "—";
  const teacherStatus = teacher.user_id?.is_active ?? true;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white dark:bg-slate-900 border border-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-350" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Faculty Assignment & Workload
            </h1>
            <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1.5">
              <Link href="/academic" className="hover:text-primary transition-colors">
                Academic
              </Link>
              <span>/</span>
              <Link
                href="/academic-mgmt/teacher-assignment"
                className="hover:text-primary transition-colors"
              >
                Teacher Assignment
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {teacher.name}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-left">
        {/* Left Card: Teacher Details Profile */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden p-5 space-y-5">
          <div className="flex items-center gap-3.5">
            <img
              src={teacher.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=d68600&color=fff&bold=true`}
              className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-800"
              alt={teacher.name}
            />
            <div>
              <h2 className="font-bold text-[17px] text-slate-900 dark:text-white leading-tight">
                {teacher.name}
              </h2>
              <p className="text-[12px] font-semibold text-slate-400 mt-1">
                {teacher.designation || "Faculty Member"}
              </p>
              <p className="text-[11px] font-sans text-slate-450 mt-0.5">
                Emp ID: {teacher.employee_id || "—"}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3.5 text-[13px] font-semibold">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Academic Year</span>
              <span className="text-slate-800 dark:text-slate-200 font-sans">
                {year}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Status</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${teacherStatus
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                  }`}
              >
                {teacherStatus ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> Email</span>
              <span className="text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={teacherEmail}>
                {teacherEmail}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> Phone</span>
              <span className="text-slate-800 dark:text-slate-200 font-sans">
                {teacher.phone || "—"}
              </span>
            </div>

            <div className="border-t border-border/60 pt-3.5">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">Workload Summary</p>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 border border-border/80 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold text-slate-450 dark:text-slate-400 block uppercase">Classes</span>
                  <span className="text-lg font-black text-slate-800 dark:text-white">{stats.classesCount}</span>
                </div>
                <div className="p-2 border border-border/80 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold text-slate-450 dark:text-slate-400 block uppercase">Periods/Wk</span>
                  <span className={`text-lg font-black block ${stats.periodsCount >= 40 ? "text-rose-600 dark:text-rose-400" :
                      stats.periodsCount >= 30 ? "text-amber-600 dark:text-amber-400" :
                        "text-emerald-600 dark:text-emerald-400"
                    }`}>{stats.periodsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Assignments Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
            <div className="p-4 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40">
              <h3 className="font-bold text-[14px] text-slate-850 dark:text-slate-200">
                Assigned Subject Matrix
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="erp-table text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-[#FAFBFD] dark:bg-slate-900/50 text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Class & Section</th>
                    <th className="px-5 py-3.5">Subject</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Weekly Periods</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-450 font-bold italic">
                        No active subjects or class assignments found for this academic year.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assign) => (
                      <tr
                        key={assign._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors font-medium text-slate-700 dark:text-slate-350"
                      >
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                            {assign.class_id?.name}
                            {assign.class_id?.section ? ` - ${assign.class_id.section}` : ""}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-850 dark:text-slate-100">{assign.subject_master_id?.name}</span>
                            {assign.subject_master_id?.subject_code && (
                              <span className="font-sans text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-550 px-1.5 py-0.5 rounded font-bold">
                                {assign.subject_master_id.subject_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${assign.assignment_type === "Class Teacher" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                              "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
                            }`}>
                            {assign.assignment_type || "Subject Teacher"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-850 dark:text-slate-200">
                          {assign.weekly_periods || 0} periods/wk
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${assign.status === "Active" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-rose-50 text-rose-600"
                            }`}>
                            {assign.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Current Weekly Timetable */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
            <div className="p-4 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40 flex items-center justify-between">
              <h3 className="font-bold text-[14px] text-slate-850 dark:text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Current Timetable Schedule
              </h3>
              <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {timetable.length} Classes Weekly
              </span>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {DAYS_OF_WEEK.map((day) => {
                  const dayEntries = timetableByDay[day] || [];
                  return (
                    <div key={day} className="border border-border rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-800/10 text-left">
                      <p className="text-[12px] font-bold text-primary uppercase tracking-wider border-b border-border/80 pb-1.5 mb-2.5">
                        {day}
                      </p>

                      {dayEntries.length === 0 ? (
                        <p className="text-slate-400 text-xs italic py-4">No scheduled periods.</p>
                      ) : (
                        <div className="space-y-2">
                          {dayEntries.map((slot) => (
                            <div key={slot._id} className="p-2 border border-border bg-white dark:bg-slate-900 rounded-lg text-left shadow-sm">
                              <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {slot.subject_id?.name}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-450 dark:text-slate-400 mt-0.5">
                                Class: {slot.class_id?.name} - {slot.class_id?.section}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans mt-2 pt-1.5 border-t border-border/40">
                                <span>{slot.start_time} - {slot.end_time}</span>
                                {slot.room && <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-bold">R: {slot.room}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
            <div className="p-4 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40">
              <h3 className="font-bold text-[14px] text-slate-850 dark:text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Assignment History & Audit Trail
              </h3>
            </div>

            <div className="p-5">
              <div className="space-y-5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                {auditHistory.map((historyItem, idx) => (
                  <div key={idx} className="relative pl-7 text-left flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    {/* Bullet marker */}
                    <div className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ${historyItem.action === "Create" ? "bg-emerald-500" :
                        historyItem.action === "Soft Delete" ? "bg-rose-500" : "bg-amber-500"
                      }`} />

                    <div className="space-y-1">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                        <span className={`px-1.5 py-0.25 text-[10px] rounded font-bold mr-1.5 ${historyItem.action === "Create" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" :
                            historyItem.action === "Soft Delete" ? "bg-rose-50 text-rose-600 dark:bg-rose-955/20" : "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                          }`}>{historyItem.action}</span>
                        Subject: <span className="text-primary">{historyItem.subjectName}</span> ({historyItem.className} {historyItem.sectionName ? ` - ${historyItem.sectionName}` : ""})
                      </p>
                      {historyItem.changes && (
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                          Changes: {historyItem.changes}
                        </p>
                      )}
                      {historyItem.remarks && (
                        <div className="flex items-start gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/50 border border-border rounded text-[11px] text-slate-550 mt-1.5 font-medium max-w-lg">
                          <Info className="w-3.5 h-3.5 shrink-0 text-slate-450 mt-0.5" />
                          <span>Comments: {historyItem.remarks}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-slate-405 font-sans">
                        {new Date(historyItem.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                      <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                        By: {historyItem.createdByName}
                      </p>
                    </div>
                  </div>
                ))}

                {auditHistory.length === 0 && (
                  <p className="text-slate-450 italic text-sm text-center">No assignment change history recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
