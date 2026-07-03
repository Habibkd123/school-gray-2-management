"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap, Calendar, Loader2, User, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface TeacherDetail {
  _id: string;
  name: string;
  employee_id?: string;
  phone?: string;
  email?: string;
  user_id?: {
    is_active: boolean;
    email?: string;
  };
}

interface ClassSubjectAssignment {
  _id: string;
  class_id: {
    _id: string;
    name: string;
    section?: string;
  };
  stream_id?: {
    _id: string;
    name: string;
  };
  section_id?: {
    _id: string;
    name: string;
  };
  subject_master_id: {
    _id: string;
    name: string;
    subject_code?: string;
  };
  academic_year: string;
  createdAt: string;
}

export default function TeacherAssignmentDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const teacherId = searchParams.get("teacherId") || "";
  const year = searchParams.get("year") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);

  const fetchData = async () => {
    if (!teacherId || !year) {
      setError("Teacher ID and Academic Year are required parameters.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch Teacher Details
      const teacherRes = await fetch(`/api/teachers/${teacherId}`, { headers: getAuthHeaders() });
      const teacherData = await teacherRes.json();
      if (!teacherRes.ok || !teacherData.success) {
        throw new Error(teacherData.message || "Failed to fetch teacher profile.");
      }

      // Fetch Teacher Assignments
      const assignRes = await fetch(
        `/api/teacher-assignment?teacher_id=${teacherId}&academic_year=${year}&limit=200`,
        { headers: getAuthHeaders() }
      );
      const assignData = await assignRes.json();
      if (!assignRes.ok || !assignData.success) {
        throw new Error(assignData.message || "Failed to fetch teacher assignments.");
      }

      setTeacher(teacherData.data);
      setAssignments(assignData.data.assignments || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teacherId, year]);

  const uniqueClassesCount = useMemo(() => {
    const classIds = new Set(assignments.map((a) => a.class_id?._id).filter(Boolean));
    return classIds.size;
  }, [assignments]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 text-slate-400 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading details...</p>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-slate-400 min-h-screen">
        <AlertCircle className="w-12 h-12 text-rose-500 opacity-80" />
        <p className="font-semibold text-[15px] text-slate-800 dark:text-slate-200">
          {error || "Teacher profile not found."}
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm bg-white dark:bg-slate-900 border border-border rounded-lg hover:bg-slate-50 font-bold transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const teacherEmail = teacher.email || teacher.user_id?.email || "—";
  const teacherStatus = teacher.user_id?.is_active ?? true;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white dark:bg-slate-900 border border-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-350" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Teacher Assignment Details
            </h1>
            <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              <Link href="/academic" className="hover:text-primary transition-colors">
                Academic
              </Link>
              <span>/</span>
              <Link
                href="/academic-mgmt/teacher-assignment"
                className="hover:text-primary transition-colors"
              >
                Teacher Assignment
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {teacher.name}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-left">
        {/* Left Side: Summary Card */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/10">
              <User className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-bold text-[16px] text-slate-900 dark:text-white leading-tight">
                {teacher.name}
              </h2>
              {teacher.employee_id && (
                <p className="text-[12px] font-mono text-slate-400 mt-1">
                  ID: {teacher.employee_id}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3.5 text-[13px] font-semibold">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Academic Year</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">
                {year}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Status</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  teacherStatus
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                }`}
              >
                {teacherStatus ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Email</span>
              <span className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                {teacherEmail}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Phone</span>
              <span className="text-slate-800 dark:text-slate-200">
                {teacher.phone || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Total Classes</span>
              <span className="text-slate-800 dark:text-slate-200">
                {uniqueClassesCount} classes
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Weekly Workload</span>
              <span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {assignments.length} assignments
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Assignments Matrix */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
          <div className="p-4 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40">
            <h3 className="font-bold text-[14px] text-slate-800 dark:text-slate-200">
              Classes & Subject Specialization Map
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-[#FAFBFD] dark:bg-slate-900/50 text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Class & Section</th>
                  <th className="px-5 py-3">Stream</th>
                  <th className="px-5 py-3">Subject Name</th>
                  <th className="px-5 py-3">Weekly Workload</th>
                  <th className="px-5 py-3">Assignment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assignments.map((assign) => (
                  <tr
                    key={assign._id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors font-medium text-slate-700 dark:text-slate-300"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-500 shrink-0" />
                        {assign.class_id?.name}
                        {assign.class_id?.section ? ` - ${assign.class_id.section}` : ""}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-purple-600 dark:text-purple-400 font-bold">
                      {assign.stream_id?.name ? (
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          {assign.stream_id.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {assign.subject_master_id?.name}{" "}
                          {assign.subject_master_id?.subject_code && (
                            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded ml-1.5">
                              {assign.subject_master_id.subject_code}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      4 periods/week
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-450 dark:text-slate-500">
                      {new Date(assign.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
