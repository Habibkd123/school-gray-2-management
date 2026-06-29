"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useClasses } from "@/app/hooks/useClasses";
import { useTeachers } from "@/app/hooks/useTeachers";
import {
  Users, Save, Loader2, AlertCircle, CheckCircle2, ChevronRight, UserCheck, ShieldAlert
} from "lucide-react";
import { useAuth } from "@/app/context/auth";

export default function ClassTeacherAssignmentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";

  const { classes, isLoading: loadingClasses, error: classError, updateClass } = useClasses();
  const { teachers, isLoading: loadingTeachers } = useTeachers();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleTeacherChange = async (classId: string, teacherId: string) => {
    setSavingId(classId);
    setSuccessMsg("");
    setErrorMsg("");

    const res = await updateClass(classId, {
      class_teacher_id: teacherId || ""
    });

    setSavingId(null);
    if (res.success) {
      setSuccessMsg("Class Teacher assigned successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg(res.message || "Failed to update assignment.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const getTeacherId = (classTeacher: any) => {
    if (typeof classTeacher === "object" && classTeacher !== null) {
      return classTeacher._id;
    }
    return classTeacher || "";
  };

  const activeTeachers = teachers.filter(t => t.is_active !== false);
  const isLoading = loadingClasses || loadingTeachers;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3 dark:text-slate-400">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Denied</h2>
        <p className="text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Class Teacher Assignment</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Attendance</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Class Teacher Assignment</span>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {successMsg && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-[13px] font-medium">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[13px] font-medium">{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left">
        <div className="p-5 border-b border-border">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
            Class Teacher Mapping
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assign class teachers to manage registers and take daily attendance.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-[14px] font-medium">Loading classes & teachers...</p>
          </div>
        ) : classError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-8 h-8" />
            <p className="text-[14px] font-medium">{classError}</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Users className="w-12 h-12 opacity-20" />
            <p className="text-[14px] font-medium">No classes set up yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-[#F8FAFC] dark:bg-slate-800/50 text-slate-500 border-b border-border dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">Class Name</th>
                  <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">Section</th>
                  <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">Class Code</th>
                  <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">Capacity</th>
                  <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 w-80">Assigned Class Teacher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.map((cls) => {
                  const assignedTeacherId = getTeacherId(cls.class_teacher_id);
                  const isSaving = savingId === cls._id;

                  return (
                    <tr key={cls._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{cls.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-semibold">{cls.section || "—"}</td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">{cls.class_code || "—"}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{cls.capacity}</td>
                      <td className="px-6 py-4">
                        <div className="relative flex items-center gap-2">
                          <select
                            value={assignedTeacherId}
                            onChange={(e) => handleTeacherChange(cls._id, e.target.value)}
                            disabled={isSaving}
                            className="w-full pl-3 pr-10 py-2 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary appearance-none bg-white dark:bg-slate-900 disabled:opacity-50 cursor-pointer text-slate-700 dark:text-slate-200"
                          >
                            <option value="">-- Not Assigned --</option>
                            {activeTeachers.map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.name} {t.employee_id ? `(${t.employee_id})` : ""}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span>▾</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
