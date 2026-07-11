"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  AlertCircle,
  Save,
  CheckCircle2,
  Users,
  Eye,
  Printer,
  Download,
  ChevronDown,
  Clock,
  User,
  Briefcase
} from "lucide-react";
import { useTeacherAttendance } from "@/app/hooks/useTeacherAttendance";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useAppState } from "@/app/context/store";
import { PrintService } from "@/app/lib/print-service";

export default function TeacherAttendancePage() {
  const { academicYear } = useAppState();

  const { attendance, isLoading: loadingAttendance, error, fetchAttendance, saveAttendance } = useTeacherAttendance();
  const { teachers, fetchTeachers, isLoading: loadingTeachers } = useTeachers({ skip: true });

  // Filters
  const [filterYear, setFilterYear] = useState(academicYear || "2026");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, {
      status: string;
      note: string;
      check_in: string;
      check_out: string;
      working_hours: number;
      late_minutes: number;
    }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (!loadingAttendance && !loadingTeachers && isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [loadingAttendance, loadingTeachers]);

  // Bulk Selection State
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Fetch all active teachers on load
  useEffect(() => {
    fetchTeachers(); // skip: true means we fetch manually. It retrieves all active teachers.
  }, [fetchTeachers]);

  // Fetch existing attendance records
  useEffect(() => {
    if (filterDate && filterYear) {
      fetchAttendance({
        academic_year: filterYear,
        date: filterDate,
      });
    }
  }, [filterYear, filterDate, fetchAttendance]);

  // Sync internal state when teachers list or fetched records change
  useEffect(() => {
    const newRecords: Record<string, {
      status: string;
      note: string;
      check_in: string;
      check_out: string;
      working_hours: number;
      late_minutes: number;
    }> = {};
    
    // Set default registers values for all teachers
    teachers.forEach(t => {
      newRecords[t._id] = {
        status: "present",
        note: "",
        check_in: "09:00",
        check_out: "17:00",
        working_hours: 8,
        late_minutes: 0
      };
    });

    // Merge in existing records fetched from API
    if (attendance?.records) {
      attendance.records.forEach((r: any) => {
        const tId = typeof r.teacher_id === "object" && r.teacher_id ? r.teacher_id._id : r.teacher_id;
        if (tId) {
          newRecords[tId.toString()] = {
            status: r.status || "present",
            note: r.note || "",
            check_in: r.check_in || "09:00",
            check_out: r.check_out || "17:00",
            working_hours: r.working_hours ?? 8,
            late_minutes: r.late_minutes ?? 0,
          };
        }
      });
    }
    setAttendanceRecords(newRecords);
  }, [attendance, teachers]);

  const handleStatusChange = (teacherId: string, status: string) => {
    setAttendanceRecords(prev => {
      const copy = { ...prev };
      const current = copy[teacherId] || {
        status: "present",
        note: "",
        check_in: "09:00",
        check_out: "17:00",
        working_hours: 8,
        late_minutes: 0
      };
      
      let updatedCheckIn = current.check_in;
      let updatedCheckOut = current.check_out;
      let updatedWorking = current.working_hours;
      let updatedLate = current.late_minutes;

      if (status === "absent" || status === "leave") {
        updatedCheckIn = "";
        updatedCheckOut = "";
        updatedWorking = 0;
        updatedLate = 0;
      } else if (status === "present" && !updatedCheckIn) {
        updatedCheckIn = "09:00";
        updatedCheckOut = "17:00";
        updatedWorking = 8;
      }

      copy[teacherId] = {
        ...current,
        status,
        check_in: updatedCheckIn,
        check_out: updatedCheckOut,
        working_hours: updatedWorking,
        late_minutes: updatedLate
      };
      return copy;
    });
  };

  const handleFieldChange = (teacherId: string, field: string, value: any) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [teacherId]: {
        ...(prev[teacherId] || {
          status: "present",
          note: "",
          check_in: "09:00",
          check_out: "17:00",
          working_hours: 8,
          late_minutes: 0
        }),
        [field]: value
      }
    }));
  };

  const markAll = (status: string) => {
    const targetIds = selectedTeacherIds.length > 0 ? selectedTeacherIds : teachers.map(t => t._id);
    setAttendanceRecords(prev => {
      const copy = { ...prev };
      targetIds.forEach(id => {
        if (copy[id]) {
          copy[id].status = status;
          if (status === "absent" || status === "leave") {
            copy[id].check_in = "";
            copy[id].check_out = "";
            copy[id].working_hours = 0;
            copy[id].late_minutes = 0;
          } else {
            copy[id].check_in = "09:00";
            copy[id].check_out = "17:00";
            copy[id].working_hours = 8;
          }
        }
      });
      return copy;
    });
    setSelectedTeacherIds([]);
  };

  const handleSave = async () => {
    if (!filterDate || !filterYear) return;
    
    setSubmitting(true);
    setSuccessMsg("");
    
    const recordsToSave = Object.keys(attendanceRecords).map(teacher_id => ({
      teacher_id,
      status: attendanceRecords[teacher_id].status,
      note: attendanceRecords[teacher_id].note,
      check_in: attendanceRecords[teacher_id].check_in || null,
      check_out: attendanceRecords[teacher_id].check_out || null,
      working_hours: attendanceRecords[teacher_id].working_hours,
      late_minutes: attendanceRecords[teacher_id].late_minutes,
    }));

    const res = await saveAttendance({
      academic_year: filterYear,
      date: filterDate,
      records: recordsToSave,
    });

    setSubmitting(false);
    if (res.success) {
      setSuccessMsg("Staff register saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Row Selection logic
  const handleSelectTeacher = (id: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllTeachers = () => {
    const list = filteredTeachers.map(t => t._id);
    if (selectedTeacherIds.length === list.length) {
      setSelectedTeacherIds([]);
    } else {
      setSelectedTeacherIds(list);
    }
  };

  // Bulk CSV Export
  const handleBulkExport = () => {
    const targetTeachers = selectedTeacherIds.length > 0
      ? teachers.filter(t => selectedTeacherIds.includes(t._id))
      : teachers;

    let csv = "Employee ID,Staff Name,Designation,Department,Status,Check In,Check Out,Late Minutes,Working Hours,Note\n";
    targetTeachers.forEach(t => {
      const rec = attendanceRecords[t._id] || { status: "present", check_in: "", check_out: "", late_minutes: 0, working_hours: 0, note: "" };
      csv += `"${t.employee_id || "N/A"}","${t.name}","${t.designation || "Teacher"}","${t.department || "Academic"}","${rec.status}","${rec.check_in || ""}","${rec.check_out || ""}","${rec.late_minutes}","${rec.working_hours}","${rec.note || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `teacher_attendance_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Local filter logic
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchSearch = !searchQuery
        ? true
        : t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.employee_id || "").toLowerCase().includes(searchQuery.toLowerCase());

      const rec = attendanceRecords[t._id];
      const matchStatus = !statusFilter
        ? true
        : (rec?.status || "present") === statusFilter;

      const teacherDept = t.department || "Academic";
      const matchDept = !deptFilter
        ? true
        : teacherDept.toLowerCase() === deptFilter.toLowerCase();

      return matchSearch && matchStatus && matchDept;
    });
  }, [teachers, searchQuery, statusFilter, deptFilter, attendanceRecords]);

  // Extract unique departments for dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach(t => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set);
  }, [teachers]);

  // Attendance metrics summary
  const metrics = useMemo(() => {
    let total = teachers.length;
    let present = 0;
    let absent = 0;
    let leave = 0;
    let late = 0;
    let halfDay = 0;

    Object.values(attendanceRecords).forEach(r => {
      if (r.status === "present") present++;
      else if (r.status === "absent") absent++;
      else if (r.status === "leave") leave++;
      else if (r.status === "late") {
        late++;
        present++;
      } else if (r.status === "half_day") {
        halfDay++;
        present++;
      }
    });

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, leave, late, halfDay, percentage };
  }, [teachers, attendanceRecords]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header Panel */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Staff Attendance Board
          </h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span>Attendance</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Staff Attendance</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => PrintService.print("printable-area", { pageSize: "A4" })}
            className="btn btn-outline flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-555" />
            <span>Print register</span>
          </button>
          <button
            onClick={handleBulkExport}
            className="btn btn-outline flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-555" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{metrics.total}</h4>
          <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Total Staff</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-450 leading-none">{metrics.present}</h4>
          <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Present</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xl font-bold text-rose-600 dark:text-rose-450 leading-none">{metrics.absent}</h4>
          <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Absent</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xl font-bold text-amber-600 dark:text-amber-450 leading-none">{metrics.late}</h4>
          <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Late Count</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h4 className="text-xl font-bold text-indigo-650 dark:text-indigo-400 leading-none">{metrics.percentage}%</h4>
          <p className="text-[11.5px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Present Rate</p>
        </div>
      </div>

      {/* Standard Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex flex-col gap-4 text-left shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Session Year</label>
            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
              >
                <option value="2026">Session 2026</option>
                <option value="2027">Session 2027</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Attendance Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-1.8 bg-slate-50 dark:bg-slate-955 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
            />
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Department</label>
            <div className="relative">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Status filter</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-955 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Search Staff</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff name or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.8 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        className={`erp-table-wrap text-left relative transition-opacity duration-200 ${
          (loadingTeachers || loadingAttendance) && !isInitialLoad.current ? "opacity-60 pointer-events-none" : ""
        }`}
        id="printable-area"
      >
        {(loadingTeachers || loadingAttendance) && !isInitialLoad.current && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-border shadow-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Syncing...</span>
          </div>
        )}
        {(loadingTeachers || loadingAttendance) && isInitialLoad.current ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-bold">Compiling staff registers...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-rose-550 border border-rose-100 rounded-xl">
            <AlertCircle className="w-8 h-8" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Users className="w-12 h-12 opacity-20" />
            <p className="text-xs font-bold">No active teachers registered in the system.</p>
          </div>
        ) : (
          <div>
            {/* Header selection control */}
            <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-955/20 flex flex-wrap justify-between items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => markAll("present")}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                >
                  All Present
                </button>
                <button
                  onClick={() => markAll("absent")}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                >
                  All Absent
                </button>
                <button
                  onClick={() => markAll("leave")}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                >
                  All Leave
                </button>
              </div>
              <div className="text-[11px] font-extrabold text-slate-500">
                Matching Results Count: <span className="font-mono text-slate-850 dark:text-white text-xs">{filteredTeachers.length}</span>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="w-10 col-center">
                      <input
                        type="checkbox"
                        checked={filteredTeachers.length > 0 && selectedTeacherIds.length === filteredTeachers.length}
                        onChange={handleSelectAllTeachers}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                    </th>
                    <th className="w-28">Emp ID</th>
                    <th>Staff Profile</th>
                    <th className="w-44">Status</th>
                    <th className="w-24">In Time</th>
                    <th className="w-24">Out Time</th>
                    <th className="w-20 text-center">Late (Min)</th>
                    <th className="w-20 text-center">Hours</th>
                    <th>Remark Note</th>
                    <th className="w-16 col-center">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTeachers.map(teacher => {
                    const record = attendanceRecords[teacher._id] || {
                      status: "present",
                      note: "",
                      check_in: "09:00",
                      check_out: "17:00",
                      working_hours: 8,
                      late_minutes: 0
                    };
                    const isTimeDisabled = record.status === "absent" || record.status === "leave";

                    return (
                      <tr key={teacher._id}>
                        <td className="col-center">
                          <input
                            type="checkbox"
                            checked={selectedTeacherIds.includes(teacher._id)}
                            onChange={() => handleSelectTeacher(teacher._id)}
                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                          />
                        </td>
                        <td className="font-mono font-bold text-slate-500 dark:text-slate-400">
                          {teacher.employee_id || "-"}
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-[11px] overflow-hidden shrink-0 border border-border">
                              {teacher.photo_url ? (
                                <img src={teacher.photo_url} alt={teacher.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{teacher.name.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-850 dark:text-white">{teacher.name}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-400">
                                <span className="flex items-center gap-0.5">
                                  <Briefcase className="w-2.5 h-2.5" /> {teacher.designation || "Teacher"}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <User className="w-2.5 h-2.5" /> {teacher.department || "Academic"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            value={record.status}
                            onChange={(e) => handleStatusChange(teacher._id, e.target.value)}
                            disabled={submitting}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border cursor-pointer appearance-none bg-no-repeat bg-[right_8px_center] ${
                              record.status === "present"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : record.status === "absent"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : ["leave", "late", "half_day"].includes(record.status)
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-border"
                            }`}
                            style={{
                              backgroundImage:
                                'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22currentColor%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                              backgroundSize: "8px",
                            }}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="leave">Leave</option>
                            <option value="late">Late</option>
                            <option value="half_day">Half Day</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="time"
                            value={record.check_in || ""}
                            disabled={isTimeDisabled || submitting}
                            onChange={(e) => handleFieldChange(teacher._id, "check_in", e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-955 border border-border rounded-lg outline-none text-xs font-semibold focus:border-primary disabled:opacity-50"
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            value={record.check_out || ""}
                            disabled={isTimeDisabled || submitting}
                            onChange={(e) => handleFieldChange(teacher._id, "check_out", e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-955 border border-border rounded-lg outline-none text-xs font-semibold focus:border-primary disabled:opacity-50"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={record.late_minutes}
                            disabled={isTimeDisabled || submitting}
                            onChange={(e) => handleFieldChange(teacher._id, "late_minutes", Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-955 border border-border rounded-lg outline-none text-xs font-semibold text-center focus:border-primary disabled:opacity-50 font-mono"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.5"
                            value={record.working_hours}
                            disabled={isTimeDisabled || submitting}
                            onChange={(e) => handleFieldChange(teacher._id, "working_hours", Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-955 border border-border rounded-lg outline-none text-xs font-semibold text-center focus:border-primary disabled:opacity-50 font-mono"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Add note..."
                            value={record.note}
                            onChange={(e) => handleFieldChange(teacher._id, "note", e.target.value)}
                            disabled={submitting}
                            className="w-full px-2.5 py-1 border border-transparent hover:border-border focus:border-primary rounded-lg text-xs outline-none bg-transparent focus:bg-white dark:focus:bg-slate-955 transition-all"
                          />
                        </td>
                        <td className="col-center">
                          <Link
                            href={`/attendance/teacher/${teacher._id}`}
                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions footer bar */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-955/20">
              <div>
                {successMsg && (
                  <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {successMsg}
                  </span>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Staff Attendance</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Operations bar */}
      {selectedTeacherIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 z-50 animate-bounce-short font-sans text-xs">
          <div>
            <span className="font-black text-emerald-450">{selectedTeacherIds.length}</span> staff selected
          </div>
          <div className="w-px h-6 bg-slate-700" />
          <div className="flex gap-2">
            <button
              onClick={() => markAll("present")}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Mark Present
            </button>
            <button
              onClick={() => markAll("absent")}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Mark Absent
            </button>
            <button
              onClick={() => markAll("leave")}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Mark Leave
            </button>
            <button
              onClick={handleBulkExport}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-750"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => setSelectedTeacherIds([])}
              className="px-3 py-2 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
