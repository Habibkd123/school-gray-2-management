"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, AlertCircle, Save, Calendar, CheckCircle2, Users } from "lucide-react";
import { useTeacherAttendance } from "@/app/hooks/useTeacherAttendance";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useAppState } from "@/app/context/store";

export default function TeacherAttendancePage() {
  const { academicYear } = useAppState();

  const { attendance, isLoading: loadingAttendance, error, fetchAttendance, saveAttendance } = useTeacherAttendance();
  const { teachers, fetchTeachers, isLoading: loadingTeachers } = useTeachers();

  // Filters
  const [filterYear, setFilterYear] = useState(academicYear);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: string; note: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Fetch existing attendance
  useEffect(() => {
    if (filterDate && filterYear) {
      fetchAttendance({
        academic_year: filterYear,
        date: filterDate,
      });
    }
  }, [filterYear, filterDate, fetchAttendance]);

  // Sync state when attendance changes
  useEffect(() => {
    const newRecords: Record<string, { status: string; note: string }> = {};
    if (attendance?.records) {
      attendance.records.forEach(r => {
        if (r.teacher_id?._id) {
          newRecords[r.teacher_id._id] = { status: r.status, note: r.note || "" };
        }
      });
    } else {
      // Default all to Present
      teachers.forEach(t => {
        newRecords[t._id] = { status: "present", note: "" };
      });
    }
    setAttendanceRecords(newRecords);
  }, [attendance, teachers]);

  const handleStatusChange = (teacherId: string, status: string) => {
    setAttendanceRecords(prev => ({ ...prev, [teacherId]: { ...prev[teacherId], status } }));
  };

  const handleNoteChange = (teacherId: string, note: string) => {
    setAttendanceRecords(prev => ({ ...prev, [teacherId]: { ...prev[teacherId], note } }));
  };

  const markAll = (status: string) => {
    const newRecords = { ...attendanceRecords };
    teachers.forEach(t => {
      if (newRecords[t._id]) newRecords[t._id].status = status;
    });
    setAttendanceRecords(newRecords);
  };

  const handleSave = async () => {
    if (!filterDate || !filterYear) return;
    
    setSubmitting(true);
    setSuccessMsg("");
    
    const recordsToSave = Object.keys(attendanceRecords).map(teacher_id => ({
      teacher_id,
      status: attendanceRecords[teacher_id].status,
      note: attendanceRecords[teacher_id].note,
    }));

    const res = await saveAttendance({
      academic_year: filterYear,
      date: filterDate,
      records: recordsToSave,
    });

    setSubmitting(false);
    if (res.success) {
      setSuccessMsg("Attendance saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.employee_id?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Attendance</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Attendance</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Teacher</span>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
        {loadingTeachers || loadingAttendance ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-[14px] font-medium">Loading records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-8 h-8" />
            <p className="text-[14px] font-medium">{error}</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Users className="w-12 h-12 opacity-20" />
            <p className="text-[14px] font-medium">No teachers found in the system.</p>
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
                <input type="text" placeholder="Search teacher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-white dark:bg-slate-900" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-24">Emp ID</th>
                    <th className="px-4 py-3 font-semibold">Teacher Name</th>
                    <th className="px-4 py-3 font-semibold w-48">Status</th>
                    <th className="px-4 py-3 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTeachers.map(teacher => (
                    <tr key={teacher._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-mono text-slate-500">{teacher.employee_id || "-"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{teacher.name}</td>
                      <td className="px-4 py-3">
                        <select
                          value={attendanceRecords[teacher._id]?.status || "present"}
                          onChange={(e) => handleStatusChange(teacher._id, e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold outline-none border-0 appearance-none bg-no-repeat bg-[right_10px_center] ${
                            attendanceRecords[teacher._id]?.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                            attendanceRecords[teacher._id]?.status === 'absent' ? 'bg-red-100 text-red-700' :
                            attendanceRecords[teacher._id]?.status === 'leave' ? 'bg-amber-100 text-amber-700' :
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
                          value={attendanceRecords[teacher._id]?.note || ""}
                          onChange={(e) => handleNoteChange(teacher._id, e.target.value)}
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
