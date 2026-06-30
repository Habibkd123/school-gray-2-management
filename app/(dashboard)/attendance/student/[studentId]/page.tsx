"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, AlertCircle, Search, Loader2, RefreshCcw, Save, XCircle, FileText, Download } from "lucide-react";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";
import { getAuthHeaders } from "@/lib/utils/session";

export default function IndividualStudentAttendancePage({ params }: { params: Promise<{ studentId: string }> }) {
  const router = useRouter();
  const { studentId } = use(params);
  const { user } = useAuth();
  const { academicYear } = useAppState();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  // Filters
  const [filterYear, setFilterYear] = useState(academicYear);
  const currentDate = new Date();
  const [filterMonth, setFilterMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, "0"));
  
  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  const [editStatus, setEditStatus] = useState("present");
  const [editNote, setEditNote] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const { start, end } = getMonthDateRange(filterYear, filterMonth);
      const res = await fetch(`/api/attendance/student/${studentId}?academic_year=${filterYear}&startDate=${start}&endDate=${end}`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.message || "Failed to load data");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId && filterYear) {
      fetchData();
    }
  }, [studentId, filterYear, filterMonth]);

  const getMonthDateRange = (year: string, monthStr: string) => {
    // year is academic year like "2026-2027", but for month filtering we just use current year approx
    // To keep it simple, we construct a generic range for the chosen month
    // If year is "2026-2027", months 4-12 are in 2026, months 1-3 are in 2027 (assuming April start).
    let y = parseInt(year.split("-")[0]);
    const m = parseInt(monthStr);
    if (m < 4) y += 1;
    
    const start = `${y}-${monthStr}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  };

  const isTeacher = user?.role === "teacher";

  const handleEditClick = (record: any) => {
    setSelectedRecord(record);
    setEditStatus(record.status);
    setEditNote(record.note || "");
    setEditReason("");
    setSaveError("");
    setSaveSuccess("");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editReason || editReason.trim() === "") {
      setSaveError("Reason is mandatory for editing attendance.");
      return;
    }
    
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const res = await fetch(`/api/attendance/student/${studentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          date: selectedRecord.date,
          status: editStatus,
          note: editNote,
          reason: editReason
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccess("Attendance updated successfully.");
        setTimeout(() => {
          setEditModalOpen(false);
          fetchData();
        }, 1500);
      } else {
        setSaveError(json.message || "Failed to update attendance");
      }
    } catch (err: any) {
      setSaveError(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const generateCalendarDays = () => {
    if (!filterYear) return [];
    let y = parseInt(filterYear.split("-")[0]);
    const m = parseInt(filterMonth);
    if (m < 4) y += 1;

    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0 is Sunday
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null, record: null });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${y}-${String(m).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const record = data?.history?.find((r: any) => r.date.split("T")[0] === dStr);
      days.push({ day: i, date: dStr, record });
    }
    return days;
  };

  const calendarDays = useMemo(() => generateCalendarDays(), [data, filterMonth, filterYear]);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/attendance/student')} 
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-border shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Attendance Details</h1>
            <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Attendance</span><span>/</span>
              <span className="text-slate-900 dark:text-white font-medium">{data?.student?.name || "Student"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-white dark:bg-slate-800 border border-border rounded-lg text-[13px] font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-border card-shadow">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-[14px] font-medium">Loading details...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-rose-500 bg-white dark:bg-slate-900 rounded-xl border border-border card-shadow">
          <AlertCircle className="w-8 h-8" />
          <p className="text-[14px] font-medium">{error}</p>
        </div>
      ) : (
        <>
          {/* Student Info & Stats Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow lg:col-span-1">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-border pb-2">Student Information</h2>
              <div className="space-y-3">
                <div><span className="text-xs text-slate-500">Name:</span> <span className="text-sm font-semibold block">{data?.student?.name}</span></div>
                <div><span className="text-xs text-slate-500">Class & Section:</span> <span className="text-sm font-semibold block">{data?.student?.className} {data?.student?.section ? `- ${data?.student?.section}` : ''}</span></div>
                <div><span className="text-xs text-slate-500">Admission No:</span> <span className="text-sm font-semibold block">{data?.student?.admission_no || "-"}</span></div>
                <div><span className="text-xs text-slate-500">Roll No:</span> <span className="text-sm font-semibold block">{data?.student?.roll_no || "-"}</span></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow lg:col-span-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-border pb-2">Attendance Statistics ({monthNames[parseInt(filterMonth)-1]})</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{data?.stats?.totalWorkingDays}</div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-1">Working Days</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{data?.stats?.totalPresent}</div>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wide mt-1">Present</div>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/50">
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{data?.stats?.totalAbsent}</div>
                  <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-500 uppercase tracking-wide mt-1">Absent</div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{data?.stats?.totalLeave}</div>
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wide mt-1">Leave</div>
                </div>
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50">
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{data?.stats?.attendancePercentage}%</div>
                  <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-500 uppercase tracking-wide mt-1">Percentage</div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[12px] font-medium text-slate-600">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-[12px] font-medium text-slate-600">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-[12px] font-medium text-slate-600">Leave</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-[13px] outline-none font-medium bg-slate-50 dark:bg-slate-800">
                {monthNames.map((m, i) => (
                  <option key={i} value={String(i+1).padStart(2, "0")}>{m}</option>
                ))}
              </select>
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-[13px] outline-none font-medium bg-slate-50 dark:bg-slate-800">
                <option value={academicYear}>{academicYear}</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow lg:col-span-1">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-500" /> Calendar View
              </h2>
              
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-[11px] font-bold text-slate-400">{d}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((d, i) => (
                  <div 
                    key={i} 
                    onClick={() => d.record && handleEditClick(d.record)}
                    className={`aspect-square rounded-md flex items-center justify-center text-[12px] font-semibold cursor-pointer transition-colors
                      ${!d.day ? 'bg-transparent' : 
                        d.record?.status === 'present' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        d.record?.status === 'absent' ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-400' :
                        d.record?.status === 'leave' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400' :
                        'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
                      }
                      ${!d.record && d.day ? 'opacity-50 cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800' : ''}
                    `}
                  >
                    {d.day || ""}
                  </div>
                ))}
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow lg:col-span-2 overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> Attendance History
                </h2>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-border sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Note</th>
                      <th className="px-4 py-3 font-semibold">Last Updated</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data?.history?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">No records found for this month.</td>
                      </tr>
                    ) : (
                      data?.history?.map((record: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                            {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`capitalize px-2.5 py-1 rounded-md text-[11px] font-bold ${
                              record.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                              record.status === 'absent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 italic max-w-[150px] truncate">{record.note || "-"}</td>
                          <td className="px-4 py-3 text-slate-500">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-indigo-500">{record.updatedBy}</span>
                              <span className="text-[11px]">{new Date(record.lastUpdated).toLocaleDateString('en-GB')}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleEditClick(record)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-bold transition-colors">
                              View/Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setEditModalOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Attendance</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-0.5">
                  {new Date(selectedRecord.date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => !saving && setEditModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {saveError && <div className="text-xs font-bold text-rose-500 bg-rose-50 p-2 rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4"/> {saveError}</div>}
              {saveSuccess && <div className="text-xs font-bold text-emerald-500 bg-emerald-50 p-2 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> {saveSuccess}</div>}
              
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} disabled={saving} className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium outline-none focus:border-primary bg-white dark:bg-slate-900">
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Note (Optional)</label>
                <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} disabled={saving} placeholder="E.g. Medical leave" className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium outline-none focus:border-primary bg-white dark:bg-slate-900" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide flex items-center justify-between">
                  <span>Reason <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 normal-case italic">Mandatory for edits</span>
                </label>
                <textarea value={editReason} onChange={e => setEditReason(e.target.value)} disabled={saving} placeholder="Why are you editing this record?" className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium outline-none focus:border-primary bg-white dark:bg-slate-900 min-h-[80px] resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-border bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-3">
              <button onClick={() => setEditModalOpen(false)} disabled={saving} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="px-5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
