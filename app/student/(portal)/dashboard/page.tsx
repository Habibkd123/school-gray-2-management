"use client";

import React from "react";
import Link from "next/link";
import { useStudentAuth } from "../../context/studentAuth";
import { useSchedules } from "../../../hooks/useSchedules";
import { useHomework } from "../../../hooks/useHomework";
import { useResults } from "../../../hooks/useResults";
import { useLeave } from "../../../hooks/useLeave";
import { useNotices } from "../../../hooks/useNotices";
import {
  TrendingUp,
  BookOpen,
  Award,
  UserCheck,
  CreditCard,
  Clock,
  CalendarDays,
  FileText,
  ArrowRight,
  ChevronRight,
  Megaphone,
  PalmtreeIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function StudentDashboardPage() {
  const { user, studentProfile } = useStudentAuth();
  const classId =
    studentProfile?.class_id && typeof studentProfile.class_id === "object"
      ? studentProfile.class_id._id
      : (studentProfile?.class_id as string);
  const classInfo =
    studentProfile?.class_id && typeof studentProfile.class_id === "object"
      ? `${studentProfile.class_id.name} ${studentProfile.class_id.section}`
      : "";

  const { schedules } = useSchedules(classId);
  const { homework } = useHomework(classId);
  const { results } = useResults();
  const { leaveRequests } = useLeave(undefined, user?.id);
  const { notices } = useNotices();

  // ── Computed data ────────────────────────────────────────────────
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  const todaysClasses = schedules
    .filter((s) => s.day === dayName)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const pendingHomework = homework.filter(
    (hw) => new Date(hw.due_date) >= today
  );

  const myResults = results.filter((r) => {
    const studentId = typeof r.student_id === "object" ? r.student_id._id : r.student_id;
    return studentId === studentProfile?._id;
  });

  const avgGrade =
    myResults.length > 0
      ? Math.round(
          myResults.reduce(
            (sum, r) => sum + (r.total_marks > 0 ? (r.marks_obtained / r.total_marks) * 100 : 0),
            0
          ) / myResults.length
        )
      : 0;

  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending").length;
  const publishedNotices = notices
    .filter((n) => n.is_published)
    .sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());

  // ── Stats cards data ─────────────────────────────────────────────
  const stats = [
    {
      label: "Today's Classes",
      value: todaysClasses.length,
      icon: CalendarDays,
      color: "#6366f1",
      bgColor: "rgba(99,102,241,0.1)",
      borderColor: "rgba(99,102,241,0.2)",
    },
    {
      label: "Pending Homework",
      value: pendingHomework.length,
      icon: BookOpen,
      color: "#f59e0b",
      bgColor: "rgba(245,158,11,0.1)",
      borderColor: "rgba(245,158,11,0.2)",
    },
    {
      label: "Average Grade",
      value: `${avgGrade}%`,
      icon: Award,
      color: "#10b981",
      bgColor: "rgba(16,185,129,0.1)",
      borderColor: "rgba(16,185,129,0.2)",
    },
    {
      label: "Pending Leaves",
      value: pendingLeaves,
      icon: PalmtreeIcon,
      color: "#f43f5e",
      bgColor: "rgba(244,63,94,0.1)",
      borderColor: "rgba(244,63,94,0.2)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-white"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)", transform: "translate(100px, -100px)" }} />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)", transform: "translate(-50px, 50px)" }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Welcome back, {user?.name?.split(" ")[0] || "Student"} 👋
            </h1>
            <p className="text-indigo-200 text-[13px] mt-1">
              {classInfo && `Class ${classInfo} • `}
              {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Link
            href="/student/homework"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-sm transition-all"
          >
            View Homework <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: stat.bgColor, border: `1px solid ${stat.borderColor}` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Today's Classes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Classes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                Today&apos;s Classes
              </h3>
              <Link
                href="/student/routine"
                className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
              >
                Full Routine <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todaysClasses.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-[13px] text-slate-400">No classes scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysClasses.map((cls, idx) => {
                  const subject = typeof cls.subject_id === "object" ? cls.subject_id.name : String(cls.subject_id);
                  const teacher = typeof cls.teacher_id === "object" ? cls.teacher_id.name : "";
                  const colors = ["#6366f1", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];
                  const color = colors[idx % colors.length];

                  return (
                    <div
                      key={cls._id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div
                        className="w-1 h-12 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white">{subject}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {teacher && `${teacher} • `}{cls.room ? `Room ${cls.room}` : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                          {cls.start_time}
                        </p>
                        <p className="text-[11px] text-slate-400">{cls.end_time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Homework */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                Recent Homework
              </h3>
              <Link
                href="/student/homework"
                className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {homework.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-[13px] text-slate-400">No homework assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {homework.slice(0, 4).map((hw) => {
                  const subject = typeof hw.subject_id === "object" ? hw.subject_id.name : "";
                  const isPastDue = new Date(hw.due_date) < today;
                  const hasSubmitted = hw.submissions?.some((s) => {
                    const sid = typeof s.student_id === "object" ? s.student_id._id : s.student_id;
                    return sid === studentProfile?._id;
                  });

                  return (
                    <div
                      key={hw._id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: hasSubmitted
                            ? "rgba(16,185,129,0.1)"
                            : isPastDue
                            ? "rgba(244,63,94,0.1)"
                            : "rgba(245,158,11,0.1)",
                        }}
                      >
                        {hasSubmitted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : isPastDue ? (
                          <XCircle className="w-5 h-5 text-rose-500" />
                        ) : (
                          <FileText className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                          {hw.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {subject && `${subject} • `}Due:{" "}
                          {new Date(hw.due_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          hasSubmitted
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : isPastDue
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                        }`}
                      >
                        {hasSubmitted ? "Submitted" : isPastDue ? "Overdue" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Notices + Leaves + Quick Links */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-4">Quick Links</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { href: "/student/results", icon: Award, label: "Results", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
                { href: "/student/attendance", icon: UserCheck, label: "Attendance", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
                { href: "/student/fees", icon: CreditCard, label: "Fees", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                      style={{ background: link.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: link.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Leave Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PalmtreeIcon className="w-4 h-4 text-rose-500" />
                Leave Status
              </h3>
              <Link
                href="/student/leave"
                className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
              >
                Apply <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {leaveRequests.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-4">No leave requests</p>
            ) : (
              <div className="space-y-2.5">
                {leaveRequests.slice(0, 3).map((leave) => {
                  const statusConfig = {
                    approved: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                    rejected: { icon: XCircle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
                    pending: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
                  }[leave.status] || { icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-50" };
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={leave._id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${statusConfig.bg}`}
                    >
                      <StatusIcon className={`w-4 h-4 ${statusConfig.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-900 dark:text-white capitalize">
                          {leave.leave_type} Leave
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(leave.from_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" — "}
                          {new Date(leave.to_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${statusConfig.color}`}>
                        {leave.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notices */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-500" />
                Notices
              </h3>
              <Link
                href="/student/notices"
                className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
              >
                All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {publishedNotices.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-4">No notices</p>
            ) : (
              <div className="space-y-3">
                {publishedNotices.slice(0, 3).map((notice) => (
                  <div
                    key={notice._id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">
                      {notice.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(notice.publish_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
