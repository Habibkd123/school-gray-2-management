"use client";

import React, { useState } from "react";
import { useResults } from "../../hooks/useResults";
import { useStudents } from "../../hooks/useStudents";
import { useClasses } from "../../hooks/useClasses";
import { useExams } from "../../hooks/useExams";
import { useSubjects } from "../../hooks/useSubjects";
import { Modal } from "../../components/ui/modal";
import {
  ClipboardList,
  Plus,
  TrendingUp,
  Award,
  CheckCircle,
  FileText,
  Bookmark,
  Users,
  Loader2
} from "lucide-react";

export default function ResultsPage() {
  const { results, isLoading: resultsLoading, createResult } = useResults();
  const { students } = useStudents();
  const { classes } = useClasses();
  const { exams } = useExams();
  const { subjects } = useSubjects();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [marksObtained, setMarksObtained] = useState(85);
  const [totalMarks, setTotalMarks] = useState(100);
  const [grade, setGrade] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !selectedStudentId || !selectedSubjectId) return;
    setIsSubmitting(true);
    const res = await createResult({
      exam_id: selectedExamId,
      student_id: selectedStudentId,
      subject_id: selectedSubjectId,
      marks_obtained: marksObtained,
      total_marks: totalMarks,
      passing_marks: Math.round(totalMarks * 0.33),
      grade: grade || undefined,
    });
    setIsSubmitting(false);
    if (res.success) {
      setIsAddOpen(false);
      setSelectedExamId("");
      setSelectedStudentId("");
      setSelectedSubjectId("");
      setMarksObtained(85);
      setTotalMarks(100);
      setGrade("");
    } else {
      alert(res.message);
    }
  };

  const getStudentName = (sid: any) => {
    if (typeof sid === "object" && sid?.name) return sid.name;
    return students.find(s => s._id === sid)?.name || "Unknown";
  };

  const getSubjectName = (subId: any) => {
    if (typeof subId === "object" && subId?.name) return subId.name;
    return subjects.find(s => s._id === subId)?.name || "Unknown";
  };

  const getExamName = (eid: any) => {
    if (typeof eid === "object" && eid?.name) return eid.name;
    return exams.find(e => e._id === eid)?.name || "Unknown";
  };

  const letterRating = (percent: number) => {
    if (percent >= 90) return { text: "A", class: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    if (percent >= 80) return { text: "B", class: "bg-teal-50 text-teal-700 border border-teal-200" };
    if (percent >= 70) return { text: "C", class: "bg-amber-50 text-amber-700 border border-amber-200" };
    if (percent >= 60) return { text: "D", class: "bg-orange-50 text-orange-700 border border-orange-200" };
    return { text: "F", class: "bg-rose-50 text-rose-700 border border-rose-200" };
  };

  const passCount = results.filter(r => r.is_pass !== false).length;
  const avgPercent = results.length > 0
    ? Math.round(results.reduce((acc, r) => acc + (r.marks_obtained / r.total_marks) * 100, 0) / results.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="page-title">Exam Gradebook</h1>
          <p className="page-desc mt-1">Browse exam term ratings, transcript evaluation logs, and GPA records.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Post Marks</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Entries</span>
            <span className="section-title block mt-0.5">{results.length}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Average Score</span>
            <span className="section-title block mt-0.5">{avgPercent}%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Passed</span>
            <span className="section-title block mt-0.5">{passCount} / {results.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left">
        <div className="px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Institutional Gradebook Logs</h2>
        </div>
        {resultsLoading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading results...</span>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-slate-900">
            <table className="erp-table">
              <thead>
                <tr className="border-b border-border bg-white dark:bg-slate-900 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="px-6 py-4 text-left">Student</th>
                  <th className="px-6 py-4 text-left">Subject</th>
                  <th className="px-6 py-4 text-left">Exam</th>
                  <th className="px-6 py-4 text-left">Score</th>
                  <th className="px-6 py-4 text-left">Grade</th>
                  <th className="px-6 py-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[13px]">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No grade evaluations recorded yet. Use &ldquo;Post Marks&rdquo; to begin.
                    </td>
                  </tr>
                ) : (
                  results.map((result) => {
                    const percent = Math.round((result.marks_obtained / result.total_marks) * 100);
                    const rate = result.grade
                      ? { text: result.grade, class: "bg-indigo-50 text-indigo-700 border border-indigo-200" }
                      : letterRating(percent);
                    return (
                      <tr key={result._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{getStudentName(result.student_id)}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getSubjectName(result.subject_id)}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getExamName(result.exam_id)}</td>
                        <td className="px-6 py-4 font-sans font-semibold text-slate-700 dark:text-slate-200">
                          {result.marks_obtained} / {result.total_marks}
                          <span className="text-slate-400 text-[11px] ml-1">({percent}%)</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${rate.class}`}>
                            {rate.text}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {result.is_pass === false ? (
                            <span className="px-2.5 py-1 rounded-md font-bold text-[11px] bg-rose-50 text-rose-700 border border-rose-200">Fail</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">Pass</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Post Marks Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Post Exam Marks">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Exam</label>
              <select
                required
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm cursor-pointer"
              >
                <option value="">Select Exam</option>
                {exams.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Student</label>
              <select
                required
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm cursor-pointer"
              >
                <option value="">Select Student</option>
                {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.roll_no || "—"})</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Subject</label>
            <select
              required
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm cursor-pointer"
            >
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Marks Obtained</label>
              <input
                required type="number" min={0} value={marksObtained}
                onChange={e => setMarksObtained(Number(e.target.value))}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Total Marks</label>
              <input
                required type="number" min={1} value={totalMarks}
                onChange={e => setTotalMarks(Number(e.target.value))}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Grade (optional)</label>
              <input
                type="text" placeholder="e.g. A+" value={grade}
                onChange={e => setGrade(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Post Grades
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
