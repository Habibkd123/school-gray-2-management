"use client";

import React, { useEffect, useState } from "react";
import { useParent } from "@/app/hooks/useParent";
import { ChildSelector } from "@/app/components/parent/ChildSelector";
import { BookOpen, Calendar, Clock, CheckCircle2, FileText, XCircle, ChevronRight, User } from "lucide-react";
import { useHomework, ApiHomework } from "@/app/hooks/useHomework";
import Link from "next/link";
import { usePagination, PaginationBar } from "@/app/components/ui/pagination-bar";

export default function ParentHomeworkPage() {
  const { children, selectedChild, selectedChildId, setSelectedChildId, isLoading: isParentLoading } = useParent();
  const classId = selectedChild?.class_id?._id;
  const { homework, fetchHomework, isLoading: isHomeworkLoading } = useHomework(classId, { skip: !classId });

  const [filter, setFilter] = useState<"all" | "pending" | "submitted">("all");

  const isLoading = isParentLoading || isHomeworkLoading;

  // Enrich with submission status
  const enrichedHomework = homework.map(hw => {
    const submission = hw.submissions.find(sub =>
      (typeof sub.student_id === 'object' ? sub.student_id._id : sub.student_id) === selectedChildId
    );
    return {
      ...hw,
      isSubmitted: !!submission,
      submission,
      isOverdue: new Date(hw.due_date) < new Date() && !submission
    };
  });

  const filteredHomework = enrichedHomework.filter(hw => {
    if (filter === "pending") return !hw.isSubmitted;
    if (filter === "submitted") return hw.isSubmitted;
    return true;
  }).sort((a, b) => new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime());

  const { paged: pagedHomework, page: hwPage, setPage: setHwPage, totalPages: hwTotalPages, totalItems: hwTotal } = usePagination(filteredHomework, 6);

  const pendingCount = enrichedHomework.filter(hw => !hw.isSubmitted).length;
  const submittedCount = enrichedHomework.filter(hw => hw.isSubmitted).length;

  // Helper: get subject name safely
  const getSubjectName = (hw: ApiHomework) => {
    if (hw.subject_id && typeof hw.subject_id === 'object' && hw.subject_id.name) {
      return hw.subject_id.name;
    }
    return 'Subject';
  };

  const getTeacherName = (hw: ApiHomework) => {
    if (hw.teacher_id && typeof hw.teacher_id === 'object' && hw.teacher_id.name) {
      return hw.teacher_id.name;
    }
    return 'Teacher';
  };

  // Subject color palette
  const subjectColors: Record<string, string> = {
    'Math': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'English': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'Science': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'History': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'Physics': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    'Chemistry': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };
  const getSubjectColor = (name: string) =>
    subjectColors[name] || 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';

  return (
    <div className="space-y-6 max-w-full sm:w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border card-shadow">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-500" />
            Homework
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Track assignments and submission status</p>
        </div>
        <div className="w-full sm:w-[250px]">
          <ChildSelector
            childrenList={children}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            isLoading={isParentLoading}
          />
        </div>
      </div>

      {!selectedChild ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-border text-center text-slate-500 dark:text-slate-400">
          Please select a child to view their homework.
        </div>
      ) : isLoading && enrichedHomework.length === 0 ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* Stats & Filters */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-4">
              <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-border flex items-center gap-3 card-shadow">
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">Pending</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{pendingCount}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-border flex items-center gap-3 card-shadow">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase dark:text-slate-400">Submitted</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{submittedCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex self-start">
              {(["all", "pending", "submitted"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                    filter === f
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Homework Cards */}
          {filteredHomework.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-border text-center flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">All Caught Up!</h3>
              <p className="text-slate-500 dark:text-slate-400">No homework found for the selected filter.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pagedHomework.map((hw) => {
                const subjectName = getSubjectName(hw);
                const teacherName = getTeacherName(hw);
                const subjectColor = getSubjectColor(subjectName);

                return (
                  <Link
                    key={hw._id}
                    href={`/parent/homework/${hw._id}`}
                    className="group bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col h-full hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    {/* Top row: subject badge + status */}
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${subjectColor}`}>
                        {subjectName}
                      </span>
                      {hw.isSubmitted ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Submitted
                        </span>
                      ) : hw.isOverdue ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                          <XCircle className="w-3 h-3" /> Overdue
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {hw.title}
                    </h3>

                    {/* Teacher */}
                    <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-3 dark:text-slate-400">
                      <User className="w-3 h-3" />
                      <span>{teacherName}</span>
                    </div>

                    {/* Description */}
                    {hw.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-grow">
                        {hw.description}
                      </p>
                    )}

                    {/* Footer dates */}
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Assigned:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {new Date(hw.assigned_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> Due:</span>
                        <span className={`font-medium ${hw.isOverdue ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {new Date(hw.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* View detail CTA */}
                    <div className="mt-3 flex items-center justify-end gap-1 text-[12px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                );
              })}
              </div>
              <PaginationBar
                currentPage={hwPage}
                totalPages={hwTotalPages}
                totalItems={hwTotal}
                pageSize={6}
                onPageChange={setHwPage}
                className="mt-2 border-t-0"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
