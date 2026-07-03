"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  ArrowLeft, ClipboardList, BookOpen, BarChart2, CheckCircle,
  Edit, Loader2, Users, AlertTriangle, CheckCircle2, FileText, LayoutGrid
} from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:     { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400", label: "Draft" },
  scheduled: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", label: "Scheduled" },
  ongoing:   { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500 animate-pulse", label: "Ongoing" },
  completed: { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500", label: "Completed" },
  published: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", label: "Published ✓" },
};

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

export default function TestDetailsPage() {
  const params = useParams<{ classId: string; assessmentId: string }>();
  const classId = params?.classId || "";
  const assessmentId = params?.assessmentId || "";
  
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin";
  const isTeacher = user?.role === "teacher";
  const canEdit = isAdmin || isTeacher;

  const [test, setTest] = useState<any>(null);
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchTestAndStudents = async () => {
      try {
        const res = await fetch(`/api/assessments/${assessmentId}/marks`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          setTest(data.data.test);
          setRows(data.data.rows);
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (assessmentId) {
      fetchTestAndStudents();
    }
  }, [assessmentId]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/publish`, {
        method: "POST", headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Results published successfully!");
        setTest((prev: any) => prev ? { ...prev, is_published: true, computedStatus: "published" } : prev);
      } else {
        showToast("error", data.message || "Failed to publish");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">Test not found</p>
        <Link href={`/assessments/${classId}`} className="mt-4 text-[13px] text-primary hover:underline">← Back to Class Assessments</Link>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[test.computedStatus] || STATUS_STYLES.scheduled;
  const classLabel = test.class_id
    ? `${test.class_id.name}${test.class_id.section ? ` — ${test.class_id.section}` : ""}`
    : "—";

  const stats = [
    { label: "Total Students", value: rows.length ?? "—", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Marks Entered", value: rows.filter(r => r.has_entry).length, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Pending Marks", value: rows.filter(r => !r.has_entry).length, icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Total Marks", value: test.total_marks, icon: BarChart2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium ${
          toast.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
            : "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button onClick={() => router.push(`/assessments/${classId}`)}
          className="p-2 flex-shrink-0 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/assessments" className="hover:text-primary transition-colors">Assessments</Link>
            <span>/</span>
            <Link href={`/assessments/${classId}`} className="hover:text-primary transition-colors">Class Details</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium truncate">Assessment Details</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[20px] font-bold text-slate-900 dark:text-slate-100 truncate">{test.title}</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 mt-3 sm:mt-0">
          {canEdit && (
            <Link href={`/assessments/create?edit=${test._id}`}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Edit className="w-3.5 h-3.5" /> Edit
            </Link>
          )}
          {canEdit && !test.is_published && test.computedStatus !== "draft" && test.computedStatus !== "scheduled" && (
            <button onClick={handlePublish} disabled={isPublishing}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-70 cursor-pointer">
              {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Publish Results
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          {/* Test Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm text-left">
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Assessment Information
            </h2>
            <div className="space-y-4">
              {[
                { label: "Class", value: classLabel },
                { label: "Subject", value: test.subject_id?.name || "—" },
                { label: "Assessment Type", value: test.assessment_type || "Standard" },
                { label: "Test Date", value: new Date(test.test_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
                { label: "Time", value: `${test.start_time} – ${test.end_time}` },
                { label: "Total / Pass Marks", value: `${test.total_marks} / ${test.passing_marks}` },
                { label: "Academic Year", value: test.academic_year || "—" },
                { label: "Assigned Teacher", value: test.teacher_id?.name || "—" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{item.label}</p>
                  <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 text-left">
             <Link href={`/assessments/${classId}/${assessmentId}/analytics`}
               className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group">
               <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                 <BarChart2 className="w-5 h-5 text-purple-500" />
               </div>
               <div>
                 <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600">Analytics</p>
                 <p className="text-[11px] text-slate-400">Performance overview</p>
               </div>
             </Link>
             <Link href={`/assessments/${classId}/${assessmentId}/results`}
               className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all group">
               <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                 <CheckCircle className="w-5 h-5 text-emerald-500" />
               </div>
               <div>
                 <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600">View Results</p>
                 <p className="text-[11px] text-slate-400">{rows.filter(r => r.has_entry).length} entries</p>
               </div>
             </Link>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 text-left">
           {/* Stats Row */}
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-4 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <p className="text-[22px] font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Student List */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Student Assessment
              </h2>
              {canEdit && (
                <Link href={`/assessments/${classId}/${assessmentId}/marks`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[12px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer">
                  <BookOpen className="w-3.5 h-3.5" /> Enter/Edit Marks
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-20">Roll No</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Marks</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500 text-[13px]">
                        No students found for this class.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                          {row.roll_no || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{row.name}</p>
                          <p className="text-[11px] text-slate-400">{row.admission_no}</p>
                        </td>
                        <td className="px-5 py-3.5">
                           <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                             {row.has_entry ? row.marks_obtained : <span className="text-slate-300 dark:text-slate-600">—</span>}
                           </p>
                        </td>
                        <td className="px-5 py-3.5">
                           <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                             {row.has_entry ? (row.is_pass ? "Pass" : "Fail") : <span className="text-slate-300 dark:text-slate-600">—</span>}
                           </p>
                        </td>
                        <td className="px-5 py-3.5">
                          {row.has_entry ? (
                            row.is_pass ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                PASSED
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                                FAILED
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              PENDING
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
