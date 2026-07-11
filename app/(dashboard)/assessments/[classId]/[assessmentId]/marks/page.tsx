"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAuth } from "@/app/context/auth";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clipboard,
  History,
  Lock,
  Search,
  ChevronDown,
  XCircle,
  TrendingUp,
  Award,
  AlertOctagon,
  Percent,
  Calculator
} from "lucide-react";

interface MarkRow {
  student_id: string;
  name: string;
  roll_no: string;
  admission_no: string;
  photo_url?: string;
  marks_obtained: number | "";
  is_pass: boolean | null;
  remarks: string;
  attendance_status: string;
  has_entry: boolean;
}

export default function MarksEntryPage({ params }: { params: Promise<{ classId: string; assessmentId: string }> }) {
  const { classId, assessmentId } = React.use(params);
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const isTeacher = user?.role === "teacher";

  const [test, setTest] = useState<any>(null);
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals & Drawers
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Toasts & Warnings
  const [toastSuccess, setToastSuccess] = useState("");
  const [toastError, setToastError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const hasUnsavedChanges = useRef(false);

  // Sync / Load assessment info & student roster
  const fetchMarksRoster = useCallback(async () => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/marks`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setTest(data.data.test);
        setRows(data.data.rows.map((r: any) => ({
          ...r,
          marks_obtained: r.marks_obtained !== null && r.marks_obtained !== undefined ? Number(r.marks_obtained) : "",
          remarks: r.remarks || "",
          attendance_status: r.attendance_status || "Present",
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchMarksRoster();
  }, [fetchMarksRoster]);

  // Determine lock conditions
  const isTestLocked = useMemo(() => {
    if (!test) return false;
    return !!((test.is_published || test.status === "published") && isTeacher);
  }, [test, isTeacher]);

  // Change handlers
  const handleMarksChange = (idx: number, value: string) => {
    if (isTestLocked) return;
    hasUnsavedChanges.current = true;

    const newRows = [...rows];
    const studentId = newRows[idx].student_id;
    const maxVal = test?.total_marks || 100;
    const passVal = test?.passing_marks || 33;

    if (value === "") {
      newRows[idx].marks_obtained = "";
      newRows[idx].is_pass = null;
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    } else {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        setValidationErrors(prev => ({ ...prev, [studentId]: "Cannot be negative" }));
      } else if (num > maxVal) {
        setValidationErrors(prev => ({ ...prev, [studentId]: `Cannot exceed Max: ${maxVal}` }));
      } else {
        setValidationErrors(prev => {
          const copy = { ...prev };
          delete copy[studentId];
          return copy;
        });
      }
      newRows[idx].marks_obtained = num;
      newRows[idx].is_pass = num >= passVal;
    }

    setRows(newRows);
  };

  const handleRemarksChange = (idx: number, value: string) => {
    if (isTestLocked) return;
    hasUnsavedChanges.current = true;
    const newRows = [...rows];
    newRows[idx].remarks = value;
    setRows(newRows);
  };

  const handleAttendanceChange = (idx: number, value: string) => {
    if (isTestLocked) return;
    hasUnsavedChanges.current = true;
    const newRows = [...rows];
    newRows[idx].attendance_status = value;
    
    if (value === "Absent") {
      newRows[idx].marks_obtained = 0;
      newRows[idx].is_pass = false;
      const studentId = newRows[idx].student_id;
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    }
    setRows(newRows);
  };

  // Grade & Performance calculation logic
  const calculateGradeAndLevel = (obtained: number | "", max: number, attendance: string) => {
    if (attendance === "Absent") {
      return { grade: "F", level: "Needs Improvement" };
    }
    if (attendance === "Medical") {
      return { grade: "—", level: "Medical Leave" };
    }
    if (attendance === "Exempted") {
      return { grade: "—", level: "Exempted" };
    }
    if (obtained === "") {
      return { grade: "—", level: "—" };
    }

    const pct = (obtained / max) * 105; // Grade scaling factor
    let grade = "F";
    let level = "Needs Improvement";

    if (pct >= 90) { grade = "A+"; level = "Excellent"; }
    else if (pct >= 80) { grade = "A"; level = "Excellent"; }
    else if (pct >= 70) { grade = "B"; level = "Good"; }
    else if (pct >= 60) { grade = "C"; level = "Good"; }
    else if (pct >= 50) { grade = "D"; level = "Average"; }
    else if (pct >= 40) { grade = "E"; level = "Average"; }

    return { grade, level };
  };

  // Save changes handler
  const handleSaveAllMarks = async (showToast = true) => {
    if (Object.keys(validationErrors).length > 0) {
      setToastError("Please fix validation warning thresholds first.");
      setTimeout(() => setToastError(""), 3500);
      return false;
    }

    const entries = rows
      .filter(r => r.attendance_status === "Absent" || r.marks_obtained !== "")
      .map(r => ({
        student_id: r.student_id,
        marks_obtained: r.marks_obtained,
        remarks: r.remarks,
        attendance_status: r.attendance_status
      }));

    if (entries.length === 0) {
      if (showToast) {
        setToastError("No scores or remarks have been entered yet.");
        setTimeout(() => setToastError(""), 3000);
      }
      return false;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/marks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (data.success) {
        hasUnsavedChanges.current = false;
        if (showToast) {
          setToastSuccess(data.message || "Assessment scores submitted successfully!");
          setTimeout(() => setToastSuccess(""), 3000);
        }
        // Reload details
        fetchMarksRoster();
        return true;
      } else {
        if (showToast) {
          setToastError(data.message || "Save attempt failed.");
          setTimeout(() => setToastError(""), 3000);
        }
        return false;
      }
    } catch {
      if (showToast) {
        setToastError("Network saving error occurred.");
        setTimeout(() => setToastError(""), 3000);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-Save Daemon
  useEffect(() => {
    const daemon = setInterval(() => {
      if (hasUnsavedChanges.current && !isTestLocked && test) {
        console.log("Auto-Saving assessment draft in background...");
        handleSaveAllMarks(false);
      }
    }, 10000); // 10 seconds interval

    return () => clearInterval(daemon);
  }, [rows, isTestLocked, test]);

  // Load audit history logs
  const handleOpenAuditDrawer = async () => {
    setLoadingAudit(true);
    setIsAuditOpen(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/marks/audit`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data);
      } else {
        setToastError("Failed to fetch logs ledger.");
      }
    } catch {
      setToastError("Network error.");
    } finally {
      setLoadingAudit(false);
    }
  };

  // Excel clipboard parser
  const handleParseClipboard = () => {
    if (!bulkInput.trim()) return;

    const lines = bulkInput.trim().split("\n");
    const parsed: Record<string, string> = {};

    lines.forEach(l => {
      const cols = l.split("\t");
      if (cols.length >= 2) {
        const rollOrAdm = cols[0].trim().toLowerCase();
        const mark = cols[1].trim();
        parsed[rollOrAdm] = mark;
      }
    });

    setRows(prev => {
      return prev.map(row => {
        const rollMatch = row.roll_no ? parsed[row.roll_no.toLowerCase()] : null;
        const admMatch = row.admission_no ? parsed[row.admission_no.toLowerCase()] : null;
        const score = rollMatch || admMatch;

        if (score && !isNaN(Number(score))) {
          const maxVal = test?.total_marks || 100;
          const scoreNum = Number(score);
          
          return {
            ...row,
            marks_obtained: scoreNum,
            attendance_status: "Present",
            is_pass: scoreNum >= (test?.passing_marks || 33)
          };
        }
        return row;
      });
    });

    hasUnsavedChanges.current = true;
    setIsBulkOpen(false);
    setBulkInput("");
    setToastSuccess("Excel values successfully matched and pre-filled!");
    setTimeout(() => setToastSuccess(""), 3000);
  };

  // Keyboard navigation refs
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const keys = ["ArrowUp", "ArrowDown", "Enter"];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const filteredRows = rows.filter(r => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return r.name.toLowerCase().includes(q) || r.roll_no.toLowerCase().includes(q);
    });
    
    let targetIdx = idx;
    if (e.key === "ArrowUp") {
      targetIdx = Math.max(0, idx - 1);
    } else if (e.key === "ArrowDown" || e.key === "Enter") {
      targetIdx = Math.min(filteredRows.length - 1, idx + 1);
    }

    const targetStudentId = filteredRows[targetIdx].student_id;
    const targetRef = inputRefs.current[targetStudentId];
    if (targetRef) {
      targetRef.focus();
      targetRef.select();
    }
  };

  // Performance analytics selectors
  const analytics = useMemo(() => {
    const scored = rows.filter(r => r.marks_obtained !== "" && r.attendance_status === "Present");
    if (scored.length === 0) return { highest: 0, lowest: 0, average: 0, passPct: 0, totalCount: rows.length };

    const scores = scored.map(r => Number(r.marks_obtained));
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = Number((sum / scores.length).toFixed(1));
    const passCount = rows.filter(r => r.is_pass === true).length;
    const passPct = Number(((passCount / rows.length) * 100).toFixed(1));

    return { highest, lowest, average, passPct, totalCount: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return r.name.toLowerCase().includes(q) || 
             r.roll_no.toLowerCase().includes(q) || 
             r.admission_no.toLowerCase().includes(q);
    });
  }, [rows, searchTerm]);

  const progressCount = rows.filter(r => r.marks_obtained !== "").length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-bold">Loading student marksheet roster...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto">
        <AlertTriangle className="w-12 h-12 text-slate-350 mb-3" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Assessment Record Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">This record might have been deleted, or is not accessible under your current login context.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 border border-border text-xs font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2.5 rounded-xl border border-border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Continuous Evaluation Portal
            </h1>
            <p className="text-xs text-slate-455 mt-1 font-medium">
              {test.title} · Subject Total: <strong className="text-slate-700 dark:text-slate-200">{test.total_marks}</strong> · Pass Mark: <strong className="text-slate-700 dark:text-slate-200">{test.passing_marks}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleOpenAuditDrawer}
            className="p-2 border border-border text-slate-655 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm cursor-pointer"
            title="View Audit Logs Ledger"
          >
            <History className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsBulkOpen(true)}
            disabled={isTestLocked}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-655 hover:bg-slate-50 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-40"
          >
            <Clipboard className="w-4 h-4" /> Excel Import
          </button>

          <button 
            onClick={() => handleSaveAllMarks(true)}
            disabled={isSaving || isTestLocked}
            className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
            Save All Scores
          </button>
        </div>
      </div>

      {/* Lock Warning banner */}
      {isTestLocked && (
        <div className="bg-amber-50 border border-amber-250 text-amber-800 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This evaluation has been published and locked. Contact the Principal or School Administrator to request modifications.</span>
        </div>
      )}

      {/* Progress metrics and stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Progress gauge */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between sm:col-span-2">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-500"> Roster Progress Tracker</span>
            <span className="text-primary font-bold">{progressCount} / {rows.length} Filled</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${rows.length > 0 ? (progressCount / rows.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">Updates dynamically every 10 seconds through our auto-save daemon.</p>
        </div>

        {/* Highest Marks */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Highest</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{analytics.highest} <span className="text-[11px] font-medium text-slate-400">/ {test.total_marks}</span></span>
          </div>
        </div>

        {/* Average Marks */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Class Average</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{analytics.average} <span className="text-[11px] font-medium text-slate-400">/ {test.total_marks}</span></span>
          </div>
        </div>

        {/* Pass Percentage */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 flex items-center justify-center shrink-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Pass Rate</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{analytics.passPct}%</span>
          </div>
        </div>
      </div>

      {/* Main Table card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-950/10">
          <span className="text-xs font-bold text-slate-500">Evaluations ledger table</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search by student, roll, or adm..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 pr-3 py-1.8 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/20 dark:bg-slate-950/20 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                <th className="px-6 py-4 w-20">Roll No</th>
                <th className="px-6 py-4 w-32">Adm No</th>
                <th className="px-6 py-4 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-border">Student Name</th>
                <th className="px-6 py-4 w-36">Attendance</th>
                <th className="px-6 py-4 w-40">Obtained Marks</th>
                <th className="px-6 py-4 w-28">Max Marks</th>
                <th className="px-6 py-4 text-center w-24">Grade</th>
                <th className="px-6 py-4 text-center w-36">Performance Level</th>
                <th className="px-6 py-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-450 font-bold">
                    No active students matching the search filter query.
                  </td>
                </tr>
              ) : filteredRows.map((row, idx) => {
                const globalIdx = rows.findIndex(r => r.student_id === row.student_id);
                const hasError = !!validationErrors[row.student_id];
                const isAbsent = row.attendance_status === "Absent";
                const { grade, level } = calculateGradeAndLevel(row.marks_obtained, test.total_marks, row.attendance_status);

                return (
                  <tr key={row.student_id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-500">{row.roll_no || "—"}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{row.admission_no || "—"}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-border">
                      <div className="flex items-center gap-2">
                        {row.photo_url ? (
                          <img src={row.photo_url} alt={row.name} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-400">
                            {row.name.charAt(0)}
                          </div>
                        )}
                        <span>{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative">
                        <select
                          value={row.attendance_status}
                          onChange={(e) => handleAttendanceChange(globalIdx, e.target.value)}
                          disabled={isTestLocked}
                          className="w-full pl-2 pr-6 py-1.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-xs font-bold outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Medical">Medical</option>
                          <option value="Exempted">Exempted</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-455 absolute right-2 top-2 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative">
                        <input 
                          type="number"
                          ref={el => { inputRefs.current[row.student_id] = el; }}
                          min="0"
                          max={test.total_marks}
                          value={row.marks_obtained}
                          onChange={(e) => handleMarksChange(globalIdx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          disabled={isAbsent || isTestLocked}
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs outline-none focus:border-primary font-bold ${
                            isAbsent
                              ? "bg-slate-150 dark:bg-slate-850 cursor-not-allowed opacity-50"
                              : "bg-white dark:bg-slate-900"
                          } ${hasError ? "border-rose-500 focus:border-rose-500 bg-rose-50/20 text-rose-700" : "border-border text-slate-850 dark:text-slate-200"}`}
                          placeholder={isAbsent ? "DISABLED" : "Score"}
                        />
                        {hasError && (
                          <div className="absolute -bottom-1 -right-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-205 px-1 rounded shadow-xs">
                            Exceeds total
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <input 
                        type="number"
                        value={test.total_marks}
                        disabled
                        className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs outline-none bg-slate-100 dark:bg-slate-800/40 text-slate-400 font-bold cursor-not-allowed"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${
                        grade === 'F' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-indigo-50 text-indigo-750 border-indigo-200'
                      }`}>
                        {grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        level === "Excellent"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                          : level === "Good"
                          ? "bg-indigo-50 text-indigo-750 border-indigo-250"
                          : level === "Average"
                          ? "bg-amber-50 text-amber-700 border-amber-250"
                          : level === "Needs Improvement"
                          ? "bg-rose-50 text-rose-755 border-rose-250"
                          : "bg-slate-100 text-slate-500 border-border"
                      }`}>
                        {level}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <input 
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleRemarksChange(globalIdx, e.target.value)}
                        disabled={isTestLocked}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary text-slate-800 dark:text-slate-200"
                        placeholder="Optional comments..."
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BULK MATCH PASTE POPUP ── */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsBulkOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col z-50 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-primary" />
                <span>Spreadsheet Column Mapper</span>
              </h3>
              <button onClick={() => setIsBulkOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                <XCircle className="w-5 h-5 text-slate-450" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border border-border rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-350">
                <p className="font-bold text-slate-800 dark:text-slate-200">Copy format guidelines:</p>
                <p>1. Excel Column 1: Roll No or Admission No.</p>
                <p>2. Excel Column 2: Obtained Marks.</p>
                <p>3. Paste below to match students dynamically.</p>
              </div>

              <textarea
                placeholder="RollNo&#9;Marks&#10;1&#9;15&#10;2&#9;18..."
                rows={8}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono outline-none focus:border-primary bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150"
              />

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-55 bg-white cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseClipboard}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm animate-pulse"
                >
                  Confirm and Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT TRAILS DRAWER ── */}
      {isAuditOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsAuditOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border-l border-border w-full max-w-lg h-full z-50 flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-250 text-left">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <span>Audits Ledger History</span>
              </h3>
              <button onClick={() => setIsAuditOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                <XCircle className="w-5 h-5 text-slate-450" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingAudit ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-bold text-slate-400">Loading ledger logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center text-slate-450 py-20 font-bold text-xs">
                  No modification records exist for this assessment.
                </div>
              ) : (
                <div className="space-y-4 font-semibold text-xs text-slate-750">
                  {auditLogs.map((log) => (
                    <div key={log._id} className="bg-slate-50 dark:bg-slate-800/40 p-4 border border-border rounded-xl space-y-2 relative text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            Student: {log.student_id?.name || "Student"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Roll No: {log.student_id?.roll_no || "N/A"}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase border ${
                          log.action_type === "create"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                            : "bg-indigo-50 text-indigo-755 border-indigo-250"
                        }`}>
                          {log.action_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-[10px] text-slate-455 block font-semibold">Previous Marks</span>
                          <span className="font-bold font-mono">{log.previous_marks}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-455 block font-semibold">New Marks</span>
                          <span className="font-bold font-mono text-indigo-650 dark:text-indigo-400">{log.new_marks}</span>
                        </div>
                      </div>

                      <div className="text-[11px] pt-1 italic text-slate-500">
                        Reason: "{log.reason || "Updated manually"}"
                      </div>

                      <div className="h-px bg-border my-2" />

                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Changed By: {log.changed_by?.name || "Admin"}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-950/20 flex justify-end">
              <button
                onClick={() => setIsAuditOpen(false)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-100 bg-white cursor-pointer text-slate-750"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success & Error notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toastSuccess && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
            <CheckCircle className="w-4 h-4 shrink-0 stroke-[3]" />
            <span className="text-xs font-bold">{toastSuccess}</span>
          </div>
        )}
        {toastError && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[3]" />
            <span className="text-xs font-bold">{toastError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
