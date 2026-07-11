"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, User, Calendar, Loader2, GraduationCap, AlertCircle, RefreshCw } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface SubjectDetail {
  _id: string;
  subject_master_id: {
    _id: string;
    name: string;
    subject_code?: string;
  };
  class_id: {
    _id: string;
    name: string;
    section?: string;
  };
  stream_id?: {
    _id: string;
    name: string;
  };
  academic_year: string;
  createdAt: string;
  updatedAt: string;
}

interface TeacherAssignment {
  _id: string;
  teacher_id: {
    _id: string;
    name: string;
    employee_id?: string;
  };
  subject_master_id: {
    _id: string;
  };
}

export default function SubjectAssignmentDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const classId = searchParams.get("classId") || "";
  const streamId = searchParams.get("streamId") || "";
  const year = searchParams.get("year") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectDetail[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

  const fetchData = async () => {
    if (!classId || !year) {
      setError("Class ID and Academic Year are required parameters.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch Subject Assignments
      const subjRes = await fetch(
        `/api/subject-assignment?class_id=${classId}&academic_year=${year}&limit=200`,
        { headers: getAuthHeaders() }
      );
      const subjData = await subjRes.json();
      if (!subjRes.ok || !subjData.success) {
        throw new Error(subjData.message || "Failed to fetch subject assignments.");
      }

      // Fetch Teacher Assignments
      const teacherRes = await fetch(
        `/api/teacher-assignment?class_id=${classId}&academic_year=${year}&limit=200`,
        { headers: getAuthHeaders() }
      );
      const teacherData = await teacherRes.json();
      if (!teacherRes.ok || !teacherData.success) {
        throw new Error(teacherData.message || "Failed to fetch teacher assignments.");
      }

      const allSubjects: SubjectDetail[] = subjData.data.assignments || [];
      // Filter by Stream if streamId parameter is provided
      const filteredSubjects = streamId
        ? allSubjects.filter(
            (s) =>
              s.stream_id?._id === streamId ||
              (typeof s.stream_id === "string" && s.stream_id === streamId)
          )
        : allSubjects;

      setSubjects(filteredSubjects);
      setTeacherAssignments(teacherData.data.assignments || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classId, streamId, year]);

  const classInfo = useMemo(() => {
    if (subjects.length === 0) return null;
    const first = subjects[0];
    return {
      className: first.class_id?.name || "Class",
      section: first.class_id?.section || "",
      streamName: first.stream_id?.name || "",
      academicYear: first.academic_year,
      lastUpdated: new Date(
        Math.max(...subjects.map((s) => new Date(s.updatedAt).getTime()))
      ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }, [subjects]);

  const matchedSubjects = useMemo(() => {
    return subjects.map((sub) => {
      const subMasterId = sub.subject_master_id?._id;
      const matchedTeacher = teacherAssignments.find(
        (ta) => ta.subject_master_id?._id === subMasterId
      );
      return {
        ...sub,
        teacherName: matchedTeacher?.teacher_id?.name || "Not Assigned",
        teacherEmpId: matchedTeacher?.teacher_id?.employee_id || "—",
      };
    });
  }, [subjects, teacherAssignments]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 text-slate-400 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading details...</p>
      </div>
    );
  }

  if (error || !classInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-slate-400 min-h-screen">
        <AlertCircle className="w-12 h-12 text-rose-500 opacity-80" />
        <p className="font-semibold text-[15px] text-slate-800 dark:text-slate-200">
          {error || "No subject assignments found for this selection."}
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
              Subject Assignment Details
            </h1>
            <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1.5">
              <Link href="/academic" className="hover:text-primary transition-colors">
                Academic
              </Link>
              <span>/</span>
              <Link
                href="/academic-mgmt/subject-assignment"
                className="hover:text-primary transition-colors"
              >
                Subject Assignment
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {classInfo.className} {classInfo.section ? `- ${classInfo.section}` : ""}
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
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/10">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-[16px] text-slate-900 dark:text-white leading-tight">
                {classInfo.className}
                {classInfo.section ? (
                  <span className="text-slate-400 font-semibold text-[15px]">
                    {" "}
                    - {classInfo.section}
                  </span>
                ) : (
                  ""
                )}
              </h2>
              {classInfo.streamName && (
                <p className="text-[12px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
                  {classInfo.streamName} Stream
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3.5 text-[13px] font-semibold">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Academic Year</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">
                {classInfo.academicYear}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Total Subjects</span>
              <span className="text-slate-800 dark:text-slate-200">
                {subjects.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Created By</span>
              <span className="text-slate-800 dark:text-slate-200">Administrator</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Last Updated</span>
              <span className="text-slate-850 dark:text-slate-250 font-mono">
                {classInfo.lastUpdated}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Subjects List Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
          <div className="p-4 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40">
            <h3 className="font-bold text-[14px] text-slate-800 dark:text-slate-200">
              Assigned Subjects Checklists
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table text-[13px]">
              <thead>
                <tr className="border-b border-border bg-[#FAFBFD] dark:bg-slate-900/50 text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Subject Name</th>
                  <th className="px-5 py-3">Subject Code</th>
                  <th className="px-5 py-3">Assigned Teacher</th>
                  <th className="px-5 py-3">Teacher ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matchedSubjects.map((sub, sIdx) => (
                  <tr
                    key={sub._id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors font-medium text-slate-700 dark:text-slate-300"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {sub.subject_master_id?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {sub.subject_master_id?.subject_code ? (
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                          {sub.subject_master_id.subject_code}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span
                          className={
                            sub.teacherName === "Not Assigned"
                              ? "text-slate-400 dark:text-slate-550 font-normal italic"
                              : "font-semibold text-slate-800 dark:text-slate-200"
                          }
                        >
                          {sub.teacherName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs">{sub.teacherEmpId}</td>
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
