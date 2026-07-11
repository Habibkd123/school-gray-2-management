"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus, ArrowRight, RefreshCcw, Calendar as CalendarIcon,
  UserCheck, CalendarDays, Megaphone, Users, Clock, BookOpen,
  Award, FileText, CheckCircle2, X,
} from "lucide-react";
import { useNotices } from "../../hooks/useNotices";
import { useHolidays } from "../../hooks/useHolidays";
import { useLeave } from "../../hooks/useLeave";
import { useDashboardStats } from "../../hooks/useDashboardStats";
import { useThemeColors } from "../SchoolThemeProvider";
import {
  SkeletonStatCard,
  SkeletonLeaveCard,
  SkeletonListItem,
} from "../ui/SkeletonCard";

interface AdminDashboardProps {
  user: any;
}

const AdminDashboard = React.memo(function AdminDashboard({ user }: AdminDashboardProps) {
  useThemeColors(); // keep theme subscription
  const [attendanceTab, setAttendanceTab] = useState<'Students' | 'Teachers' | 'Staff'>('Students');

  // ── Data hooks ──────────────────────────────────────────────────
  // NOTE: useStudents / useTeachers / useClasses / useResults /
  //       useFeePayments / useSubjects have been removed.
  // All counts now come from the single lightweight /api/dashboard/stats endpoint.
  const { stats: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { notices, loading: noticesLoading }              = useNotices();
  const { holidays }                                        = useHolidays();
  const { leaveRequests: leaves, loading: leavesLoading } = useLeave();

  // ── Derived values from dashboardStats ──────────────────────────
  const totalStudents = dashboardStats?.students.total  ?? 0;
  const activeStudents   = dashboardStats?.students.active  ?? 0;
  const inactiveStudents = dashboardStats?.students.inactive ?? 0;

  const totalTeachers    = dashboardStats?.teachers.total   ?? 0;
  const activeTeachers   = dashboardStats?.teachers.active  ?? 0;
  const inactiveTeachers = dashboardStats?.teachers.inactive ?? 0;

  const totalClasses  = dashboardStats?.classes.total ?? 0;

  const emergencyLeaves    = dashboardStats?.attendance?.marked ? (dashboardStats.attendance.leave   ?? 0) : 0;
  const absentLeavesCount  = dashboardStats?.attendance?.marked ? (dashboardStats.attendance.absent  ?? 0) : 0;
  const lateCount          = dashboardStats?.attendance?.marked ? (dashboardStats.attendance.late    ?? 0) : 0;
  const presentLeaves      = dashboardStats?.attendance?.marked ? (dashboardStats.attendance.present ?? 0) : 0;
  const attendanceRateMock = dashboardStats?.attendance?.marked && dashboardStats?.attendance?.percentage !== null
    ? dashboardStats!.attendance.percentage!.toFixed(1)
    : "0.0";
  const attendanceRateVal    = parseFloat(attendanceRateMock) || 0;
  const attendanceGaugeLength = (125.66 * attendanceRateVal) / 100;

  // ── Calendar ─────────────────────────────────────────────────────
  const today = new Date();
  const calendarDays = useMemo(() => {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDate  = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: Date[] = [];
    let d = new Date(startDate);
    while (d <= endDate) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [today]);

  return (
    <div className="space-y-6 text-left">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-[#262D4A] rounded-xl text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-left card-shadow">
        <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: "url('/asset 11.svg')", backgroundSize: "cover", backgroundPosition: "center right" }} />

        <div className="relative z-10">
          <h2 className="section-title flex items-center gap-3">
            Welcome Back, {user?.name?.split(' ')[0] || 'Admin'}
            <Link href="/settings/profile" title="Edit Profile" className="bg-white/10 p-1.5 rounded-lg border border-white/20 hover:bg-white/20 transition-colors cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </Link>
          </h2>
          <p className="text-[13px] text-slate-300 mt-2">Have a Good day at work</p>
        </div>
        <div className="relative z-10 mt-4 md:mt-0 flex items-center gap-1.5 text-[12px] text-slate-300 bg-black/20 px-4 py-2 rounded-lg">
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Updated {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Top Metric Cards — show skeleton until dashboardStats resolves */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {statsLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            {/* Students Card */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src="/asset 7.webp" alt="Students" className="w-[52px] h-[52px] object-contain" />
                  <div className="text-left">
                    <h3 className="section-title leading-none">{totalStudents}</h3>
                    <p className="card-subtitle text-[13px] mt-1">Total Students</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500 dark:text-slate-400">Active : <strong className="text-slate-900 dark:text-white">{activeStudents}</strong></span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 dark:text-slate-400">Inactive : <strong className="text-slate-900 dark:text-white">{inactiveStudents}</strong></span>
              </div>
            </div>

            {/* Teachers Card */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src="/asset 8.webp" alt="Teachers" className="w-[52px] h-[52px] object-contain" />
                  <div className="text-left">
                    <h3 className="section-title leading-none">{totalTeachers}</h3>
                    <p className="card-subtitle text-[13px] mt-1">Total Teachers</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500 dark:text-slate-400">Active : <strong className="text-slate-900 dark:text-white">{activeTeachers}</strong></span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 dark:text-slate-400">Inactive : <strong className="text-slate-900 dark:text-white">{inactiveTeachers}</strong></span>
              </div>
            </div>

            {/* Classes Card */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src="/asset 9.webp" alt="Classes" className="w-[52px] h-[52px] object-contain" />
                  <div className="text-left">
                    <h3 className="section-title leading-none">{totalClasses}</h3>
                    <p className="card-subtitle text-[13px] mt-1">Total Classes</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500 dark:text-slate-400">Sections : <strong className="text-slate-900 dark:text-white">{totalClasses}</strong></span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1: Schedules / Calendar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Schedules</h3>
              <Link href="/classes/schedule" className="text-[12px] font-semibold text-primary flex items-center gap-1 hover:text-[var(--primary-hover)]">
                <Plus className="w-3.5 h-3.5" />
                Add New
              </Link>
            </div>

            <div className="w-full text-center">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="font-bold text-[14px] text-slate-900 dark:text-white">
                  {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-[12px] font-semibold text-slate-900 dark:text-white mb-2">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-[13px] text-slate-600 dark:text-slate-300">
                {calendarDays.map((d, i) => {
                  const isCurrentMonth = d.getMonth() === today.getMonth();
                  const isToday        = d.toDateString() === today.toDateString();
                  const hasHoliday     = holidays.some(h => new Date(h.date).toDateString() === d.toDateString());
                  return (
                    <div key={i} className={`p-2 rounded-lg font-medium text-[12px] transition-colors ${isToday
                      ? 'bg-primary text-white font-bold shadow-sm'
                      : hasHoliday
                        ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                        : isCurrentMonth
                          ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}>
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Today's Attendance */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Today's Attendance</h3>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                {today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {statsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="bg-slate-100 dark:bg-slate-800/40 rounded-lg p-3 h-14" />
                  ))}
                </div>
                <div className="h-32 rounded-lg bg-slate-100 dark:bg-slate-800/40 mt-4" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className="bg-[#F8F9FA] dark:bg-slate-800/40 rounded-lg p-3 text-center border border-slate-100 dark:border-slate-700/50">
                    <div className="text-[15px] font-bold text-slate-900 dark:text-white">{presentLeaves < 10 ? `0${presentLeaves}` : presentLeaves}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Present</div>
                  </div>
                  <div className="bg-[#F8F9FA] dark:bg-slate-800/40 rounded-lg p-3 text-center border border-slate-100 dark:border-slate-700/50">
                    <div className="text-[15px] font-bold text-slate-900 dark:text-white">{absentLeavesCount < 10 ? `0${absentLeavesCount}` : absentLeavesCount}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Absent</div>
                  </div>
                  <div className="bg-[#F8F9FA] dark:bg-slate-800/40 rounded-lg p-3 text-center border border-slate-100 dark:border-slate-700/50">
                    <div className="text-[15px] font-bold text-slate-900 dark:text-white">{lateCount < 10 ? `0${lateCount}` : lateCount}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Late</div>
                  </div>
                </div>

                <div className="flex-1 mt-6 flex flex-col items-center justify-end overflow-hidden relative min-h-[140px]">
                  <svg viewBox="0 0 100 50" className="w-[80%] h-auto drop-shadow-md">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round" className="dark:stroke-slate-800" />
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--success)" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${attendanceGaugeLength} 125.66`}
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute bottom-5 text-[12px] font-extrabold text-slate-800 dark:text-slate-200">{attendanceRateMock}%</div>
                </div>
                <div className="mt-4 flex justify-center">
                  <Link href="/attendance/student" className="bg-[#F1F3F5] dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[12px] px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <CalendarIcon className="w-3.5 h-3.5" /> View All
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* COLUMN 3: Quick Links */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-5">Quick Links</h3>
            <div className="grid grid-cols-4 gap-3">
              <Link href="/academic/class-routine" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                <div className="w-12 h-12 rounded-full bg-[#E8F8E8] border border-[#BDE8B5] text-success flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Calendar</span>
              </Link>
              <Link href="/examination/exam-results" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-[#C5D5FF] text-info flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight">Result</span>
              </Link>
              <Link href="/attendance/student" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                <div className="w-12 h-12 rounded-full bg-[var(--section-alt)] border border-[#FFE7B3] text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Attendance</span>
              </Link>
              <Link href="/reports/student-report" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                <div className="w-12 h-12 rounded-full bg-[#EAF9F5] border border-[#C4F0E4] text-success flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Requests */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Leave Requests</h3>
          <Link href="/leave/approve-leave-request" className="text-[12px] font-medium text-primary hover:text-[var(--primary-hover)]">
            View All
          </Link>
        </div>
        <div className="flex-1 space-y-4">
          {leavesLoading ? (
            <SkeletonLeaveCard count={2} />
          ) : leaves.filter(l => l.status === 'pending').slice(0, 3).length === 0 ? (
            <p className="text-[13px] text-slate-400">No pending leave requests.</p>
          ) : leaves.filter(l => l.status === 'pending').slice(0, 3).map((leave) => {
            const leaveUser     = typeof leave.user_id === 'object' ? (leave.user_id as any) : null;
            const leaveTypeName = typeof leave.leave_type === 'object' ? (leave.leave_type as any)?.name : (leave.leave_type || 'Leave');
            return (
              <div key={leave._id} className="border border-slate-100 dark:border-slate-800/50 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    {leaveUser?.photo_url ? (
                      <img src={leaveUser.photo_url} alt={leaveUser.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                        {(leaveUser?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {leaveUser?.name || 'Unknown'}
                        <span className="bg-[var(--section-alt)] text-primary text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{leaveTypeName}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{leaveUser?.role || ''}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800/50 text-slate-500 dark:text-slate-400">
                  <span>Leave : <strong className="text-slate-800 dark:text-slate-100">{new Date(leave.from_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - {new Date(leave.to_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</strong></span>
                  <span>Applied : <strong className="text-slate-800 dark:text-slate-100">{new Date(leave.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Links Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/attendance/student" className="bg-[var(--section-alt)] hover:bg-[#ffeed1] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#FFE7B3]">
          <div className="flex items-center gap-3 text-primary font-bold text-[13px]">
            <div className="w-10 h-10 bg-primary rounded-lg text-white flex items-center justify-center shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            View Attendance
          </div>
          <div className="w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-primary"><X className="w-3 h-3 rotate-45" /></div>
        </Link>

        <Link href="/notices" className="bg-[#E8F8E8] hover:bg-[#d5f3d5] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#BDE8B5]">
          <div className="flex items-center gap-3 text-success font-bold text-[13px]">
            <div className="w-10 h-10 bg-success rounded-lg text-white flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5" />
            </div>
            New Events
          </div>
          <div className="w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-success"><X className="w-3 h-3 rotate-45" /></div>
        </Link>

        <Link href="/examination/exam-results" className="bg-[#FFEBF0] hover:bg-[#ffdce5] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#FFCCD8]">
          <div className="flex items-center gap-3 text-danger font-bold text-[13px]">
            <div className="w-10 h-10 bg-danger rounded-lg text-white flex items-center justify-center shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            Exam Results
          </div>
        </Link>
      </div>

      {/* Notice Board */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left pb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Notice Board</h3>
          <Link href="/notices" className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200">View All</Link>
        </div>
        <div className="divide-y divide-border flex-1">
          {noticesLoading ? (
            <SkeletonListItem count={4} />
          ) : notices.length === 0 ? (
            <p className="text-[13px] text-slate-400 py-3">No recent notices.</p>
          ) : notices.slice(0, 5).map((notice) => {
            let Icon      = FileText;
            let bgColor   = 'bg-blue-500/15';
            let textColor = 'text-blue-500';

            const aud = String(notice.target_audience).toLowerCase();
            if (aud === 'all') {
              Icon = Megaphone; bgColor = 'bg-primary/15'; textColor = 'text-primary';
            } else if (aud === 'teachers' || aud === 'staff') {
              Icon = Users; bgColor = 'bg-emerald-500/15'; textColor = 'text-emerald-500';
            } else if (aud === 'students') {
              Icon = BookOpen; bgColor = 'bg-amber-500/15'; textColor = 'text-amber-500';
            } else if (aud === 'parents') {
              Icon = Clock; bgColor = 'bg-purple-500/15'; textColor = 'text-purple-500';
            }

            return (
              <div key={notice._id} className="py-3.5 first:pt-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full ${bgColor} ${textColor} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{notice.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <CalendarIcon className="w-3 h-3" /> Added on : {new Date(notice.publish_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded capitalize whitespace-nowrap ml-2 shrink-0">
                  {notice.target_audience}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default AdminDashboard;
