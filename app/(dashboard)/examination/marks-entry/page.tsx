"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Save, Loader2, RefreshCw, ArrowLeft, CheckCircle, FileText, ChevronDown } from "lucide-react";
import { useExams } from "@/app/hooks/useExams";
import { useClasses } from "@/app/hooks/useClasses";
import { useSubjects } from "@/app/hooks/useSubjects";
import { useStudents } from "@/app/hooks/useStudents";
import { useResults } from "@/app/hooks/useExams"; // useResults is exported from useExams.ts
import { useExamSchedule } from "@/app/hooks/useExamSchedule";

function resolveId(field: { _id: string } | string | undefined): string {
  if (!field) return "";
  return typeof field === "object" ? field._id : field;
}

export default function MarksEntryPage() {
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get("exam_id") || "";

  const { exams } = useExams();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { results, fetchResults, createResults } = useResults();

  const [selectedExamId, setSelectedExamId] = useState(examIdParam);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync selected exam from URL query parameter
  useEffect(() => {
    if (examIdParam) setSelectedExamId(examIdParam);
  }, [examIdParam]);

  // When selected exam changes, auto-resolve class_id
  useEffect(() => {
    if (selectedExamId) {
      const ex = exams.find(e => e._id === selectedExamId);
      if (ex) {
        const clsId = resolveId(ex.class_id);
        if (clsId) setSelectedClassId(clsId);
      }
    }
  }, [selectedExamId, exams]);

  // Fetch subjects for the selected class dynamically
  const { subjects, loading: loadingSubjects } = useSubjects(selectedClassId || undefined);

  // Fetch schedules for the selected exam to get max_marks and passing_marks
  const { schedules, loading: loadingSchedules } = useExamSchedule(selectedExamId || undefined);

  const activeSchedule = useMemo(() => {
    if (!selectedSubjectId || schedules.length === 0) return null;
    return schedules.find(s => resolveId(s.subject_id) === selectedSubjectId);
  }, [selectedSubjectId, schedules]);

  const maxMarksForSubject = useMemo(() => {
    if (activeSchedule) return activeSchedule.max_marks;
    const sub = subjects.find(s => s._id === selectedSubjectId);
    return sub?.full_marks || 100;
  }, [activeSchedule, selectedSubjectId, subjects]);

  const passingMarksForSubject = useMemo(() => {
    if (activeSchedule) return activeSchedule.passing_marks;
    const sub = subjects.find(s => s._id === selectedSubjectId);
    return sub?.pass_marks || 33;
  }, [activeSchedule, selectedSubjectId, subjects]);

  // Filter students by selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => resolveId(s.class_id) === selectedClassId && s.is_active !== false);
  }, [students, selectedClassId]);

  // Apply search
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.roll_no || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classStudents, searchTerm]);

  // Local state to track marks being entered
  const [marksData, setMarksData] = useState<Record<string, { marks_obtained: string, total_marks: string, remarks: string }>>({});

  // When selected exam/class/subject changes, pre-fill marksData with existing results
  useEffect(() => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      setMarksData({});
      return;
    }

    const defaultTotal = maxMarksForSubject.toString();
    const newMarksData: Record<string, { marks_obtained: string, total_marks: string, remarks: string }> = {};

    classStudents.forEach(student => {
      // Find existing result
      const existing = results.find(r => 
        resolveId(r.exam_id) === selectedExamId && 
        resolveId(r.subject_id) === selectedSubjectId &&
        resolveId(r.student_id) === student._id
      );

      if (existing) {
        newMarksData[student._id] = {
          marks_obtained: existing.marks_obtained !== undefined ? existing.marks_obtained.toString() : (existing.obtained_marks !== undefined ? existing.obtained_marks.toString() : ""),
          total_marks: existing.total_marks.toString(),
          remarks: existing.remarks || ""
        };
      } else {
        newMarksData[student._id] = {
          marks_obtained: "",
          total_marks: defaultTotal,
          remarks: ""
        };
      }
    });

    setMarksData(newMarksData);
  }, [selectedExamId, selectedClassId, selectedSubjectId, classStudents, results, maxMarksForSubject]);

  const handleMarksChange = (studentId: string, field: "marks_obtained" | "total_marks" | "remarks", value: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // Auto-calculation helpers
  const calculateGradeAndResult = (obtainedStr: string, totalStr: string) => {
    const obtained = Number(obtainedStr);
    const total = Number(totalStr);

    if (obtainedStr.trim() === "" || isNaN(obtained) || isNaN(total) || total <= 0) {
      return { grade: "—", isPass: false, resultLabel: "—" };
    }

    const percentage = (obtained / total) * 100;
    let grade = "F";
    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B";
    else if (percentage >= 60) grade = "C";
    else if (percentage >= 50) grade = "D";
    else if (percentage >= 40) grade = "E";

    const isPass = obtained >= passingMarksForSubject;
    return { grade, isPass, resultLabel: isPass ? "Pass" : "Fail" };
  };

  const handleSaveMarks = async (status: "draft" | "final") => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      alert("Please select an Exam, Class, and Subject.");
      return;
    }

    // Collect and validate entries
    const entriesToSave: any[] = [];
    const validationErrors: string[] = [];

    for (const student of classStudents) {
      const data = marksData[student._id];
      if (data && data.marks_obtained.trim() !== "") {
        const obtained = Number(data.marks_obtained);
        const total = Number(data.total_marks);

        if (obtained < 0) {
          validationErrors.push(`Marks for ${student.name} cannot be negative.`);
        }
        if (obtained > total) {
          validationErrors.push(`Marks for ${student.name} (${obtained}) cannot exceed Maximum Marks (${total}).`);
        }

        const { grade } = calculateGradeAndResult(data.marks_obtained, data.total_marks);

        entriesToSave.push({
          exam_id: selectedExamId,
          class_id: selectedClassId,
          student_id: student._id,
          subject_id: selectedSubjectId,
          marks_obtained: obtained,
          total_marks: total,
          passing_marks: passingMarksForSubject,
          grade,
          remarks: data.remarks,
          status
        });
      }
    }

    if (validationErrors.length > 0) {
      alert(validationErrors.join("\n"));
      return;
    }

    if (entriesToSave.length === 0) {
      alert("No marks entered to save.");
      return;
    }

    setSaving(true);
    const res = await createResults(entriesToSave);
    setSaving(false);

    if (res.success) {
      alert(status === "draft" ? "Marks draft saved successfully!" : "Final marks submitted successfully!");
      fetchResults();
    } else {
      alert(res.message || "Failed to save marks.");
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/examination/exam" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 mr-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Marks Entry</h1>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 pl-8">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/examination/exam" className="hover:text-primary">Examination</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Marks Entry</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => fetchResults()} 
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button 
            onClick={() => handleSaveMarks("draft")}
            disabled={saving || !selectedExamId || !selectedClassId || !selectedSubjectId || filteredStudents.length === 0}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} 
            Save Draft
          </button>

          <button 
            onClick={() => handleSaveMarks("final")}
            disabled={saving || !selectedExamId || !selectedClassId || !selectedSubjectId || filteredStudents.length === 0}
            className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
            Submit Final Marks
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-5 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam</label>
            <div className="relative">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-border rounded-lg text-[13px] outline-none focus:border-primary appearance-none cursor-pointer"
              >
                <option value="">Select Exam</option>
                {exams.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.name} {typeof e.class_id === "object" ? `(${e.class_id?.name || ""} ${e.class_id?.section || ""})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSubjectId(""); 
                }}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-border rounded-lg text-[13px] outline-none focus:border-primary appearance-none cursor-pointer"
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} — {c.section}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Subject</label>
            <div className="relative">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassId || loadingSubjects}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-border rounded-lg text-[13px] outline-none focus:border-primary appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">{loadingSubjects ? "Loading..." : "Select Subject"}</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.type === 'both' ? 'Theory + Practical' : s.type})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Controls Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4 text-[13px] text-slate-500 dark:text-slate-400">
            <span>Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredStudents.length}</span> students</span>
            {selectedSubjectId && (
              <span className="text-[12px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                Max Marks: {maxMarksForSubject} | Passing Marks: {passingMarksForSubject}
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or roll no..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-4 py-3.5 text-left font-bold text-slate-700 dark:text-slate-200 w-20">Roll No</th>
                <th className="px-4 py-3.5 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                <th className="px-4 py-3.5 text-left font-bold text-slate-700 dark:text-slate-200 w-44">Marks Obtained</th>
                <th className="px-4 py-3.5 text-left font-bold text-slate-700 dark:text-slate-200 w-32">Max Marks</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-700 dark:text-slate-200 w-24">Grade</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-700 dark:text-slate-200 w-24">Result</th>
                <th className="px-4 py-3.5 text-left font-bold text-slate-700 dark:text-slate-200 w-64">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(!selectedExamId || !selectedClassId || !selectedSubjectId) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    Please select an Exam, Class, and Subject above to enter marks.
                  </td>
                </tr>
              ) : (loadingSubjects || loadingSchedules) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-[13px]">Loading details...</p>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    No students found in this class.
                  </td>
                </tr>
              ) : filteredStudents.map((student) => {
                const data = marksData[student._id] || { marks_obtained: "", total_marks: maxMarksForSubject.toString(), remarks: "" };
                const { grade, resultLabel, isPass } = calculateGradeAndResult(data.marks_obtained, data.total_marks);

                return (
                  <tr key={student._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-350">{student.roll_no || "—"}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{student.name}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        min="0"
                        max={data.total_marks}
                        value={data.marks_obtained}
                        onChange={(e) => handleMarksChange(student._id, "marks_obtained", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 font-semibold"
                        placeholder="Enter Marks"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        min="1"
                        value={data.total_marks}
                        onChange={(e) => handleMarksChange(student._id, "total_marks", e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        disabled
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${grade === 'F' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-primary/10 text-primary dark:bg-primary/20'}`}>
                        {grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {resultLabel === "—" ? (
                        <span className="text-slate-400">—</span>
                      ) : isPass ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450">
                          Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450">
                          Fail
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="text"
                        value={data.remarks}
                        onChange={(e) => handleMarksChange(student._id, "remarks", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100"
                        placeholder="Optional Remarks"
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
