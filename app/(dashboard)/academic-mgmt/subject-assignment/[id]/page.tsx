"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit, Trash2, Printer, Check, X,
  BookOpen, GraduationCap, Calendar, Clock,
  Users, AlertCircle, Loader2
} from "lucide-react";
import { useSubjectAssignment } from "@/app/hooks/useSubjectAssignment";
import { useClasses } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";

export default function SubjectAssignmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const { assignments, isLoading, error, fetchAssignments } = useSubjectAssignment();
  const { classes } = useClasses();
  const { academicYear } = useAppState();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (assignments.length === 0) fetchAssignments({});
  }, [assignments.length, fetchAssignments]);

  // Find class details
  const classInfo = useMemo(() => {
    return classes.find(c => c._id === classId) || { name: "Unknown Class", section: "" };
  }, [classes, classId]);

  // Filter assignments for this specific class
  const classAssignments = useMemo(() => {
    return assignments.filter(a => {
      const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
      return aClassId === classId;
    });
  }, [assignments, classId]);

  const uniqueSubjects = useMemo(() => {
    return new Set(classAssignments.map(a => a.subject_master_id?._id).filter(Boolean)).size;
  }, [classAssignments]);

  const uniqueTeachers = useMemo(() => {
    return new Set(classAssignments.map(a => a.teacher_id?._id).filter(Boolean)).size;
  }, [classAssignments]);

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
        <button onClick={() => fetchAssignments({})} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">Retry</button>
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
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-border text-slate-500 hover:text-primary hover:border-primary/30 transition-colors shadow-sm"
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

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm">
            <Users className="w-4 h-4" /> Assign Teacher
          </button>
          <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{uniqueSubjects * 5}</h3>
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
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium text-sm">
                    No subjects assigned to this class yet.
                  </td>
                </tr>
              ) : classAssignments.map((assignment) => (
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
                      {/* Placeholder for weekly periods since it's not currently in the schema */}
                      5 Periods
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${assignment.status === "Active" ? "bg-success/10 text-success" : "bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${assignment.status === "Active" ? "bg-success" : "bg-rose-500"}`} />
                      {assignment.status || "Active"}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Edit Assignment">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors" title="Delete Assignment">
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
