"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit, Trash2, BookOpen, Clock,
  User, Users, AlertCircle, Loader2
} from "lucide-react";
import { useTeacherAssignment, PopulatedTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useSubjectAssignment } from "@/app/hooks/useSubjectAssignment";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";
import { useAuth } from "@/app/context/auth";
import { Modal } from "@/app/components/ui/modal";

const ASSIGNMENT_TYPES = [
  "Subject Teacher",
  "Class Teacher",
  "Co-Class Teacher",
  "Temporary Teacher",
  "Substitute Teacher"
];

export default function TeacherAssignmentDetailsPage() {
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
    deleteAssignment
  } = useTeacherAssignment();

  const { classes } = useClasses({ filterByYear: false });
  const { assignments: subjectAssignments, fetchAssignments: fetchSubjectAssignments } = useSubjectAssignment();
  const { teachers } = useTeachers({ limit: "all" });
  const { academicYear } = useAppState();

  const [isMounted, setIsMounted] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PopulatedTeacherAssignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Add Form state
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formType, setFormType] = useState("Subject Teacher");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [formRemarks, setFormRemarks] = useState("");

  // Edit Form state
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editType, setEditType] = useState("Subject Teacher");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [editRemarks, setEditRemarks] = useState("");

  useEffect(() => {
    setIsMounted(true);
    fetchAssignments({});
    fetchSubjectAssignments({ class_id: classId, status: "Active", limit: 1000 });
  }, [classId, fetchAssignments, fetchSubjectAssignments]);

  // Find class details
  const classInfo = useMemo(() => {
    const fromClasses = classes.find((c) => String(c._id) === String(classId));
    if (fromClasses) return fromClasses;
    const fromAssignments = assignments.find((a) => {
      const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
      return String(aClassId) === String(classId);
    })?.class_id;
    if (fromAssignments && typeof fromAssignments === "object") return fromAssignments as { name: string; section?: string; _id?: string };
    return { name: "Class", section: "" };
  }, [classes, classId, assignments]);

  // Filter assignments for this specific class
  const classAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
      return String(aClassId) === String(classId);
    });
  }, [assignments, classId]);

  // Active subjects assigned to this class in Subject Assignment
  const availableClassSubjects = useMemo(() => {
    const assigned = subjectAssignments.filter((a) => {
      const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
      return String(aClassId) === String(classId) && a.status === "Active";
    });

    const subs = assigned
      .map((a) => a.subject_master_id)
      .filter(Boolean)
      .filter((s: any) => s.status === "Active" || !s.status);

    const seen = new Set<string>();
    return subs.filter((s: any) => {
      const id = String(s._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [subjectAssignments, classId]);

  // Available subjects for Edit modal (includes the current subject if active)
  const availableEditSubjects = useMemo(() => {
    const list = [...availableClassSubjects];
    if (selectedAssignment?.subject_master_id) {
      const curSub = selectedAssignment.subject_master_id;
      if ((curSub.status === "Active" || !curSub.status) && !list.some((s) => String(s._id) === String(curSub._id))) {
        list.push(curSub);
      }
    }
    return list;
  }, [availableClassSubjects, selectedAssignment]);

  const uniqueTeachers = useMemo(() => {
    return new Set(classAssignments.map((a) => a.teacher_id?._id).filter(Boolean)).size;
  }, [classAssignments]);

  const uniqueSubjects = useMemo(() => {
    return new Set(classAssignments.map((a) => a.subject_master_id?._id).filter(Boolean)).size;
  }, [classAssignments]);

  // Open Edit modal
  const handleOpenEdit = (assignment: PopulatedTeacherAssignment) => {
    setSelectedAssignment(assignment);
    setEditTeacherId(assignment.teacher_id?._id || "");
    setEditSubjectId(assignment.subject_master_id?._id || "");
    setEditType(assignment.assignment_type || "Subject Teacher");
    setEditStatus(assignment.status || "Active");
    setEditRemarks(assignment.remarks || "");
    setFormError("");
    setIsEditOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacherId) {
      setFormError("Please select a teacher.");
      return;
    }
    if (!formSubjectId) {
      setFormError("Please select a subject.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const res = await createAssignment({
      academic_year: academicYear,
      class_id: classId,
      teacher_id: formTeacherId,
      subject_master_id: formSubjectId,
      assignment_type: formType,
      status: formStatus,
      remarks: formRemarks,
    });

    setSubmitting(false);
    if (res.success) {
      setIsAddOpen(false);
      setFormTeacherId("");
      setFormSubjectId("");
      setFormType("Subject Teacher");
      setFormStatus("Active");
      setFormRemarks("");
      fetchAssignments({});
    } else {
      setFormError(res.message || "Failed to assign teacher");
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (!editTeacherId) {
      setFormError("Please select a teacher.");
      return;
    }
    if (!editSubjectId) {
      setFormError("Please select a subject.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const res = await updateAssignment(selectedAssignment._id, {
      teacher_id: editTeacherId,
      subject_master_id: editSubjectId,
      assignment_type: editType,
      status: editStatus,
      remarks: editRemarks,
    });

    setSubmitting(false);
    if (res.success) {
      setIsEditOpen(false);
      setSelectedAssignment(null);
      fetchAssignments({});
    } else {
      setFormError(res.message || "Failed to update assignment");
    }
  };

  // Delete Assignment
  const handleDelete = async (assignment: PopulatedTeacherAssignment) => {
    const teacherName = assignment.teacher_id?.name || "this teacher";
    const subjectName = assignment.subject_master_id?.name || "assigned subject";
    if (!confirm(`Are you sure you want to remove the assignment of ${teacherName} (${subjectName}) from this class?`)) {
      return;
    }

    const res = await deleteAssignment(assignment._id);
    if (res.success) {
      fetchAssignments({});
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
        <button onClick={() => fetchAssignments({})} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
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
            onClick={() => router.push("/academic-mgmt/teacher-assignment")}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-border text-slate-500 hover:text-primary hover:border-primary/30 transition-colors shadow-sm cursor-pointer"
            title="Back to Teacher Assignments"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {classInfo.name} {classInfo.section ? `- ${classInfo.section}` : ""}
            </h1>
            <p className="text-[13px] font-medium text-slate-500 mt-1 flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-semibold">
                Teacher Assignments
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
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
              className="btn btn-primary shadow-sm flex items-center gap-2 text-[13px] font-semibold cursor-pointer"
            >
              <Users className="w-4 h-4" /> Assign Teacher
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-100/60 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Assigned Teachers</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{uniqueTeachers}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-100/60 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Assigned Subjects</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{uniqueSubjects}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-purple-100/60 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Total Assignments</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{classAssignments.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg shadow-sm overflow-hidden text-left">
        <div className="p-4 px-5 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Assigned Teachers List</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table w-full">
            <thead>
              <tr>
                <th className="py-3 px-5 text-left font-medium text-[13px] text-slate-500 dark:text-slate-400">Teacher</th>
                <th className="py-3 px-5 text-left font-medium text-[13px] text-slate-500 dark:text-slate-400">Subject</th>
                <th className="py-3 px-5 text-left font-medium text-[13px] text-slate-500 dark:text-slate-400">Assignment Type</th>
                <th className="py-3 px-5 text-left font-medium text-[13px] text-slate-500 dark:text-slate-400">Date Assigned</th>
                <th className="py-3 px-5 text-left font-medium text-[13px] text-slate-500 dark:text-slate-400">Status</th>
                {isAdmin && <th className="py-3 px-5 text-center font-medium text-[13px] text-slate-500 dark:text-slate-400">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classAssignments.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-500 font-normal text-[13px]">
                    No teachers assigned to this class yet.
                  </td>
                </tr>
              ) : (
                classAssignments.map((assignment) => (
                  <tr key={assignment._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={assignment.teacher_id?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignment.teacher_id?.name || "T")}&background=d68600&color=fff&bold=true`}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full bg-slate-200 object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <span className="font-medium text-[13px] text-slate-800 dark:text-slate-100 block">
                            {assignment.teacher_id?.name || "Unknown"}
                          </span>
                          {assignment.teacher_id?.employee_id && (
                            <span className="text-[11px] font-normal text-slate-500 block">
                              ID: {assignment.teacher_id.employee_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className="font-medium text-[13px] text-slate-800 dark:text-slate-100">
                        {assignment.subject_master_id?.name || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-[12px] font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-2.5 py-1 rounded-md">
                        {assignment.assignment_type || "Subject Teacher"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="font-medium text-[13px] text-slate-600 dark:text-slate-400">
                        {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          assignment.status === "Active"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {assignment.status || "Active"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
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

      {/* Add Teacher Assignment Modal */}
      {isAdmin && (
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title={`Assign Teacher to ${classInfo.name}`}
        >
          <form onSubmit={handleAddSubmit} className="space-y-4 text-left p-1">
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 text-[13px] font-medium border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                Teacher <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
              >
                <option value="">Select Teacher</option>
                {teachers
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.employee_id || "No ID"})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                Subject <span className="text-red-500">*</span>
              </label>
              {availableClassSubjects.length === 0 ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 text-xs rounded-lg border border-amber-200">
                  No active subjects assigned to this class. Please assign subjects to this class first.
                </div>
              ) : (
                <select
                  required
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
                >
                  <option value="">Select Subject</option>
                  {availableClassSubjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.subject_code ? `(${s.subject_code})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  Assignment Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
                >
                  {ASSIGNMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                Remarks / Audit Comments
              </label>
              <textarea
                rows={2}
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Optional notes or remarks"
                className="w-full px-3.5 py-2 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] font-medium rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || availableClassSubjects.length === 0}
                className="btn btn-primary text-[13px] font-medium flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Assign Teacher</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Teacher Assignment Modal */}
      {isAdmin && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Teacher Assignment`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-left p-1">
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 text-[13px] font-medium border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                Teacher <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={editTeacherId}
                onChange={(e) => setEditTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
              >
                <option value="">Select Teacher</option>
                {teachers
                  .filter((t) => t.is_active || t._id === editTeacherId)
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.employee_id || "No ID"})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={editSubjectId}
                onChange={(e) => setEditSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
              >
                <option value="">Select Subject</option>
                {availableEditSubjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.subject_code ? `(${s.subject_code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  Assignment Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
                >
                  {ASSIGNMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                Remarks / Audit Comments
              </label>
              <textarea
                rows={2}
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Optional notes or remarks"
                className="w-full px-3.5 py-2 border border-border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary/50 shadow-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[13px] font-medium rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary text-[13px] font-medium flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Update Assignment</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
