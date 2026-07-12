"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit, Trash2, Printer, Download, FileText,
  Calendar, Clock, CheckCircle, AlertCircle, Loader2,
  CalendarRange, GraduationCap
} from "lucide-react";
import { useExams } from "@/app/hooks/useExams";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";

export default function ClassExamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const { exams, loading, fetchExams } = useExams();
  const { classes } = useClasses();
  const { academicYear } = useAppState();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (exams.length === 0) fetchExams();
  }, [exams.length, fetchExams]);

  // Find class details
  const classInfo = useMemo(() => {
    return classes.find(c => c._id === classId) || { name: "Unknown Class", section: "" };
  }, [classes, classId]);

  // Filter exams for this specific class
  const classExams = useMemo(() => {
    return exams.filter(e => {
      const eClassId = typeof e.class_id === "object" ? e.class_id?._id : e.class_id;
      return eClassId === classId;
    });
  }, [exams, classId]);

  const upcomingExams = classExams.filter(e => e.start_date && new Date(e.start_date) > new Date()).length;
  const completedExams = classExams.filter(e => e.end_date && new Date(e.end_date) < new Date()).length;
  const ongoingExams = classExams.length - upcomingExams - completedExams;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  const getStatusBadge = (exam: any) => {
    const now = new Date();
    const start = new Date(exam.start_date);
    const end = new Date(exam.end_date);
    
    if (exam.end_date && end < now) {
      return <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-1 rounded-md text-[11px] font-bold">Completed</span>;
    }
    if (exam.start_date && exam.end_date && start <= now && end >= now) {
      return <span className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-2.5 py-1 rounded-md text-[11px] font-bold">Ongoing</span>;
    }
    return <span className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 px-2.5 py-1 rounded-md text-[11px] font-bold">Upcoming</span>;
  };

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-slate-500 font-medium">Loading details...</p>
      </div>
    );
  }



  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-border text-slate-500 hover:text-primary hover:border-primary/30 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {classInfo.name} {classInfo.section ? `- ${classInfo.section}` : ""}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider">
                Exams
              </span>
              <span>•</span>
              <span>Academic Year: {academicYear}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm">
            <FileText className="w-4 h-4" /> Generate Report Cards
          </button>
          <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Total Exams</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{classExams.length}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100/50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Exams</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{upcomingExams}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Completed Exams</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{completedExams}</h3>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Exams List</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-border">
                <th className="py-3 px-5">Exam Details</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">Schedule</th>
                <th className="py-3 px-5 text-center">Duration</th>
                <th className="py-3 px-5 text-center">Total Marks</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium text-sm">
                    No exams found for this class.
                  </td>
                </tr>
              ) : classExams.map((exam) => (
                <tr key={exam._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-3 px-5">
                    <div>
                      <span className="font-bold text-[14px] text-slate-900 dark:text-slate-100 block">
                        {exam.name}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Participating Students: 45
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className="text-[12px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      {exam.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex flex-col gap-1 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Start: {formatDate(exam.start_date)}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> End: {formatDate(exam.end_date)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-center">
                    <span className="font-bold text-[13px] text-slate-700 dark:text-slate-300">
                      3 Hours
                    </span>
                  </td>
                  <td className="py-3 px-5 text-center">
                    <div>
                      <span className="font-bold text-[14px] text-slate-800 dark:text-slate-100">100</span>
                      <span className="block text-[11px] text-slate-400 font-medium">Passing: 35</span>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    {getStatusBadge(exam)}
                  </td>
                  <td className="py-3 px-5 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Edit Exam">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors" title="Delete Exam">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
