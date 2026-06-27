"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, ChevronDown, RefreshCw, Printer, Download, FileText, Loader2, Save
} from "lucide-react";
import { useStudents } from "../../../hooks/useStudents";
import { useClasses } from "../../../hooks/useClasses";
import { useExams } from "../../../hooks/useExams";
import { useAttendance } from "../../../hooks/useAttendance";

type AttendanceStatus = "present" | "absent" | "late";

interface LocalRecord {
  studentId: string;
  status: AttendanceStatus;
  note: string;
}

export default function ExamAttendancePage() {
  const { students, isLoading: studentsLoading } = useStudents();
  const { classes } = useClasses();
  const { exams } = useExams();
  const { fetchAttendance, saveAttendance, isLoading: saving } = useAttendance();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [localRecords, setLocalRecords] = useState<Record<string, LocalRecord>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Filter exams by selected class
  const classExams = useMemo(() => {
    if (!selectedClassId) return exams;
    return exams.filter(e => {
      const cid = typeof e.class_id === "object" ? e.class_id?._id : e.class_id;
      return cid === selectedClassId;
    });
  }, [exams, selectedClassId]);

  // Sync class and date when exam is selected
  useEffect(() => {
    if (selectedExamId) {
      const exam = exams.find(ex => ex._id === selectedExamId);
      if (exam) {
        const examClassId = typeof exam.class_id === "object" ? exam.class_id?._id : exam.class_id;
        if (examClassId && examClassId !== selectedClassId) {
          setSelectedClassId(examClassId);
        }
        if (exam.start_date) {
          setSelectedDate(new Date(exam.start_date).toISOString().split("T")[0]);
        }
      }
    }
  }, [selectedExamId, exams]);

  // Fetch marked attendance records for the selected class and date
  useEffect(() => {
    if (!selectedClassId || !selectedDate) {
      setLocalRecords({});
      return;
    }

    const loadAttendance = async () => {
      setLoadingAttendance(true);
      try {
        const data = await fetchAttendance(selectedClassId, selectedDate);
        if (data && data.records && data.records.length > 0) {
          const newRecords: Record<string, LocalRecord> = {};
          data.records.forEach((rec: any) => {
            const studentId = typeof rec.student_id === "object" ? rec.student_id?._id : rec.student_id;
            if (studentId) {
              newRecords[studentId] = {
                studentId,
                status: rec.status,
                note: rec.note || "",
              };
            }
          });
          setLocalRecords(newRecords);
        } else {
          setLocalRecords({});
        }
      } catch (err) {
        console.error("Failed to load attendance", err);
      } finally {
        setLoadingAttendance(false);
      }
    };

    loadAttendance();
  }, [selectedClassId, selectedDate, fetchAttendance]);

  // Students filtered by class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(
      (s) =>
        (typeof s.class_id === "object" && s.class_id?._id === selectedClassId) ||
        s.class_id === selectedClassId
    );
  }, [students, selectedClassId]);

  // Search filter
  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.roll_no || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classStudents, searchTerm]);

  const getRecord = (id: string): LocalRecord =>
    localRecords[id] ?? { studentId: id, status: "present", note: "" };

  const setStatus = (id: string, status: AttendanceStatus) => {
    setLocalRecords((prev) => ({
      ...prev,
      [id]: { ...getRecord(id), studentId: id, status },
    }));
  };

  const setNote = (id: string, note: string) => {
    setLocalRecords((prev) => ({
      ...prev,
      [id]: { ...getRecord(id), studentId: id, note },
    }));
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedDate) {
      alert("Please select a class and date first.");
      return;
    }
    const records = classStudents.map((s) => {
      const r = getRecord(s._id);
      return { studentId: s._id, status: r.status, note: r.note };
    });
    const res = await saveAttendance(selectedClassId, selectedDate, records);
    if (res.success) alert("Attendance saved successfully!");
    else alert(res.message || "Failed to save attendance.");
  };

  const statusColor = (status: AttendanceStatus) => {
    if (status === "present") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    if (status === "absent") return "bg-rose-50 text-rose-600 border border-rose-100";
    return "bg-amber-50 text-amber-600 border border-amber-100";
  };

  const counts = useMemo(() => {
    const base = classStudents.reduce(
      (acc, s) => {
        const r = getRecord(s._id);
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classStudents, localRecords]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Attendance</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/examination" className="hover:text-[#1E3A5F]">Examination</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Exam Attendance</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#1E3A5F] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#0F172A] dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !selectedClassId}
            className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#162C47] text-white text-[13px] font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Attendance
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Class</label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => { setSelectedClassId(e.target.value); setSelectedExamId(""); setLocalRecords({}); }}
                className="w-full px-3.5 py-2.5 text-[13px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {c.name} — {c.section}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Exam */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Exam</label>
            <div className="relative">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[13px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Exam</option>
                {classExams.map((ex) => {
                  const className = typeof ex.class_id === "object" ? `${ex.class_id?.name || ""} ${ex.class_id?.section || ""}` : "";
                  return (
                    <option key={ex._id} value={ex._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {ex.name} {className ? `(${className})` : ""}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-[13px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors text-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Search */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Name or roll no…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {selectedClassId && classStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["present", "absent", "late"] as AttendanceStatus[]).map((s) => (
            <div key={s} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm text-center">
              <p className={`text-2xl font-bold ${s === "present" ? "text-emerald-600" : s === "absent" ? "text-rose-600" : "text-amber-500"}`}>
                {counts[s] || 0}
              </p>
              <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 capitalize mt-1">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
            {selectedClassId
              ? `Students (${filteredStudents.length})`
              : "Select a class to mark attendance"}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-12">
                  <input type="checkbox" className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {studentsLoading || loadingAttendance ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : !selectedClassId ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Please select a class above to begin marking attendance.
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">No students in this class.</td>
                </tr>
              ) : filteredStudents.map((student) => {
                const rec = getRecord(student._id);
                return (
                  <tr key={student._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer" />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/students/${student._id}`} className="font-semibold text-[#1E3A5F] hover:text-[#162C47] transition-colors">
                        {student.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{student.roll_no || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {(["present", "absent", "late"] as AttendanceStatus[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(student._id, s)}
                            className={`px-3 py-1 rounded-md text-[12px] font-semibold capitalize transition-colors cursor-pointer ${rec.status === s ? statusColor(s) : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={rec.note}
                        onChange={(e) => setNote(student._id, e.target.value)}
                        placeholder="Optional note…"
                        className="px-3 py-1.5 text-[12px] bg-slate-50 dark:bg-slate-800 border border-border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors w-40 text-slate-700 dark:text-slate-200"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
