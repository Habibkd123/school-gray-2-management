"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, List, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2, Save, ShieldAlert
} from "lucide-react";
import { useTeachers } from "../../../hooks/useTeachers";
import { useAttendanceSummary } from "../../../hooks/useAttendanceSummary";

type AttendanceStatus = "present" | "late" | "absent" | "holiday" | "half_day";

interface LocalRecord {
  teacherId: string;
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

export default function TeacherAttendancePage() {
  const { teachers, isLoading: teachersLoading } = useTeachers();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("A–Z by Name");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("Today");
  const [isSaving, setIsSaving] = useState(false);
  const [localRecords, setLocalRecords] = useState<Record<string, LocalRecord>>({});
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [dbRecords, setDbRecords] = useState<Record<string, string>>({});

  const { fetchSummary, isLoading: summaryLoading } = useAttendanceSummary();
  const [summaryData, setSummaryData] = useState<Record<string, any>>({});

  const isReportMode = !["Today", "Yesterday"].includes(selectedDateRange);

  const targetDate = useMemo(() => {
    const d = new Date();
    if (selectedDateRange === "Yesterday") d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, [selectedDateRange]);

  const isToday = selectedDateRange === "Today";
  const canMark = isToday || hasExistingRecord;

  // Fetch summary data in report mode
  React.useEffect(() => {
    if (isReportMode) {
      const end = new Date();
      const start = new Date();
      if (selectedDateRange === "Last 7 Days") start.setDate(start.getDate() - 7);
      else if (selectedDateRange === "Last 30 Days") start.setDate(start.getDate() - 30);
      else if (selectedDateRange === "This Year") start.setMonth(0, 1);

      const startDate = start.toISOString().split("T")[0];
      const endDate = end.toISOString().split("T")[0];

      fetchSummary(startDate, endDate, "teacher").then(data => {
        if (data) setSummaryData(data);
      });
    }
  }, [selectedDateRange, fetchSummary, isReportMode]);

  // Load existing attendance for Selected Date (Today or Yesterday)
  React.useEffect(() => {
    if (!isReportMode) {
      const loadAttendance = async () => {
        setLoadingExisting(true);
        try {
          const { getAuthHeaders } = await import("@/lib/utils/session");
          const res = await fetch(`/api/attendance?date=${targetDate}&type=teacher`, {
            headers: getAuthHeaders(),
          });
          const data = await res.json();
          if (res.ok && data.success && data.data && data.data.records && data.data.records.length > 0) {
            const recordsMap: Record<string, LocalRecord> = {};
            const dbMap: Record<string, string> = {};
            data.data.records.forEach((r: any) => {
              if (!r.student_id) return;
              const teacherId = typeof r.student_id === "object" ? r.student_id._id : r.student_id;
              if (!teacherId) return;
              recordsMap[teacherId] = {
                teacherId,
                status: r.status,
                notes: r.note || "",
              };
              dbMap[teacherId] = r.status;
            });
            setLocalRecords(recordsMap);
            setDbRecords(dbMap);
            setHasExistingRecord(true);
          } else {
            setLocalRecords({});
            setDbRecords({});
            setHasExistingRecord(false);
          }
        } catch (err) {
          console.error("Failed to load existing attendance:", err);
          setLocalRecords({});
          setDbRecords({});
          setHasExistingRecord(false);
        } finally {
          setLoadingExisting(false);
        }
      };
      loadAttendance();
    } else {
      setLocalRecords({});
      setHasExistingRecord(false);
    }
  }, [selectedDateRange, isReportMode, targetDate]);

  const filteredData = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.subject || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      if (selectedSort === "A–Z by Name") {
        return a.name.localeCompare(b.name);
      } else if (selectedSort === "Z-A by Name") {
        return b.name.localeCompare(a.name);
      } else if (selectedSort === "Employee ID") {
        const idA = a.employee_id || "";
        const idB = b.employee_id || "";
        return idA.localeCompare(idB);
      }
      return 0;
    });
    return data;
  }, [filteredData, selectedSort]);

  const getRecord = (id: string): LocalRecord =>
    localRecords[id] ?? { teacherId: id, status: "present", notes: "" };

  const setStatus = (id: string, status: AttendanceStatus) => {
    setLocalRecords((prev) => ({
      ...prev,
      [id]: { ...getRecord(id), teacherId: id, status },
    }));
  };

  const setNotes = (id: string, notes: string) => {
    setLocalRecords((prev) => ({
      ...prev,
      [id]: { ...getRecord(id), teacherId: id, notes },
    }));
  };

  const handleSave = async () => {
    if (!canMark) {
      alert("Attendance cannot be marked for this date.");
      return;
    }
    setIsSaving(true);
    // Teacher attendance uses same endpoint with type=teacher
    const records = teachers.map((t) => {
      const r = getRecord(t._id);
      return { studentId: t._id, status: r.status, note: r.notes };
    });
    try {
      const { getAuthHeaders } = await import("@/lib/utils/session");
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          classId: "teacher",
          date: targetDate,
          type: "teacher",
          records
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Attendance saved successfully!");
        setHasExistingRecord(true);
        const dbMap: Record<string, string> = {};
        teachers.forEach((t) => {
          dbMap[t._id] = getRecord(t._id).status;
        });
        setDbRecords(dbMap);
      }
      else alert(data.message || "Failed to save attendance.");
    } catch {
      alert("Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // Summary counts
  const counts = useMemo(() => {
    return teachers.reduce(
      (acc, t) => {
        const status = getRecord(t._id).status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, localRecords]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Attendance</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/attendance" className="hover:text-[#F59E0B]">Attendance</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Teacher Attendance</span>
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
              disabled={isSaving || teachers.length === 0 || !canMark}
              className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Attendance
            </button>
          )}
        </div>
      </div>

      {!teachersLoading && !loadingExisting && !isReportMode && !canMark && (
        <div className="p-4 border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl flex items-center gap-2.5 text-[13.5px] font-semibold text-left">
          <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-rose-500" />
          <span>Past attendance records cannot be created. You can only view them as no record exists for this date.</span>
        </div>
      )}

      {/* Summary stats */}
      {teachers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 sm:grid-cols-5 gap-3">
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
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Teacher Attendance List</h2>
            {!isReportMode && canMark && (
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${hasExistingRecord
                ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-400"
                : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400"
              }`}>
                {hasExistingRecord ? "Editing Existing" : "New Register"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Date Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-[13px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedDateRange !== "Today" ? "border-[#F59E0B] bg-[#FFF9E6] dark:bg-[#F59E0B]/10" : "border-border"
                  }`}
              >
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="whitespace-nowrap">{selectedDateRange}</span>
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year"].map((item) => (
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
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`px-3 py-2 bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer ${selectedSort !== "A–Z by Name" ? "border-[#F59E0B] bg-[#FFF9E6] dark:bg-[#F59E0B]/10" : "border-border"
                  }`}
              >
                <List className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Sort: {selectedSort} <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["A–Z by Name", "Z-A by Name", "Employee ID"].map((item) => (
                      <button
                        key={item}
                        onClick={() => { setSelectedSort(item); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[13px] text-left transition-colors cursor-pointer ${item === selectedSort
                          ? "bg-[#F59E0B] text-white font-semibold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            <span>Showing</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{sortedData.length}</span>
            <span>teachers</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, ID, subject…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B] transition-colors"
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
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Employee ID</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Subject</th>
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
              {teachersLoading || summaryLoading || loadingExisting ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No teachers found.
                  </td>
                </tr>
              ) : sortedData.map((item) => {
                const rec = getRecord(item._id);
                return (
                  <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] cursor-pointer" />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/teachers/${item._id}`} className="font-semibold text-[#F59E0B] hover:text-[#D97706] transition-colors cursor-pointer">
                        {item.employee_id || item._id.slice(-6).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[12px] flex-shrink-0">
                          {item.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-700 dark:text-slate-200 font-bold">{item.name}</span>
                          {!isReportMode && (
                            <div className="mt-1 flex">
                              {hasExistingRecord ? (
                                rec.status === dbRecords[item._id] ? (
                                  <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 px-1 py-0.2 rounded font-semibold">
                                    ✓ Saved
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 px-1 py-0.2 rounded font-semibold">
                                    ⚠ Unsaved
                                  </span>
                                )
                              ) : (
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-1 py-0.2 rounded font-semibold">
                                  New
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {item.subject || item.subject_specialization || "-"}
                    </td>
                    {!isReportMode ? (
                      <>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {STATUS_OPTIONS.map((opt) => (
                              <label key={opt.value} className={`flex items-center gap-2 group ${!canMark ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                                <div className="relative flex items-center justify-center">
                                  <input
                                    type="radio"
                                    name={`attendance-${item._id}`}
                                    value={opt.value}
                                    checked={rec.status === opt.value}
                                    onChange={() => canMark && setStatus(item._id, opt.value)}
                                    disabled={!canMark}
                                    className="peer sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded-full border transition-all ${rec.status === opt.value ? "border-[#F59E0B] border-[4px]" : "border-slate-300 dark:border-slate-600"}`} />
                                </div>
                                <span className={`text-slate-700 dark:text-slate-300 transition-colors ${!canMark ? "" : "group-hover:text-slate-900 dark:group-hover:text-white"}`}>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={rec.notes}
                            onChange={(e) => setNotes(item._id, e.target.value)}
                            disabled={!canMark}
                            placeholder={canMark ? "Add notes..." : ""}
                            className={`w-full border rounded-lg px-3 py-1.5 text-[13px] outline-none transition-all placeholder:text-slate-400 ${!canMark ? "bg-slate-100 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-[#F59E0B] focus:bg-white dark:focus:bg-slate-900"}`}
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
