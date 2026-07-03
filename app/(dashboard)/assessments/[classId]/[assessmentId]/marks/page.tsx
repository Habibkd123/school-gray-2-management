"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  ArrowLeft, BookOpen, Loader2, Save, CheckCircle, AlertCircle, AlertTriangle,
} from "lucide-react";

interface MarkRow {
  student_id: string;
  name: string;
  roll_no: string;
  admission_no: string;
  marks_obtained: number | "";
  is_pass: boolean | null;
  remarks: string;
  has_entry: boolean;
}

export default function MarksEntryPage({ params }: { params: Promise<{ classId: string; assessmentId: string }> }) {
  const { classId, assessmentId } = React.use(params);
  const router = useRouter();
  const [test, setTest] = useState<any>(null);
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`/api/assessments/${assessmentId}/marks`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          setTest(data.data.test);
          setRows(data.data.rows.map((r: any) => ({
            ...r,
            marks_obtained: r.marks_obtained ?? "",
            remarks: r.remarks || "",
          })));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetch_();
  }, [assessmentId]);

  const updateMarks = (idx: number, value: string) => {
    const newRows = [...rows];
    const numVal = value === "" ? "" : Number(value);
    const errKey = newRows[idx].student_id;

    if (numVal !== "" && test && Number(numVal) > test.total_marks) {
      setErrors((e) => ({ ...e, [errKey]: `Cannot exceed ${test.total_marks}` }));
    } else {
      setErrors((e) => { const n = { ...e }; delete n[errKey]; return n; });
    }

    newRows[idx] = {
      ...newRows[idx],
      marks_obtained: numVal,
      is_pass: numVal !== "" && test ? Number(numVal) >= test.passing_marks : null,
    };
    setRows(newRows);
  };

  const updateRemarks = (idx: number, value: string) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], remarks: value };
    setRows(newRows);
  };

  const handleSave = async () => {
    if (Object.keys(errors).length > 0) {
      showToast("error", "Please fix validation errors before saving");
      return;
    }

    const entries = rows
      .filter((r) => r.marks_obtained !== "")
      .map((r) => ({
        student_id: r.student_id,
        marks_obtained: r.marks_obtained,
        remarks: r.remarks || "",
      }));

    if (entries.length === 0) {
      showToast("error", "Please enter marks for at least one student");
      return;
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
        showToast("success", data.message || "Marks saved successfully!");
        // Refresh to get has_entry updated
        const refresh = await fetch(`/api/assessments/${assessmentId}/marks`, { headers: getAuthHeaders() });
        const refreshData = await refresh.json();
        if (refreshData.success) {
          setRows(refreshData.data.rows.map((r: any) => ({
            ...r,
            marks_obtained: r.marks_obtained ?? "",
            remarks: r.remarks || "",
          })));
        }
      } else {
        showToast("error", data.message || "Failed to save marks");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const enteredCount = rows.filter((r) => r.marks_obtained !== "").length;
  const passCount = rows.filter((r) => r.is_pass === true).length;
  const failCount = rows.filter((r) => r.is_pass === false).length;

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertTriangle className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">Test not found</p>
        <Link href={`/assessments/${classId}`} className="mt-4 text-[13px] text-primary hover:underline">← Back to Tests</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium ${
          toast.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
            : "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Marks Entry
          </h1>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            {test.title} · Total Marks: <strong>{test.total_marks}</strong> · Pass: <strong>{test.passing_marks}</strong>
          </p>
        </div>
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-70 shadow-sm cursor-pointer">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Marks
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Progress: <span className="text-primary">{enteredCount}</span> / {rows.length} students
          </p>
          <div className="flex items-center gap-4 text-[12px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Pass: {passCount}</span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">✗ Fail: {failCount}</span>
          </div>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${rows.length > 0 ? (enteredCount / rows.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl overflow-hidden shadow-sm">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">No students found in this class</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-16">Roll No</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-36">Obtained Marks</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-24">Result</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, idx) => {
                  const hasError = !!errors[row.student_id];
                  return (
                    <tr key={row.student_id}
                      className={`transition-colors ${row.has_entry ? "bg-emerald-50/30 dark:bg-emerald-500/5" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"}`}>
                      <td className="px-4 py-2.5 text-[13px] text-slate-500 dark:text-slate-400">
                        {row.roll_no || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{row.name}</p>
                        <p className="text-[11px] text-slate-400">{row.admission_no}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={test.total_marks}
                            value={row.marks_obtained}
                            onChange={(e) => updateMarks(idx, e.target.value)}
                            placeholder={`/ ${test.total_marks}`}
                            className={`w-32 px-3 py-2 rounded-lg border text-[13px] font-medium outline-none transition-colors text-center ${
                              hasError
                                ? "border-rose-300 dark:border-rose-500 focus:border-rose-400 bg-rose-50 dark:bg-rose-500/10"
                                : "border-border focus:border-primary bg-white dark:bg-slate-800"
                            } text-slate-800 dark:text-slate-200`}
                          />
                          {hasError && (
                            <p className="text-[10px] text-rose-500 mt-1">{errors[row.student_id]}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {row.is_pass === true && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            ✓ Pass
                          </span>
                        )}
                        {row.is_pass === false && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            ✗ Fail
                          </span>
                        )}
                        {row.is_pass === null && (
                          <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => updateRemarks(idx, e.target.value)}
                          placeholder="Optional remarks..."
                          className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-[12px] text-slate-600 dark:text-slate-400 outline-none focus:border-primary transition-colors placeholder:text-slate-300"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Save */}
      {rows.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-70 shadow-sm cursor-pointer">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Marks
          </button>
        </div>
      )}
    </div>
  );
}
