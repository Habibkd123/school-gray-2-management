"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2, Save
} from "lucide-react";
import { useStudents } from "../../../hooks/useStudents";
import { useClasses } from "../../../hooks/useClasses";
import { useAttendance } from "../../../hooks/useAttendance";
import { useAttendanceSummary } from "../../../hooks/useAttendanceSummary";
import { useAuth } from "../../../context/auth";

type AttendanceStatus = "present" | "late" | "absent" | "holiday" | "half_day";

interface LocalRecord {
  studentId: string;
  status: AttendanceStatus;
  notes: string;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "holiday", label: "Holiday" },
  { value: "half_day", label: "Half Day" },
];

const statusDot: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500",
  late: "bg-amber-500",
  absent: "bg-rose-500",
  holiday: "bg-blue-500",
  half_day: "bg-purple-500",
};

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const { students, isLoading: studentsLoading } = useStudents();
  const { classes } = useClasses();
  const { saveAttendance, isLoading: saving } = useAttendance();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("Today");
  const [localRecords, setLocalRecords] = useState<Record<string, LocalRecord>>({});

  const { fetchSummary, isLoading: summaryLoading } = useAttendanceSummary();
  const [summaryData, setSummaryData] = useState<Record<string, any>>({});

  const isReportMode = !["Today", "Yesterday"].includes(selectedDateRange);

  // Set default class for teachers
  React.useEffect(() => {
    if (isTeacher && classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [isTeacher, classes, selectedClassId]);

  React.useEffect(() => {
    if (isReportMode && selectedClassId) {
      const end = new Date();
      const start = new Date();
      if (selectedDateRange === "Last 7 Days") start.setDate(start.getDate() - 7);
      else if (selectedDateRange === "Last 30 Days") start.setDate(start.getDate() - 30);
      else if (selectedDateRange === "This Year") start.setMonth(0, 1);

      const startDate = start.toISOString().split("T")[0];
      const endDate = end.toISOString().split("T")[0];

      fetchSummary(startDate, endDate, "student", selectedClassId).then(data => {
        if (data) setSummaryData(data);
      });
    }
  }, [selectedDateRange, selectedClassId, fetchSummary, isReportMode]);

  // Students filtered by class
  const classStudents = useMemo(() => {
    if (!selectedClassId) {
      return isTeacher ? [] : students;
    }
    return students.filter(
      (s) =>
        (typeof s.class_id === "object" && s.class_id?._id === selectedClassId) ||
        s.class_id === selectedClassId
    );
  }, [students, selectedClassId, isTeacher]);

  const filteredData = classStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.roll_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.admission_no || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecord = (id: string): LocalRecord =>
    localRecords[id] ?? { studentId: id, status: "present", notes: "" };

  const setStatus = (id: string, status: AttendanceStatus) => {
    setLocalRecords((prev) => ({
      ...prev,
      [id]: { ...getRecord(id), studentId: id, status },
    }));
  };

  const setNotes = (id: string, notes: string) => {
    setLocalRecords((prev) => ({
      ...prev,
      [id]: { ...getRecord(id), studentId: id, notes },
    }));
  };

  const handleSave = async () => {
    if (!selectedClassId) {
      alert("Please select a class first.");
      return;
    }
    const records = classStudents.map((s) => {
      const r = getRecord(s._id);
      return { studentId: s._id, status: r.status, note: r.notes };
    });

    const dateToSave = (() => {
      const d = new Date();
      if (selectedDateRange === "Yesterday") d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    })();

    const res = await saveAttendance(selectedClassId, dateToSave, records);
    if (res.success) alert("Attendance saved successfully!");
    else alert(res.message || "Failed to save attendance.");
  };

  // Summary counts
  const counts = useMemo(() => {
    return classStudents.reduce(
      (acc, s) => {
        const status = getRecord(s._id).status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classStudents, localRecords]);

  const getClassName = (class_id: { _id: string; name: string; section: string } | string): string => {
    if (typeof class_id === "object") return `${class_id?.name} ${class_id?.section}`;
    const cls = classes.find((c) => c._id === class_id);
    return cls ? `${cls.name} ${cls.section}` : "—";
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Attendance</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/attendance" className="hover:text-[#F59E0B]">Attendance</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Student Attendance</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#F59E0B] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#F59E0B] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
          {!isReportMode && (
            <button
              onClick={handleSave}
              disabled={saving || !selectedClassId || classStudents.length === 0}
              className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Attendance
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {classStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-5 gap-3">
          {STATUS_OPTIONS.map((opt) => (
            <div key={opt.value} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm text-center">
              <div className={`w-2.5 h-2.5 rounded-full ${statusDot[opt.value]} mx-auto mb-2`} />
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{counts[opt.value] || 0}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{opt.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Student Attendance List</h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Class select */}
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => { setSelectedClassId(e.target.value); setLocalRecords({}); }}
                className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg outline-none focus:border-[#F59E0B] transition-colors appearance-none shadow-sm cursor-pointer"
              >
                {!isTeacher && <option value="">All Classes</option>}
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name} — {c.section}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-[13px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="whitespace-nowrap">{selectedDateRange}</span>
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year", "Next Year", "Custom Range"].map((item) => (
                      <button
                        key={item}
                        onClick={() => { setSelectedDateRange(item); setIsDateRangeOpen(false); }}
                        className={`w-full px-4 py-2 text-[13px] text-left transition-colors ${item === selectedDateRange
                          ? "bg-[#F59E0B] text-white font-semibold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sort */}
            {/* <div className="relative">
              <button onClick={() => setIsSortOpen(!isSortOpen)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
                <List className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Sort <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["A–Z by Name", "Roll No", "Admission No"].map((item) => (
                      <button key={item} className="w-full px-4 py-2.5 text-[14px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors font-medium cursor-pointer">
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div> */}
          </div>
        </div>

        {/* Search */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            <span>Showing</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredData.length}</span>
            <span>students</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, roll no, admission no…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[280px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-12">
                  <input type="checkbox" className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] cursor-pointer" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Admission No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                {!isReportMode ? (
                  <>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Attendance</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 min-w-full sm:w-[200px]">Notes</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Present</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Absent</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Late</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">%</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {studentsLoading || summaryLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    {selectedClassId ? "No students in this class." : "Select a class to mark attendance, or search all students."}
                  </td>
                </tr>
              ) : filteredData.map((item) => {
                const rec = getRecord(item._id);
                return (
                  <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] cursor-pointer" />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/students/${item._id}`} className="font-semibold text-[#F59E0B] hover:text-[#D97706] transition-colors cursor-pointer">
                        {item.admission_no || item._id.slice(-6).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      {item.roll_no || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[12px] flex-shrink-0">
                          {item.name.charAt(0)}
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-bold">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {getClassName(item.class_id)}
                    </td>
                    {!isReportMode ? (
                      <>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium">
                            {STATUS_OPTIONS.map((opt) => (
                              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer group">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${rec.status === opt.value ? "border-[#F59E0B]" : "border-slate-300 dark:border-slate-600 group-hover:border-[#F59E0B]/50"}`}>
                                  {rec.status === opt.value && <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />}
                                </div>
                                <span className="text-[12px]">{opt.label}</span>
                                <input
                                  type="radio"
                                  name={`attendance-${item._id}`}
                                  value={opt.value}
                                  checked={rec.status === opt.value}
                                  onChange={() => setStatus(item._id, opt.value)}
                                  className="hidden"
                                />
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Optional note…"
                            value={rec.notes}
                            onChange={(e) => setNotes(item._id, e.target.value)}
                            className="w-full px-3 py-1.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B] transition-colors bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-center font-bold text-emerald-600">{summaryData[item._id]?.present || 0}</td>
                        <td className="px-6 py-4 text-center font-bold text-red-600">{summaryData[item._id]?.absent || 0}</td>
                        <td className="px-6 py-4 text-center font-bold text-amber-600">{summaryData[item._id]?.late || 0}</td>
                        <td className="px-6 py-4 text-center font-bold">
                          {(() => {
                            const p = summaryData[item._id]?.present || 0;
                            const a = summaryData[item._id]?.absent || 0;
                            const l = summaryData[item._id]?.late || 0;
                            const total = p + a + l;
                            return total > 0 ? Math.round(((p + l) / total) * 100) + "%" : "-";
                          })()}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors">Prev</button>
          <button className="w-7 h-7 rounded-lg bg-[#F59E0B] text-white text-[13px] font-medium flex items-center justify-center">1</button>
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
}
