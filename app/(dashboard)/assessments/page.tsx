"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import { useClasses } from "@/app/hooks/useClasses";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import {
  Search, Loader2, AlertCircle, BookOpen, BarChart2, RefreshCw, GraduationCap, ArrowRight,
  ClipboardList, Calendar, CheckCircle2, FileText
} from "lucide-react";

interface Test {
  _id: string;
  title: string;
  class_id: { _id: string; name: string; section: string } | null;
  subject_id: { _id: string; name: string } | null;
  teacher_id: { _id: string; name: string } | null;
  test_date: string;
  start_time: string;
  end_time: string;
  total_marks: number;
  passing_marks: number;
  is_published: boolean;
  computedStatus: string;
}

export default function AssessmentsClassListPage() {
  const { user } = useAuth();
  const { academicYear } = useAcademicConfig();

  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { classes } = useClasses();

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "5000" });
      const res = await fetch(`/api/assessments?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setTests(data.data);
      }
    } catch {
      showToast("error", "Failed to load tests");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const classGroups = useMemo(() => {
    const groups: Record<string, { classId: string; className: string; section?: string; tests: Test[] }> = {};
    
    tests.forEach(t => {
      const classId = t.class_id?._id;
      if (!classId) return; // ignore unassigned classes for class-wise view

      const className = t.class_id?.name || "Class";
      const section = t.class_id?.section || "";
        
      if (!groups[classId]) {
        groups[classId] = { classId, className, section, tests: [] };
      }
      groups[classId].tests.push(t);
    });
    
    // Sort classes alphabetically
    return Object.values(groups).sort((a, b) => a.className.localeCompare(b.className));
  }, [tests]);

  const filteredClassGroups = useMemo(() => {
    if (!search.trim()) return classGroups;
    const term = search.toLowerCase().trim();
    return classGroups.filter(c => {
      const nameMatch = c.className.toLowerCase().includes(term);
      const sectionMatch = c.section ? c.section.toLowerCase().includes(term) : false;
      const subjectMatch = c.tests.some(t => t.subject_id?.name.toLowerCase().includes(term));
      return nameMatch || sectionMatch || subjectMatch;
    });
  }, [classGroups, search]);

  const stats = useMemo(() => {
    return {
      total: tests.length,
      scheduled: tests.filter(t => t.computedStatus === "scheduled").length,
      completed: tests.filter(t => t.computedStatus === "completed" || t.computedStatus === "published" || t.computedStatus === "ongoing").length,
      draft: tests.filter(t => t.computedStatus === "draft").length
    };
  }, [tests]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Toast notifications */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-[80] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium transition-all ${
          toastMsg.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
            : "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400"
        }`}>
          {toastMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Assessments</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-bold">Assessments</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => fetchTests()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stats.total}</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Total Assessments</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stats.scheduled}</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Scheduled</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stats.completed}</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Completed</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stats.draft}</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Draft</p>
          </div>
        </div>
      </div>

      {/* Search Filter Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm text-left">
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
              <span>Total</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{filteredClassGroups.length}</span>
              <span>{filteredClassGroups.length === 1 ? "Class" : "Classes"}</span>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search classes or subjects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Class Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-40 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredClassGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm gap-3 text-slate-400">
          <GraduationCap className="w-10 h-10 opacity-30" />
          <p className="font-medium text-[14px]">No classes matching search found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredClassGroups.map((c) => {
            const totalAssessments = c.tests.length;
            const upcoming = c.tests.filter(t => t.computedStatus === "scheduled").length;
            const completed = c.tests.filter(t => t.computedStatus === "completed" || t.computedStatus === "published").length;
            
            // Find next assessment date
            const futureTests = c.tests
              .filter(t => t.computedStatus === "scheduled" && new Date(t.test_date).getTime() >= new Date().setHours(0,0,0,0))
              .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
            const nextDate = futureTests.length > 0 ? new Date(futureTests[0].test_date).toLocaleDateString() : null;

            return (
              <div key={c.classId} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden flex flex-col justify-between text-left hover:shadow-md transition-shadow group animate-in fade-in">
                <div>
                  {/* Header of card */}
                  <div className="p-5 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/10">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight">
                          {c.className} {c.section ? <span className="text-slate-400 font-semibold text-[14px]">- {c.section}</span> : ""}
                        </h4>
                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" /> <span className="font-semibold text-slate-700 dark:text-slate-300">{totalAssessments} {totalAssessments === 1 ? 'Assessment' : 'Assessments'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Upcoming</p>
                        <p className="text-[18px] font-bold text-blue-600 dark:text-blue-400 leading-tight mt-1">{upcoming}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Completed</p>
                        <p className="text-[18px] font-bold text-emerald-600 dark:text-emerald-400 leading-tight mt-1">{completed}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                       <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Next Assessment</span>
                       <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                         {nextDate ? nextDate : "None scheduled"}
                       </span>
                    </div>
                  </div>
                </div>

                <Link href={`/assessments/${c.classId}`} className="p-3 border-t border-border/50 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center gap-2 text-[13px] font-bold text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  View Class Assessments <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
