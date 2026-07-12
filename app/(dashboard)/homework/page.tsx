"use client";

import React, { useState, useEffect } from "react";
import { useClasses } from "../../hooks/useClasses";
import { useStudents } from "../../hooks/useStudents";
import { useHomework, ApiHomework } from "../../hooks/useHomework";
import { useAuth } from "../../context/auth";
import { Modal } from "../../components/ui/modal";
import { validateSequential } from "@/lib/utils/formValidation";
import { PaginationBar } from "../../components/ui/pagination-bar";
import {
  BookOpen, Plus, Calendar, ClipboardCheck, CheckCircle2,
  AlertCircle, FileText, User, GraduationCap, MessageSquare, Loader2
} from "lucide-react";

// Map DB roles → UI role key
function mapRole(role?: string): "admin" | "teacher" | "student" {
  if (role === "school_admin" || role === "super_admin") return "admin";
  if (role === "teacher") return "teacher";
  return "student";
}

export default function HomeworkPage() {
  const { user } = useAuth();
  const activeRole = mapRole(user?.role);
  const isStudent = activeRole === "student";

  const { classes, isLoading: classesLoading } = useClasses();
  // Only fetch students when the viewer is a student (to get their own class info).
  // Admins/teachers don't need the student list — submission data is already populated.
  const { students, isLoading: studentsLoading } = useStudents({ skip: !isStudent });

  // For student role: the API returns only their own record, so students[0] is them.
  const activeStudent = isStudent ? students[0] : undefined;

  const activeStudentClassId = activeStudent
    ? (typeof activeStudent.class_id === "object" ? activeStudent.class_id._id : activeStudent.class_id)
    : undefined;

  // Fetch homework assignments
  const {
    homework,
    isLoading: homeworkLoading,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    createHomework,
    submitHomework,
    gradeHomework,
    deleteHomework
  } = useHomework(activeRole === "student" ? activeStudentClassId : undefined);

  // Dialog controllers
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isGradeOpen, setIsGradeOpen] = useState(false);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("English");
  const [dueDate, setDueDate] = useState("2026-06-12");

  // Selection states
  const [selectedHwId, setSelectedHwId] = useState("");
  const [valErrors, setValErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [submissionContent, setSubmissionContent] = useState("");
  const [grade, setGrade] = useState("A");
  const [feedback, setFeedback] = useState("");

  // Default class selection
  useEffect(() => {
    if (classes.length > 0 && !classId) {
      setClassId(classes[0]._id);
    }
  }, [classes, classId]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const fieldsToValidate = [
      { id: "title", value: title, label: "Title" },
      { id: "description", value: description, label: "Description" },
      { id: "classId", value: classId, label: "Class Target" },
      { id: "subject", value: subject, label: "Subject" },
      { id: "dueDate", value: dueDate, label: "Due Date" }
    ];

    const valResult = validateSequential(fieldsToValidate);
    if (!valResult.isValid) {
      setValErrors({ [valResult.fieldId!]: valResult.error! });
      setFormError(valResult.error!);
      return;
    }
    setValErrors({});

    const res = await createHomework({
      title,
      description,
      classId,
      subject,
      dueDate
    });
    if (res.success) {
      setTitle("");
      setDescription("");
      setIsAddOpen(false);
    } else {
      setFormError(res.message || "Failed to assign homework");
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!activeStudent) return;

    const fieldsToValidate = [
      { id: "submissionContent", value: submissionContent, label: "Your Response / Essay" }
    ];

    const valResult = validateSequential(fieldsToValidate);
    if (!valResult.isValid) {
      setValErrors({ [valResult.fieldId!]: valResult.error! });
      setFormError(valResult.error!);
      return;
    }
    setValErrors({});

    const res = await submitHomework(selectedHwId, activeStudent._id, submissionContent);
    if (res.success) {
      setSubmissionContent("");
      setIsSubmitOpen(false);
    } else {
      setFormError(res.message || "Failed to submit response");
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const fieldsToValidate = [
      { id: "grade", value: grade, label: "Award Grade" },
      { id: "feedback", value: feedback, label: "Evaluation Comments" }
    ];

    const valResult = validateSequential(fieldsToValidate);
    if (!valResult.isValid) {
      setValErrors({ [valResult.fieldId!]: valResult.error! });
      setFormError(valResult.error!);
      return;
    }
    setValErrors({});

    const res = await gradeHomework(selectedHwId, selectedStudentId, grade, feedback);
    if (res.success) {
      setGrade("A");
      setFeedback("");
      setIsGradeOpen(false);
    } else {
      setFormError(res.message || "Failed to submit evaluation");
    }
  };

  const handleDelete = async (hwId: string) => {
    if (confirm("Are you sure you want to delete this homework assignment?")) {
      const res = await deleteHomework(hwId);
      if (!res.success) {
        alert(res.message || "Failed to delete");
      }
    }
  };

  const getClassName = (cId: string | { _id: string; name: string; section?: string }) => {
    const id = typeof cId === "object" ? cId._id : cId;
    const match = classes.find((c) => c._id === id);
    return match ? `${match.name} - ${match.section}` : "Unknown";
  };

  const getStudentName = (sId: string) => {
    return students.find((s) => s._id === sId)?.name || "Unknown Student";
  };

  const getSubmissionStatus = (hw: ApiHomework, studentId: string) => {
    const sub = hw.submissions.find((s) => {
      const sId = typeof s.student_id === "object" ? s.student_id._id : s.student_id;
      return sId === studentId;
    });
    if (!sub) return { text: "Pending", class: "bg-amber-50 text-amber-700 border border-amber-200" };
    if (sub.grade) return { text: `Graded (${sub.grade})`, class: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    return { text: "Submitted", class: "bg-indigo-50 text-indigo-700 border border-indigo-200" };
  };

  const activeHw = homework.find((h) => h._id === selectedHwId);
  const isLoading = classesLoading || studentsLoading || homeworkLoading;
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  useEffect(() => {
    if (!isLoading && isInitialLoad) setIsInitialLoad(false);
  }, [isLoading]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {activeRole === "student" ? "My Homework Assignments" : "Homework Manager"}
          </h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span>Academic</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Homework</span>
          </div>
        </div>

        {activeRole !== "student" && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Homework List Grid */}
      <div className={`space-y-6 relative transition-opacity duration-200 ${isLoading && !isInitialLoad ? "opacity-60 pointer-events-none" : ""}`}>
        {isLoading && isInitialLoad ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>Loading homework registers...</span>
          </div>
        ) : (
          <>
            {isLoading && !isInitialLoad && (
              <div className="absolute top-2 right-0 z-10 flex items-center gap-2 text-[12px] font-medium text-slate-500 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-md border border-border shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Syncing...</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {homework.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">
                  No homework assignments found.
                </div>
              ) : (
                homework.map((hw) => {
                  const hwClassId = typeof hw.class_id === "object" ? hw.class_id._id : hw.class_id;

                  // For students, filter homework that is not assigned to their class
                  if (activeRole === "student" && hwClassId !== activeStudentClassId) return null;

                  const submission = hw.submissions.find((s) => {
                    const sId = typeof s.student_id === "object" ? s.student_id._id : s.student_id;
                    return sId === (activeStudent?._id || "");
                  });
                  const studentStatus = activeStudent ? getSubmissionStatus(hw, activeStudent._id) : { text: "Pending", class: "" };

                  const subjectName = typeof hw.subject_id === "object" ? hw.subject_id.name : hw.subject_id;

                  return (
                    <div
                      key={hw._id}
                      className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow transition-all flex flex-col justify-between text-left h-full"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-border px-2.5 py-1 rounded-md">
                            {subjectName || "Subject"} • {getClassName(hw.class_id)}
                          </span>
                          {activeRole === "student" ? (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${studentStatus.class}`}>
                              {studentStatus.text}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-full">
                              {hw.submissions.length} Submissions
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-semibold text-[15px] text-slate-900 dark:text-white leading-tight">
                            {hw.title}
                          </h3>
                          <p className="card-subtitle text-[13px] line-clamp-3">
                            {hw.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-sans text-[11px] font-bold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>Due: {new Date(hw.due_date).toLocaleDateString()}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {activeRole !== "student" && (
                            <button
                              onClick={() => handleDelete(hw._id)}
                              className="px-2.5 py-2 text-[12px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          )}

                          {/* Role Specific Actions */}
                          {activeRole === "student" ? (
                            !submission ? (
                              <button
                                onClick={() => {
                                  setSelectedHwId(hw._id);
                                  setIsSubmitOpen(true);
                                }}
                                className="px-3.5 py-2 text-[12px] font-bold text-white bg-primary hover:bg-[var(--primary-hover)] rounded-lg shadow-sm transition-colors cursor-pointer"
                              >
                                Submit Work
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedHwId(hw._id);
                                  setIsSubmissionsOpen(true);
                                }}
                                className="px-3.5 py-2 text-[12px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-border rounded-lg shadow-sm transition-colors cursor-pointer"
                              >
                                View Submission
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedHwId(hw._id);
                                setIsSubmissionsOpen(true);
                              }}
                              className="px-3.5 py-2 text-[12px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-border rounded-lg shadow-sm transition-colors cursor-pointer"
                            >
                              Submissions List ({hw.submissions.length})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              isLoading={homeworkLoading}
            />
          </>
        )}
      </div>

      {/* ----------------------------------------------------
          CREATE ASSIGNMENT MODAL
          ---------------------------------------------------- */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Homework Assignment">
        <form onSubmit={handleAddSubmit} noValidate className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-2.5 text-rose-600 dark:text-rose-400 text-[12px] font-semibold">
              <span>⚠️ {formError}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Assignment Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Shakespearean Drama Analysis"
              className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none transition-all shadow-sm ${valErrors.title ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                }`}
            />
            {valErrors.title && (
              <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
                ❌ {valErrors.title}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Task Details & Description *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide a prompt, text readings, or instructions..."
              className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none ${valErrors.description ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                }`}
            />
            {valErrors.description && (
              <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
                ❌ {valErrors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Class Target *</label>
              <select
                id="classId"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-900 dark:text-white outline-none transition-all shadow-sm cursor-pointer ${valErrors.classId ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  }`}
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} - {c.section}
                  </option>
                ))}
              </select>
              {valErrors.classId && (
                <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
                  ❌ {valErrors.classId}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Subject *</label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. English"
                className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none transition-all shadow-sm ${valErrors.subject ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  }`}
              />
              {valErrors.subject && (
                <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
                  ❌ {valErrors.subject}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Due Date *</label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none transition-all font-sans font-bold text-slate-600 dark:text-slate-300 cursor-pointer shadow-sm ${valErrors.dueDate ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  }`}
              />
              {valErrors.dueDate && (
                <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
                  ❌ {valErrors.dueDate}
                </p>
              )}
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
              className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer"
            >
              Assign Homework
            </button>
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------
          STUDENT WORK SUBMISSION MODAL
          ---------------------------------------------------- */}
      <Modal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} title="Submit Assignment Response">
        <form onSubmit={handleSubmitWork} noValidate className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-2.5 text-rose-600 dark:text-rose-400 text-[12px] font-semibold">
              <span>⚠️ {formError}</span>
            </div>
          )}

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-border text-left">
            <h4 className="font-semibold text-slate-900 dark:text-white text-[14px]">{activeHw?.title}</h4>
            <p className="mt-1.5 leading-relaxed text-[13px] text-slate-600 dark:text-slate-300">{activeHw?.description}</p>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Your Response / Essay *</label>
            <textarea
              id="submissionContent"
              value={submissionContent}
              onChange={(e) => setSubmissionContent(e.target.value)}
              rows={6}
              placeholder="Write your assignment text here..."
              className={`px-3.5 py-3 border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none leading-relaxed ${valErrors.submissionContent ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                }`}
            />
            {valErrors.submissionContent && (
              <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
                ❌ {valErrors.submissionContent}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsSubmitOpen(false)}
              className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer"
            >
              Submit Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------
          SUBMISSIONS LIST MODAL (FOR GRADING / VIEW)
          ---------------------------------------------------- */}
      <Modal
        isOpen={isSubmissionsOpen}
        onClose={() => setIsSubmissionsOpen(false)}
        title={activeHw ? `Submissions: ${activeHw.title}` : "Submissions"}
        size="lg"
      >
        <div className="space-y-5">
          <div className="text-left space-y-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-border">
            <h3 className="font-semibold text-[14px] text-slate-900 dark:text-white">Assignment Overview</h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1">{activeHw?.description}</p>
          </div>

          <div className="border border-border rounded-xl overflow-hidden text-left card-shadow">
            <table className="erp-table text-[13px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Response Content</th>
                  <th className="px-5 py-3.5">Grade Status</th>
                  {activeRole !== "student" && <th className="px-5 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white dark:bg-slate-900">
                {!activeHw || activeHw.submissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                      No submissions uploaded yet.
                    </td>
                  </tr>
                ) : (
                  activeHw.submissions
                    .filter((s) => {
                      const sId = typeof s.student_id === "object" ? s.student_id._id : s.student_id;
                      return activeRole !== "student" || sId === activeStudent?._id;
                    })
                    .map((sub) => {
                      const subStudentId = typeof sub.student_id === "object" ? sub.student_id._id : sub.student_id;
                      return (
                        <tr key={subStudentId} className="align-top hover:bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                            {getStudentName(subStudentId)}
                          </td>
                          <td className="px-5 py-4 space-y-3 max-w-sm">
                            <p className="text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-border leading-relaxed text-[12px] shadow-sm">
                              {sub.content}
                            </p>
                            {sub.feedback && (
                              <div className="flex gap-2 items-start text-[11px] text-slate-600 dark:text-slate-300 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                                <MessageSquare className="w-4 h-4 mt-0.5 text-indigo-500 flex-shrink-0" />
                                <span className="italic">&ldquo;{sub.feedback}&rdquo;</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {sub.grade ? (
                              <span className="px-2.5 py-1 rounded-md font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Rated: {sub.grade}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                                Ungraded
                              </span>
                            )}
                          </td>
                          {activeRole !== "student" && (
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedStudentId(subStudentId);
                                  setIsGradeOpen(true);
                                }}
                                className="px-3 py-1.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 inline-flex"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>Evaluate</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsSubmissionsOpen(false)}
              className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              Close List
            </button>
          </div>
        </div>
      </Modal>

      {/* ----------------------------------------------------
          EVALUATE / GRADE SUBMISSION MODAL
          ---------------------------------------------------- */}
      <Modal isOpen={isGradeOpen} onClose={() => setIsGradeOpen(false)} title="Evaluate Student Assignment">
        <form onSubmit={handleGradeSubmit} noValidate className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-4 py-2.5 text-rose-600 dark:text-rose-400 text-[12px] font-semibold">
              <span>⚠️ {formError}</span>
            </div>
          )}

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-border text-left space-y-1.5">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Student Submission</p>
            <p className="font-bold text-[14px] text-slate-900 dark:text-white">
              {getStudentName(selectedStudentId)}
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[13px] pt-1">
              {activeHw?.submissions.find((s) => {
                const sId = typeof s.student_id === "object" ? s.student_id._id : s.student_id;
                return sId === selectedStudentId;
              })?.content}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 text-left col-span-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Award Grade</label>
              <select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-bold text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm cursor-pointer"
              >
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="D">Grade D</option>
                <option value="F">Grade F</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 text-left col-span-2">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Evaluation Comments *</label>
              <input
                id="feedback"
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Good analytical structure..."
                className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none transition-all shadow-sm ${valErrors.feedback ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  }`}
              />
              {valErrors.feedback && (
                <p className="text-[11px] text-rose-500 font-bold mt-0.5 animate-in slide-in-from-top-1">
                  ❌ {valErrors.feedback}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsGradeOpen(false)}
              className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer"
            >
              Submit Review
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
