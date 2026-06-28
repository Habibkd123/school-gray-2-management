"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Loader2, AlertCircle, Save, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useStudentAttendance, StudentAttendanceRecord } from "@/app/hooks/useStudentAttendance";
import { useClasses } from "@/app/hooks/useClasses";
import { useStreams } from "@/app/hooks/useStreams";
import { useSections } from "@/app/hooks/useSections";
import { useStudents } from "@/app/hooks/useStudents";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAppState } from "@/app/context/store";

export default function StudentAttendancePage() {
  const { academicYear } = useAppState();
  const { enableStreams, enableSections } = useAcademicConfig();

  const { attendance, isLoading: loadingAttendance, error, fetchAttendance, saveAttendance } = useStudentAttendance();
  const { classes } = useClasses({ filterByYear: true });
  const { streams } = useStreams({ skip: !enableStreams });
  const { sections } = useSections({ skip: !enableSections });
  const { students, fetchStudents, isLoading: loadingStudents } = useStudents();

  // Filters
  const [filterYear, setFilterYear] = useState(academicYear);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStreamId, setFilterStreamId] = useState("");
  const [filterSectionId, setFilterSectionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: string; note: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Auto-fetch students when filters change
  useEffect(() => {
    if (filterClassId) {
      fetchStudents({
        classId: filterClassId,
        streamId: filterStreamId || undefined,
        sectionId: filterSectionId || undefined,
        limit: 500,
      });
    }
  }, [filterClassId, filterStreamId, filterSectionId, fetchStudents]);

  // Fetch existing attendance
  useEffect(() => {
    if (filterClassId && filterDate && filterYear) {
      fetchAttendance({
        academic_year: filterYear,
        date: filterDate,
        classId: filterClassId,
        streamId: filterStreamId || undefined,
        sectionId: filterSectionId || undefined,
      });
    }
  }, [filterYear, filterDate, filterClassId, filterStreamId, filterSectionId, fetchAttendance]);

  // Sync state when attendance changes
  useEffect(() => {
    const newRecords: Record<string, { status: string; note: string }> = {};
    if (attendance?.records) {
      attendance.records.forEach(r => {
        if (r.student_id?._id) {
          newRecords[r.student_id._id] = { status: r.status, note: r.note || "" };
        }
      });
    } else {
      // Default all to Present
      students.forEach(s => {
        newRecords[s._id] = { status: "present", note: "" };
      });
    }
    setAttendanceRecords(newRecords);
  }, [attendance, students]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
  };

  const markAll = (status: string) => {
    const newRecords = { ...attendanceRecords };
    students.forEach(s => {
      if (newRecords[s._id]) newRecords[s._id].status = status;
    });
    setAttendanceRecords(newRecords);
  };

  const handleSave = async () => {
    if (!filterClassId || !filterDate || !filterYear) return;
    
    setSubmitting(true);
    setSuccessMsg("");
    
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
      sectionId: filterSectionId || undefined,
      records: recordsToSave,
    });

    setSubmitting(false);
    if (res.success) {
      setSuccessMsg("Attendance saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Attendance</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Attendance</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Student</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Date</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900 font-medium" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Class</label>
            <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900 font-medium">
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
            </select>
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Stream</label>
              <select value={filterStreamId} onChange={(e) => setFilterStreamId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900 font-medium">
                <option value="">All Streams</option>
                {streams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {enableSections && (
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Section</label>
              <select value={filterSectionId} onChange={(e) => setFilterSectionId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900 font-medium">
                <option value="">All Sections</option>
                {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
        {loadingStudents || loadingAttendance ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-[14px] font-medium">Loading records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-8 h-8" />
            <p className="text-[14px] font-medium">{error}</p>
          </div>
        ) : !filterClassId ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Calendar className="w-12 h-12 opacity-20" />
            <p className="text-[14px] font-medium">Select a Class to mark attendance</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <p className="text-[14px] font-medium">No students found for this selection.</p>
          </div>
        ) : (
          <div>
            <div className="p-4 border-b border-border bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-2">
                <button onClick={() => markAll("present")} className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded">Mark All Present</button>
                <button onClick={() => markAll("absent")} className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 rounded">Mark All Absent</button>
                <button onClick={() => markAll("leave")} className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded">Mark All Leave</button>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                <input type="text" placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-20">Roll No</th>
                    <th className="px-4 py-3 font-semibold">Student Name</th>
                    <th className="px-4 py-3 font-semibold w-48">Status</th>
                    <th className="px-4 py-3 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map(student => (
                    <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-mono text-slate-500">{student.roll_no || "-"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{student.name}</td>
                      <td className="px-4 py-3">
                        <select
                          value={attendanceRecords[student._id]?.status || "present"}
                          onChange={(e) => handleStatusChange(student._id, e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold outline-none border-0 appearance-none bg-no-repeat bg-[right_10px_center] ${
                            attendanceRecords[student._id]?.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                            attendanceRecords[student._id]?.status === 'absent' ? 'bg-red-100 text-red-700' :
                            attendanceRecords[student._id]?.status === 'leave' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}
                          style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22currentColor%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundSize: '8px' }}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="leave">Leave</option>
                          <option value="late">Late</option>
                          <option value="half_day">Half Day</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" placeholder="Add note..."
                          value={attendanceRecords[student._id]?.note || ""}
                          onChange={(e) => handleNoteChange(student._id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-transparent hover:border-border focus:border-primary rounded text-[13px] outline-none bg-transparent focus:bg-white dark:focus:bg-slate-900 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between">
              <div>
                {successMsg && <span className="text-emerald-500 text-[13px] font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {successMsg}</span>}
              </div>
              <button onClick={handleSave} disabled={submitting}
                className="px-6 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[14px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Attendance
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
