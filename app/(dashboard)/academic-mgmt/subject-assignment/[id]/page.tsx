"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit, Trash2, Printer, Check, X,
  BookOpen, GraduationCap, Calendar, Clock,
  Users, AlertCircle, Loader2, Plus
} from "lucide-react";
import { useSubjectAssignment, PopulatedAssignment } from "@/app/hooks/useSubjectAssignment";
import { useSubjectMaster } from "@/app/hooks/useSubjectMaster";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";
import { useAuth } from "@/app/context/auth";
import { Modal } from "@/app/components/ui/modal";

export default function SubjectAssignmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const { user } = useAuth();
  const isAdmin = !user?.role || user.role === "admin" || user.role === "school_admin" || user.role === "super_admin";

  const {
    assignments,
    isLoading,
    error,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  } = useSubjectAssignment();

  const { classes } = useClasses({ filterByYear: false });
  const { academicYear } = useAppState();

  const [isMounted, setIsMounted] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PopulatedAssignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Add form fields
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formWeeklyPeriods, setFormWeeklyPeriods] = useState("5");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  // Edit form fields
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editWeeklyPeriods, setEditWeeklyPeriods] = useState("5");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");

  // Load teachers and subjects for modals
  const { subjects: subjectList } = useSubjectMaster({ skip: !isAddOpen && !isEditOpen, limit: 500 });
  const { teachers } = useTeachers({ skip: !isAddOpen && !isEditOpen, limit: "all" });

  useEffect(() => {
    setIsMounted(true);
    fetchAssignments({ class_id: classId, limit: "all" });
  }, [classId, fetchAssignments]);

  // Filter assignments for this specific class
  const classAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
      return String(aClassId) === String(classId);
    });
  }, [assignments, classId]);

  // Find class details
  const classInfo = useMemo(() => {
    const fromClasses = classes.find((c) => String(c._id) === String(classId));
    if (fromClasses) return fromClasses;
    const fromAssignments = classAssignments.find((a) => a.class_id && typeof a.class_id === "object")?.class_id;
    if (fromAssignments) return fromAssignments as { name: string; section?: string; _id?: string };
    return { name: "Class", section: "" };
  }, [classes, classId, classAssignments]);

  const uniqueSubjects = useMemo(() => {
    return new Set(classAssignments.map((a) => a.subject_master_id?._id).filter(Boolean)).size;
  }, [classAssignments]);

  const uniqueTeachers = useMemo(() => {
    return new Set(classAssignments.map((a) => a.teacher_id?._id).filter(Boolean)).size;
  }, [classAssignments]);

  const totalWeeklyPeriods = useMemo(() => {
    return classAssignments.reduce((acc, curr) => acc + (curr.weekly_periods || 5), 0);
  }, [classAssignments]);

  // Open Edit modal
  const handleOpenEdit = (assignment: PopulatedAssignment) => {
    setSelectedAssignment(assignment);
    setEditTeacherId(assignment.teacher_id?._id || "");
    setEditWeeklyPeriods(String(assignment.weekly_periods || 5));
    setEditStatus(assignment.status || "Active");
    setFormError("");
    setIsEditOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubjectId) {
      setFormError("Please select a subject.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const res = await createAssignment({
      academic_year: academicYear,
      class_id: classId,
      subject_master_id: formSubjectId,
      teacher_id: formTeacherId || undefined,
      weekly_periods: parseInt(formWeeklyPeriods, 10) || 5,
      status: formStatus,
    });

    setSubmitting(false);
    if (res.success) {
      setIsAddOpen(false);
      setFormSubjectId("");
      setFormTeacherId("");
      setFormWeeklyPeriods("5");
      fetchAssignments({ class_id: classId, limit: "all" });
    } else {
      setFormError(res.message || "Failed to assign subject");
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setSubmitting(true);
    setFormError("");

    const res = await updateAssignment(selectedAssignment._id, {
      teacher_id: editTeacherId || null,
      weekly_periods: parseInt(editWeeklyPeriods, 10) || 5,
      status: editStatus,
    });

    setSubmitting(false);
    if (res.success) {
      setIsEditOpen(false);
      setSelectedAssignment(null);
      fetchAssignments({ class_id: classId, limit: "all" });
    } else {
      setFormError(res.message || "Failed to update assignment");
    }
  };

  // Delete Assignment
  const handleDelete = async (assignment: PopulatedAssignment) => {
    const subjectName = assignment.subject_master_id?.name || "this subject";
    if (!confirm(`Are you sure you want to remove the assignment of "${subjectName}" from this class?`)) {
      return;
    }

    const res = await deleteAssignment(assignment._id);
    if (res.success) {
      fetchAssignments({ class_id: classId, limit: "all" });
    } else {
      alert(res.message || "Failed to remove assignment");
    }
  };

  if (!isMounted || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-slate-500 font-medium">Loading details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Failed to load</h3>
        <p className="text-slate-500 mt-2">{error}</p>
        <button onClick={() => fetchAssignments({ class_id: classId })} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/academic-mgmt/subject-assignment")}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-border text-slate-500 hover:text-primary hover:border-primary/30 transition-colors shadow-sm cursor-pointer"
            title="Back to Subject Assignments"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {classInfo.name} {classInfo.section ? `- ${classInfo.section}` : ""}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider">
                Subject Assignments
              </span>
              <span>•</span>
              <span>Academic Year: {academicYear}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions (only for Admin) */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setFormError("");
                setIsAddOpen(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Users className="w-4 h-4" /> Assign Teacher
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Assigned Subjects</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{uniqueSubjects}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Assigned Teachers</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{uniqueTeachers}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-100/50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Weekly Periods</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalWeeklyPeriods}</h3>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Assigned Subjects List</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-border">
                <th className="py-3 px-5">Subject</th>
                <th className="py-3 px-5">Subject Code</th>
                <th className="py-3 px-5">Assigned Teacher</th>
                <th className="py-3 px-5">Weekly Periods</th>
                <th className="py-3 px-5">Status</th>
                {isAdmin && <th className="py-3 px-5 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classAssignments.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-500 font-medium text-sm">
                    No subjects assigned to this class yet.
                  </td>
                </tr>
              ) : (
                classAssignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-[14px] text-slate-900 dark:text-slate-100 block">
                          {assignment.subject_master_id?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className="font-bold text-[13px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                        {assignment.subject_master_id?.subject_code || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      {assignment.teacher_id ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={assignment.teacher_id?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignment.teacher_id?.name || "T")}&background=d68600&color=fff&bold=true`}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                          />
                          <span className="font-bold text-[13px] text-slate-700 dark:text-slate-200">
                            {assignment.teacher_id?.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[12px] font-medium text-rose-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        {assignment.weekly_periods ? `${assignment.weekly_periods} Periods` : "5 Periods"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${assignment.status === "Active" ? "bg-success/10 text-success" : "bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${assignment.status === "Active" ? "bg-success" : "bg-rose-500"}`} />
                        {assignment.status || "Active"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(assignment)}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                            title="Edit Assignment"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(assignment)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                            title="Delete Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Assignment Modal */}
      {isAdmin && (
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title={`Assign Subject to ${classInfo.name}`}>
          <form onSubmit={handleAddSubmit} className="space-y-4 text-left p-1">
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 text-[13px] font-semibold border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                <option value="">Select Subject</option>
                {subjectList
                  .filter((s) => s.status === "Active")
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.subject_code ? `(${s.subject_code})` : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                Assigned Teacher
              </label>
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                <option value="">Not Assigned (Optional)</option>
                {teachers
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.employee_id || "No ID"})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Weekly Periods
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={formWeeklyPeriods}
                  onChange={(e) => setFormWeeklyPeriods(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Assign Subject</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Assignment Modal */}
      {isAdmin && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit ${selectedAssignment?.subject_master_id?.name || "Subject"} Assignment`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-left p-1">
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 text-[13px] font-semibold border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                Subject
              </label>
              <input
                type="text"
                disabled
                value={`${selectedAssignment?.subject_master_id?.name || ""} ${selectedAssignment?.subject_master_id?.subject_code ? `(${selectedAssignment.subject_master_id.subject_code})` : ""}`}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                Assigned Teacher
              </label>
              <select
                value={editTeacherId}
                onChange={(e) => setEditTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                <option value="">Not Assigned (Unassigned)</option>
                {teachers
                  .filter((t) => t.is_active || t._id === editTeacherId)
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.employee_id || "No ID"})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Weekly Periods
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={editWeeklyPeriods}
                  onChange={(e) => setEditWeeklyPeriods(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
