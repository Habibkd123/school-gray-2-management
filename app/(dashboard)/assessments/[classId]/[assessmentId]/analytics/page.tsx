"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  ArrowLeft, BarChart2, Loader2, AlertTriangle, TrendingUp,
  TrendingDown, Users, Target, AlertCircle, BookOpen,
} from "lucide-react";

interface AnalyticsData {
  total_students: number;
  marks_entered: number;
  highest: number | null;
  lowest: number | null;
  average: number | null;
  pass_count: number;
  fail_count: number;
  pass_percentage: number;
  fail_percentage: number;
  chapter: string | null;
  chapter_alert: string | null;
  total_marks: number;
  passing_marks: number;
}

export default function AnalyticsPage({ params }: { params: Promise<{ classId: string; assessmentId: string }> }) {
  const { classId, assessmentId } = React.use(params);
  const router = useRouter();
  const [testTitle, setTestTitle] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, testRes] = await Promise.all([
          fetch(`/api/assessments/${assessmentId}/analytics`, { headers: getAuthHeaders() }),
          fetch(`/api/assessments/${assessmentId}`, { headers: getAuthHeaders() }),
        ]);
        const analyticsData = await analyticsRes.json();
        const testData = await testRes.json();

        if (analyticsData.success) setData(analyticsData.data);
        if (testData.success) setTestTitle(testData.data.title || "");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [assessmentId]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const noData = !data || data.marks_entered === 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-[20px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Performance Analytics
          </h1>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">{testTitle}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/assessments/${classId}/${assessmentId}/results`}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            View Results
          </Link>
        </div>
      </div>

      {/* Chapter Alert */}
      {data?.chapter_alert && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">Chapter Performance Alert</p>
            <p className="text-[12px] text-amber-600 dark:text-amber-400/80 mt-0.5">{data.chapter_alert}</p>
          </div>
        </div>
      )}

      {noData ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-12 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
            <BarChart2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">No marks entered yet</p>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">Analytics will appear once marks are entered for this test.</p>
          <Link href={`/assessments/${classId}/${assessmentId}/marks`}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[13px] font-semibold">
            <BookOpen className="w-4 h-4" /> Enter Marks
          </Link>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Highest", value: data!.highest ?? "—", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
              { label: "Lowest", value: data!.lowest ?? "—", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
              { label: "Average", value: data!.average ?? "—", icon: Target, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
              { label: "Total Marks", value: data!.total_marks, icon: BarChart2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
              { label: "Appeared", value: data!.marks_entered, icon: Users, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800" },
            ].map((s) => {
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

          {/* Pass vs Fail */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 mb-5">Pass / Fail Distribution</h2>

            <div className="space-y-4">
              {/* Pass */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Passed
                  </span>
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                    {data!.pass_count} students ({data!.pass_percentage}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${data!.pass_percentage}%` }}
                  />
                </div>
              </div>

              {/* Fail */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Failed
                  </span>
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                    {data!.fail_count} students ({data!.fail_percentage}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-700"
                    style={{ width: `${data!.fail_percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Visual ring summary */}
            <div className="mt-6 flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" className="w-24 h-24 rotate-[-90deg]">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3"
                    className="text-slate-100 dark:text-slate-800" />
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#10b981" strokeWidth="3"
                    strokeDasharray={`${data!.pass_percentage} ${100 - data!.pass_percentage}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[16px] font-bold text-slate-900 dark:text-slate-100">{data!.pass_percentage}%</span>
                  <span className="text-[9px] text-slate-400">Pass Rate</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[12px] text-slate-500">Passing Marks</span>
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{data!.passing_marks} / {data!.total_marks}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[12px] text-slate-500">Class Average vs Passing</span>
                  <span className={`text-[13px] font-bold ${(data!.average || 0) >= data!.passing_marks ? "text-emerald-600" : "text-rose-500"}`}>
                    {data!.average} {(data!.average || 0) >= data!.passing_marks ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chapter info */}
          {data?.chapter && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Chapter Covered</p>
              </div>
              <p className="text-[14px] text-slate-600 dark:text-slate-400 font-medium">{data.chapter}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
