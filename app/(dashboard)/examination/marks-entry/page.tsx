"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, Save, Loader2, RefreshCw } from "lucide-react";
import { useExams } from "@/app/hooks/useExams";
import { useClasses } from "@/app/hooks/useClasses";
import { useSubjects } from "@/app/hooks/useSubjects";
import { useStudents } from "@/app/hooks/useStudents";
import { useResults, CreateResultInput } from "@/app/hooks/useResults";


// Helper to resolve an ID
function resolveId(field: { _id: string } | string | undefined): string {
  if (!field) return "";
  return typeof field === "object" ? field._id : field;
}

export default function MarksEntryPage() {
  const { exams } = useExams();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { results, fetchResults, createResult } = useResults();

  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter exams by selected class
  const classExams = useMemo(() => {
    if (!selectedClassId) return exams;
    return exams.filter(e => resolveId(e.class_id) === selectedClassId);
  }, [exams, selectedClassId]);

  // Fetch subjects for the selected class dynamically
  const { subjects, loading: loadingSubjects } = useSubjects(selectedClassId || undefined);

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
  // Record key: student_id
  const [marksData, setMarksData] = useState<Record<string, { marks_obtained: string, total_marks: string, remarks: string }>>({});

  // When selected exam/class/subject changes, pre-fill marksData with existing results
  useEffect(() => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      setMarksData({});
      return;
    }

    const selectedSubject = subjects.find(s => s._id === selectedSubjectId);
    const defaultTotal = selectedSubject?.full_marks?.toString() || "100";

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
          marks_obtained: existing.marks_obtained.toString(),
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
  }, [selectedExamId, selectedClassId, selectedSubjectId, classStudents, results, subjects]);

  const handleMarksChange = (studentId: string, field: "marks_obtained" | "total_marks" | "remarks", value: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      alert("Please select an Exam, Class, and Subject.");
      return;
    }

    const selectedSubject = subjects.find(s => s._id === selectedSubjectId);
    const passingMarks = selectedSubject?.pass_marks || 35;

    // Collect all valid entries (where marks are actually entered)
    const entriesToSave: CreateResultInput[] = [];

    for (const student of classStudents) {
      const data = marksData[student._id];
      if (data && data.marks_obtained.trim() !== "" && data.total_marks.trim() !== "") {
        entriesToSave.push({
          exam_id: selectedExamId,
          class_id: selectedClassId, // Not strictly required by result schema, but good for tracking if added later
          student_id: student._id,
          subject_id: selectedSubjectId,
          marks_obtained: Number(data.marks_obtained),
          total_marks: Number(data.total_marks),
          passing_marks: passingMarks,
          remarks: data.remarks
        } as CreateResultInput);
      }
    }

    if (entriesToSave.length === 0) {
      alert("No marks entered to save.");
      return;
    }

    setSaving(true);
    const res = await createResult(entriesToSave);
    setSaving(false);

    if (res.success) {
      alert(res.message);
      fetchResults(); // Refresh results in the background
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Subject-wise Marks Entry</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/examination" className="hover:text-primary">Examination</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Marks Entry</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => window.location.reload()} 
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || !selectedExamId || !selectedClassId || !selectedSubjectId || filteredStudents.length === 0}
            className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            Save Marks
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Exam</option>
              {classExams.map(e => {
                const className = typeof e.class_id === "object" ? `${e.class_id?.name || ""} ${e.class_id?.section || ""}` : "";
                return (
                  <option key={e._id} value={e._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {e.name} {className ? `(${className})` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSubjectId(""); // Reset subject when class changes
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Class</option>
              {classes.map(c => (
                <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.name} — {c.section}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={!selectedClassId || loadingSubjects}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{loadingSubjects ? "Loading..." : "Select Subject"}</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {s.name} ({s.type === 'both' ? 'Theory + Practical' : s.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Controls Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            <span>Showing</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredStudents.length}</span>
            <span>students</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or roll no..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-16">Roll No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-32">Marks Obtained</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-32">Total Marks</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(!selectedExamId || !selectedClassId || !selectedSubjectId) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    Please select an Exam, Class, and Subject to enter marks.
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    No students found in this class.
                  </td>
                </tr>
              ) : filteredStudents.map((student) => {
                const data = marksData[student._id] || { marks_obtained: "", total_marks: "", remarks: "" };
                return (
                  <tr key={student._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{student.roll_no || "—"}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{student.name}</td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        min="0"
                        value={data.marks_obtained}
                        onChange={(e) => handleMarksChange(student._id, "marks_obtained", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
                        placeholder="e.g. 85"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        min="0"
                        value={data.total_marks}
                        onChange={(e) => handleMarksChange(student._id, "total_marks", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="text"
                        value={data.remarks}
                        onChange={(e) => handleMarksChange(student._id, "remarks", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
                        placeholder="Optional remarks"
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
