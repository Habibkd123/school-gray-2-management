"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useStudents } from "../../hooks/useStudents";
import { useTeachers } from "../../hooks/useTeachers";
import { useClasses } from "../../hooks/useClasses";
import { useFeePayments } from "../../hooks/useFees";
import { useNotices } from "../../hooks/useNotices";
import { useHomework } from "../../hooks/useHomework";
import { useAuth } from "../../context/auth";
import { useAppState } from "../../context/store";
import { useSchedules } from "../../hooks/useSchedules";
import { useHolidays } from "../../hooks/useHolidays";
import { useResults } from "../../hooks/useResults";
import { getAuthHeaders, getStoredUser } from "@/lib/utils/session";
import { useLeave } from "../../hooks/useLeave";
import { useSubjects } from "../../hooks/useSubjects";
import { useParent } from "../../hooks/useParent";
import { ParentOverview } from "../../components/parent/ParentOverview";
import { LineChart, BarChart, DoughnutChart } from "../../components/ui/charts";
import {
  Plus,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  CalendarDays,
  X,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Award,
  Clock,
  BookOpen,
  DollarSign,
  FileText,
  UserCheck,
  Megaphone,
  Users,
  Share2,
  ChevronDown,
  Building2,
  Loader2
} from "lucide-react";

export default function DashboardPage() {
  // ── Synchronous role detection ──────────────────────────────────
  // getStoredUser() reads from localStorage synchronously (no effect needed)
  // so we can determine the role on the very first render and skip
  // API fetches that are irrelevant to this user's role.
  const storedUser = getStoredUser();
  const storedRole = storedUser?.role ?? "school_admin";

  const isAdmin      = storedRole === "school_admin";
  const isTeacher    = storedRole === "teacher";
  const isStudent    = storedRole === "student";
  const isParent     = storedRole === "parent";
  const isSuperAdmin = storedRole === "super_admin";

  // ── Hooks — skip irrelevant fetches per role ────────────────────
  const { students } = useStudents({ skip: isSuperAdmin });
  const { teachers } = useTeachers({ skip: isSuperAdmin || isStudent || isParent });
  const { classes }  = useClasses({ skip: isSuperAdmin || isStudent || isParent });
  // Fees only used in admin dashboard — pass skip as second arg (studentId is first)
  const { payments } = useFeePayments(undefined, { skip: !isAdmin });
  // Notices needed by all roles
  const { notices }  = useNotices();
  // Homework: teacher, student, parent — classId is first arg, options second
  const { homework } = useHomework(undefined, { skip: isSuperAdmin || isAdmin });
  // Schedules: teacher, student, parent — classId/teacherId are first two args, options third
  const { schedules } = useSchedules(undefined, undefined, { skip: isSuperAdmin || isAdmin });
  // Holidays: admin + teacher for calendar
  const { holidays }  = useHolidays({ skip: isSuperAdmin || isStudent || isParent });
  // Results: admin, teacher, student
  const { results }   = useResults({ skip: isSuperAdmin || isParent });
  // Leave: admin (attendance tab), teacher — statusFilter/userId are first two args, options third
  const { leaveRequests: leaves } = useLeave(undefined, undefined, { skip: isSuperAdmin || isStudent || isParent });
  // Subjects: admin only — classId is first arg, options second
  const { subjects }  = useSubjects(undefined, { skip: !isAdmin });
  const { user }      = useAuth();
  const { academicYear } = useAppState();
  // Parent portal only
  const { children, selectedChildId, setSelectedChildId, isLoading: parentLoading } = useParent({ skip: !isParent });

  const [attendanceTab, setAttendanceTab] = useState<'Students' | 'Teachers' | 'Staff'>('Students');

  const [superAdminSchools, setSuperAdminSchools] = useState<any[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  React.useEffect(() => {
    if (user?.role === "super_admin") {
      setLoadingSchools(true);
      fetch("/api/schools", { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSuperAdminSchools(data.data);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingSchools(false));
    }
  }, [user]);

  // ----------------------------------------------------
  // ADMIN DASHBOARD CALCULATIONS
  // ----------------------------------------------------
  // ── Memoized derived sets (rebuilt only when source arrays change) ─
  const studentIdsInYear = useMemo(() => new Set(students.map(s => s._id)), [students]);
  const classIdsInYear   = useMemo(() => new Set(classes.map(c => c._id)), [classes]);

  const filteredSubjects = useMemo(() => subjects.filter(sub => {
    const classId = typeof (sub.class_id as any) === 'object' ? (sub.class_id as any)?._id : sub.class_id;
    return classIdsInYear.has(classId);
  }), [subjects, classIdsInYear]);

  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;

  const activeTabRole = attendanceTab === 'Students' ? 'student' : (attendanceTab === 'Teachers' ? 'teacher' : 'admin');

  const filteredLeaves = leaves.filter(l => {
    const leaveUser = typeof l.user_id === 'object' ? l.user_id : null;
    if (leaveUser?.role === 'student') {
      return studentIdsInYear.has(leaveUser._id);
    }
    return leaveUser?.role === activeTabRole;
  });

  const emergencyLeaves = filteredLeaves.filter(l => l.leave_type === 'emergency').length;
  const casualLeaves = filteredLeaves.filter(l => l.leave_type === 'casual').length;
  const sickLeaves = filteredLeaves.filter(l => l.leave_type === 'sick').length;
  const absentLeavesCount = casualLeaves + sickLeaves;
  const lateCount = 0; // Placeholder for now

  const totalCountForTab = attendanceTab === 'Students' ? totalStudents : (attendanceTab === 'Teachers' ? totalTeachers : 0);
  const totalPresent = Math.max(0, totalCountForTab - emergencyLeaves - absentLeavesCount);
  const totalMockAttendance = totalCountForTab > 0 ? totalCountForTab : (totalPresent + emergencyLeaves + absentLeavesCount);
  const attendanceRateMock = totalMockAttendance > 0 ? ((totalPresent / totalMockAttendance) * 100).toFixed(1) : "0.0";

  const filteredResults = useMemo(() => results.filter(r => {
    const studentId = typeof r.student_id === 'object' ? r.student_id?._id : r.student_id;
    return studentIdsInYear.has(studentId);
  }), [results, studentIdsInYear]);

  const globalPerformers = useMemo(() => [...filteredResults]
    .map(r => ({
      ...r,
      percentage: r.total_marks > 0 ? (r.marks_obtained / r.total_marks) * 100 : 0
    }))
    .sort((a, b) => b.percentage - a.percentage)
  , [filteredResults]);

  const bestStudent = globalPerformers[0] || null;
  const starStudent = globalPerformers[1] || null;

  const topCount      = useMemo(() => filteredResults.filter(r => r.total_marks > 0 && (r.marks_obtained / r.total_marks) >= 0.8).length,  [filteredResults]);
  const avgCount      = useMemo(() => filteredResults.filter(r => r.total_marks > 0 && (r.marks_obtained / r.total_marks) >= 0.5 && (r.marks_obtained / r.total_marks) < 0.8).length, [filteredResults]);
  const belowAvgCount = useMemo(() => filteredResults.filter(r => r.total_marks > 0 && (r.marks_obtained / r.total_marks) < 0.5).length, [filteredResults]);

  const filteredPayments = useMemo(() => payments.filter(p => {
    const studentId = typeof p.student_id === 'object' ? p.student_id?._id : p.student_id;
    return studentIdsInYear.has(studentId);
  }), [payments, studentIdsInYear]);

  const totalRevenue = useMemo(() =>
    filteredPayments.reduce((acc: number, curr) => acc + curr.amount_paid, 0)
  , [filteredPayments]);

  // Fee Quarters Calculation for Chart
  const getQuarter    = (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}: ${date.getFullYear()}`;
  const getQuarterKey = (date: Date) => `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;

  const { feeQuarters, maxFee } = useMemo(() => {
    const quarterStats = new Map<string, { label: string; collected: number; expected: number }>();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - i * 3, 1);
      const key = getQuarterKey(d);
      quarterStats.set(key, { label: getQuarter(d), collected: 0, expected: 5000 });
    }
    filteredPayments.forEach(p => {
      const pDate = new Date(p.transaction_date);
      const key = getQuarterKey(pDate);
      if (quarterStats.has(key)) {
        const stat = quarterStats.get(key)!;
        stat.collected += p.amount_paid;
        if (stat.collected > stat.expected) stat.expected = stat.collected * 1.2;
      }
    });
    const quarters = Array.from(quarterStats.values());
    return { feeQuarters: quarters, maxFee: Math.max(1000, ...quarters.map(q => q.expected)) };
  }, [filteredPayments]);

  // ----------------------------------------------------
  // TEACHER LOGIC (uses real API data where available)
  // ----------------------------------------------------
  const teacher = teachers[0];
  const assignedClass = classes[0];
  const classStudents = assignedClass
    ? students.filter((s) => {
      const cId = typeof s.class_id === "object" ? s.class_id?._id : s?.class_id;
      return cId === assignedClass?._id;
    })
    : [];

  const todayAttendanceRate = 90; // Placeholder — wire to useAttendance for real data
  const pendingSubmissions = homework.length; // Placeholder count

  const classGradeStats = [
    { label: "English", value: 87 },
    { label: "Mathematics", value: 81 },
    { label: "Science", value: 83 },
    { label: "History", value: 85 }
  ];

  // ----------------------------------------------------
  // STUDENT LOGIC
  // ----------------------------------------------------
  const student = students.find(s => {
    const sUserId = typeof s.user_id === 'object' && s.user_id ? s.user_id._id : s.user_id;
    return sUserId === user?.id;
  }) || students[0];
  const studentAttendanceRate = 95; // Placeholder
  const pendingHwCount = homework.length; // Placeholder
  const averageGrade = 88; // Placeholder
  const studentPendingFees = 0; // Mocked for now

  // Map roles to dashboard views
  let activeRole: "super_admin" | "admin" | "teacher" | "student" | "parent" = "admin";
  if (user?.role === "super_admin") activeRole = "super_admin";
  else if (user?.role === "teacher") activeRole = "teacher";
  else if (user?.role === "parent") activeRole = "parent";
  else if (user?.role === "student") activeRole = "student";

  const selectedChild = children.find(c => c._id === selectedChildId) || children[0] || null;
  const displayStudent = activeRole === "parent" ? selectedChild : student;

  const today = new Date();
  const currentDayName = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  // Student specific data
  const displayStudentId = displayStudent?._id;
  const displayStudentClassId = typeof displayStudent?.class_id === 'object' ? displayStudent?.class_id?._id : displayStudent?.class_id;

  const studentHomework = homework.filter(hw => {
    const hwClassId = typeof hw.class_id === 'object' ? hw.class_id?._id : hw.class_id;
    return hwClassId === displayStudentClassId;
  });

  const studentSchedules = schedules.filter(s => {
    const sClassId = typeof s.class_id === 'object' ? s.class_id?._id : s.class_id;
    return sClassId === displayStudentClassId;
  });

  const studentResults = results.filter(r => {
    const rStudentId = typeof r.student_id === 'object' ? r.student_id?._id : r.student_id;
    return rStudentId === displayStudentId;
  });

  const studentLeaves = leaves.filter(l => {
    const lUserId = typeof l.user_id === 'object' ? l.user_id?._id : l.user_id;
    return lUserId === displayStudentId;
  });

  const studentTodaysClasses = studentSchedules
    .filter(s => s.day === currentDayName)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Latest Notice (used in multiple places)
  const latestNotice = notices.filter(n => n.is_published).sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime())[0];

  // ---------------------------------------------------------------------------
  // Teacher View Calculations
  // ---------------------------------------------------------------------------

  // Assigned Classes & Subjects
  const teacherSchedules = useMemo(() => schedules.filter(s => {
    if (typeof s.teacher_id === 'object' && s.teacher_id !== null) {
      return s.teacher_id._id === user?.id;
    }
    return s.teacher_id === user?.id;
  }), [schedules, user?.id]);

  const uniqueClasses = useMemo(() => Array.from(new Set(teacherSchedules.map(s => {
    if (typeof s.class_id === 'object' && s.class_id !== null) {
      return `${s.class_id?.name} ${s.class_id?.section}`;
    }
    return String(s.class_id);
  }))), [teacherSchedules]);

  const uniqueSubjects = useMemo(() => Array.from(new Set(teacherSchedules.map(s => {
    if (typeof s.subject_id === 'object' && s.subject_id !== null) {
      return s.subject_id.name;
    }
    return String(s.subject_id);
  }))), [teacherSchedules]);

  // Today's classes
  const todaysClasses = teacherSchedules
    .filter(s => s.day === currentDayName)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Upcoming Events (combine holidays & notices)
  const upcomingEvents = [
    ...holidays
      .filter(h => new Date(h.date) >= today)
      .map(h => ({
        id: h._id,
        title: h.title,
        date: new Date(h.date),
        type: 'holiday',
        icon: 'Award',
        color: '#FF4A6B',
        bgColor: '#FFEBF0'
      })),
    ...notices
      .filter(n => new Date(n.publish_date) >= today)
      .map(n => ({
        id: n._id,
        title: n.title,
        date: new Date(n.publish_date),
        type: 'notice',
        icon: 'Users',
        color: '#F59E0B',
        bgColor: '#EAEFFF'
      }))
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  // Student Progress & Best Performers
  const teacherSubjectIds = new Set(teacherSchedules.map(s => typeof s.subject_id === 'object' ? s.subject_id._id : s.subject_id));
  const teacherResults = results.filter(r => teacherSubjectIds.has(typeof r.subject_id === 'object' ? r.subject_id._id : r.subject_id));

  // Best Performers (top 3 by percentage)
  const bestPerformers = [...teacherResults]
    .map(r => ({
      ...r,
      percentage: r.total_marks > 0 ? (r.marks_obtained / r.total_marks) * 100 : 0
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  // Leave Requests (For Attendance summary box)
  const myLeaves = leaves.filter(l => {
    if (typeof l.user_id === 'object') return l.user_id._id === user?.id;
    return l.user_id === user?.id;
  }).sort((a, b) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime());

  // Calendar Generation
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday

  const calendarDays = [];
  let d = new Date(startDate);
  while (d <= endDate) {
    calendarDays.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Pending leaves count
  const pendingLeaves = myLeaves.filter(l => l.status === "pending").length;
  // Approved leaves count
  const approvedLeaves = myLeaves.filter(l => l.status === "approved").length;

  return (
    <div className="space-y-6 max-w-full sm:w-[1600px] mx-auto">
      {/* ----------------------------------------------------
          GLOBAL PAGE HEADER
          ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {activeRole === "super_admin"
              ? "Super Admin Console"
              : activeRole === "admin"
                ? "Admin Dashboard"
                : activeRole === "teacher"
                  ? "Teacher Dashboard"
                  : activeRole === "parent"
                    ? "Parent Portal"
                    : "Student Dashboard"}
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">
              {activeRole === "super_admin"
                ? "Super Admin Overview"
                : activeRole === "admin"
                  ? "Admin Dashboard"
                  : activeRole === "teacher"
                    ? "Teacher Overview"
                    : activeRole === "parent"
                      ? "Parent Overview"
                      : "Student Overview"}
            </span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-wrap items-center gap-3">
          {activeRole === "super_admin" && (
            <Link
              href="/schools"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New School</span>
            </Link>
          )}
          {activeRole === "admin" && (
            <>
              <Link
                href="/students"
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Student</span>
              </Link>
              {/* Fees Details button hidden (Issue 9) */}
            </>
          )}
          {activeRole === "teacher" && (
            <Link
              href="/attendance"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Mark Attendance</span>
            </Link>
          )}
          {activeRole === "student" && (
            <Link
              href="/academic/class-home-work"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <span>View Homework</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          {activeRole === "parent" && (
            <Link
              href="/parent/attendance"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <span>Check Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------
          PARENT VIEW (Handled in Student View section below)
          ---------------------------------------------------- */}

      {/* ----------------------------------------------------
          SUPER ADMIN VIEW
          ---------------------------------------------------- */}
      {activeRole === "super_admin" && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div
            className="relative overflow-hidden rounded-xl text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-left card-shadow"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div className="relative z-10">
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                Welcome Back, {user?.name || "Super Admin"}
                <span className="bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                  Super Admin
                </span>
              </h2>
              <p className="text-[13px] text-slate-300 mt-2">
                Manage all registered school institutions and access system configurations.
              </p>
            </div>
            <div className="relative z-10 mt-4 md:mt-0 flex items-center gap-1.5 text-[12px] text-slate-300 bg-black/20 px-4 py-2 rounded-lg border border-white/5">
              <RefreshCcw className="w-3.5 h-3.5 animate-spin-hover" />
              <span>System Status: Online</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {loadingSchools ? "..." : superAdminSchools.length}
                </h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Total Schools</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {loadingSchools ? "..." : superAdminSchools.filter(s => s.is_active).length}
                </h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Active Institutions</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                <X className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {loadingSchools ? "..." : superAdminSchools.filter(s => !s.is_active).length}
                </h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Inactive / Suspended</p>
              </div>
            </div>
          </div>

          {/* Grid section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Recent Schools list */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Recent Schools</h3>
                <Link
                  href="/schools"
                  className="text-[12px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                >
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loadingSchools ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Loading schools list...</span>
                </div>
              ) : superAdminSchools.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <p className="text-sm font-medium">No registered schools found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">School</th>
                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Slug</th>
                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {superAdminSchools.slice(0, 5).map((school: any) => (
                        <tr key={school._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3 text-[13.5px] font-bold text-slate-900 dark:text-white">{school.name}</td>
                          <td className="px-5 py-3 text-[12.5px] font-semibold text-amber-600 dark:text-amber-400">{school.slug}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              school.is_active
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-rose-500/15 text-rose-500"
                            }`}>
                              {school.is_active ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href="/schools"
                              className="text-[12px] font-semibold text-slate-500 hover:text-amber-500 underline"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick action card */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-3">Quick Controls</h3>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                  Use the management panel to add new schools, update details, or temporarily suspend access for any school in the network.
                </p>

                <div className="space-y-3">
                  <Link
                    href="/schools"
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer text-slate-700 dark:text-slate-200 text-sm font-semibold"
                  >
                    <span>Add New Campus</span>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </Link>
                  <Link
                    href="/schools"
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer text-slate-700 dark:text-slate-200 text-sm font-semibold"
                  >
                    <span>Manage Institutions</span>
                    <Building2 className="w-4 h-4 text-slate-400" />
                  </Link>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border/50 text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Database Server: Connected
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          ADMIN VIEW
          ---------------------------------------------------- */}
      {activeRole === "admin" && (
        <div className="space-y-6">
          {/* Fee payment alert banner hidden — Issue 16 */}

          {/* Welcome Banner */}
          <div className="relative overflow-hidden bg-[#262D4A] rounded-xl text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-left card-shadow">
            {/* Background elements mockup */}
            <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: "url('/asset 11.svg')", backgroundSize: "cover", backgroundPosition: "center right" }}></div>

            <div className="relative z-10">
              <h2 className="text-2xl font-semibold flex items-center gap-3">
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

          {/* Top Metric Cards — 3 col (Subjects card removed, Issue 10) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Students Card */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src="/asset 7.webp" alt="Students" className="w-full sm:w-[52px] h-[52px] object-contain" />
                  <div className="text-left">
                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white leading-none">{totalStudents}</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Total Students</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500 dark:text-slate-400">Active : <strong className="text-slate-900 dark:text-white">{students.filter(s => s.is_active).length}</strong></span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 dark:text-slate-400">Inactive : <strong className="text-slate-900 dark:text-white">{students.filter(s => !s.is_active).length}</strong></span>
              </div>
            </div>

            {/* Teachers Card */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src="/asset 8.webp" alt="Teachers" className="w-full sm:w-[52px] h-[52px] object-contain" />
                  <div className="text-left">
                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white leading-none">{totalTeachers}</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Total Teachers</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500 dark:text-slate-400">Active : <strong className="text-slate-900 dark:text-white">{teachers.filter((t: any) => t.is_active !== false).length}</strong></span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 dark:text-slate-400">Inactive : <strong className="text-slate-900 dark:text-white">{teachers.filter((t: any) => t.is_active === false).length}</strong></span>
              </div>
            </div>

            {/* Classes Card */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src="/asset 9.webp" alt="Classes" className="w-full sm:w-[52px] h-[52px] object-contain" />
                  <div className="text-left">
                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white leading-none">{totalClasses}</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Total Classes</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-500 dark:text-slate-400">Sections : <strong className="text-slate-900 dark:text-white">{totalClasses}</strong></span>
              </div>
            </div>

            {/* Total Subjects card removed (Issue 10) */}
          </div>

          {/* 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* COLUMN 1: Schedules & Upcoming Events */}
            <div className="space-y-6">
              {/* Schedules card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Schedules</h3>
                  <Link href="/classes/schedule" className="text-[12px] font-semibold text-[#F59E0B] flex items-center gap-1 hover:text-[#D97706]">
                    <Plus className="w-3.5 h-3.5" />
                    Add New
                  </Link>
                </div>

                {/* Dynamic Calendar */}
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
                      const isToday = d.toDateString() === today.toDateString();
                      const hasHoliday = holidays.some(h => new Date(h.date).toDateString() === d.toDateString());
                      return (
                        <div key={i} className={`p-2 rounded-lg font-medium text-[12px] transition-colors ${isToday
                          ? 'bg-[#F59E0B] text-white font-bold shadow-sm'
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

              {/* Upcoming Events Card — Dynamic */}
              {/* <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col  text-left">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-5">Upcoming Events</h3>
                <div className="space-y-4">
                  {upcomingEvents.length === 0 ? (
                    <p className="text-[13px] text-slate-400">No upcoming events.</p>
                  ) : upcomingEvents.map((ev) => (
                    <div key={ev.id} className="relative pl-4 border-l-2 py-1" style={{ borderColor: ev.color }}>
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: ev.bgColor, color: ev.color }}>
                          {ev.type === 'holiday' ? <Award className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white">{ev.title}</h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {ev.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>

            {/* COLUMN 2: Attendance */}
            <div className="space-y-6">
              {/* Attendance widget above — Issue 12 */}
              {/* Attendance Widget — Today's % only (Issue 12) */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Today's Attendance</h3>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className="bg-[#F8F9FA] dark:bg-slate-800/40 rounded-lg p-3 text-center border border-slate-100 dark:border-slate-700/50">
                    <div className="text-[15px] font-bold text-slate-900 dark:text-white">{emergencyLeaves < 10 ? `0${emergencyLeaves}` : emergencyLeaves}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Emergency</div>
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

                {/* Attendance % gauge */}
                <div className="flex-1 mt-6 flex flex-col items-center justify-end overflow-hidden relative min-h-[140px]">
                  <svg viewBox="0 0 100 50" className="w-full sm:w-[80%] h-auto drop-shadow-md">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F59E0B" strokeWidth="20" />
                    <path d="M 85 50 A 40 40 0 0 0 90 50" fill="none" stroke="#1DD04A" strokeWidth="20" />
                  </svg>
                  <div className="absolute bottom-5 text-white text-[11px] font-bold">{attendanceRateMock}%</div>
                </div>
                <div className="mt-4 flex justify-center">
                  <Link href="/attendance/student" className="bg-[#F1F3F5] dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[12px] px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <CalendarIcon className="w-3.5 h-3.5" /> View All
                  </Link>
                </div>
              </div>

              {/* ── Best Performer soft-hidden — Phase 2 (Issue 14) ───────────────────
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#3DC84A] rounded-xl ...">
                  Best Performer card
                </div>
                <div className="bg-[#1975D1] rounded-xl ...">
                  Star Students card
                </div>
              </div>
              ─────────────────────────────────────────────────────────────── */}
            </div>

            {/* COLUMN 3: Quick Links & Class Routine */}
            <div className="space-y-6">
              {/* Performance card removed — Issue 15 */}

              {/* Quick Links Card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-5">Quick Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Link href="/academic/class-routine" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                    <div className="w-12 h-12 rounded-full bg-[#E8F8E8] border border-[#BDE8B5] text-[#1D7F2C] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Calendar</span>
                  </Link>
                  <Link href="/examination/exam-results" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                    <div className="w-12 h-12 rounded-full bg-[#EAEFFF] border border-[#C5D5FF] text-[#3B66FF] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight">Exam Result</span>
                  </Link>
                  <Link href="/attendance/student" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                    <div className="w-12 h-12 rounded-full bg-[#FFF7E6] border border-[#FFE7B3] text-[#F59E0B] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Attendance</span>
                  </Link>
                  {/* Fees quick link hidden (Issue 9) */}
                  <Link href="/homework" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                    <div className="w-12 h-12 rounded-full bg-[#FFEBF0] border border-[#FFCCD8] text-[#FF4A6B] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight">Home work</span>
                  </Link>
                  <Link href="/reports/student-report" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                    <div className="w-12 h-12 rounded-full bg-[#EAF9F5] border border-[#C4F0E4] text-[#1DD04A] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Reports</span>
                  </Link>
                </div>
              </div>

              {/* Class Routine Card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Class Routine</h3>
                  <Link href="/classes/schedule" className="text-[12px] font-semibold text-[#F59E0B] flex items-center gap-1 hover:text-[#D97706]">
                    <Plus className="w-3.5 h-3.5" />
                    Add New
                  </Link>
                </div>
                <div className="space-y-4">
                  {schedules.length === 0 ? (
                    <p className="text-[13px] text-slate-400">No schedules found.</p>
                  ) : schedules.slice(0, 3).map((schedule, i) => {
                    const classInfo = typeof schedule.class_id === 'object' ? `${schedule?.class_id?.name} ${schedule.class_id?.section}` : String(schedule?.class_id || '');
                    const subjectInfo = typeof schedule.subject_id === 'object' ? schedule?.subject_id?.name : String(schedule?.subject_id || '');
                    const teacherInfo = typeof schedule.teacher_id === 'object' ? schedule?.teacher_id : null;
                    const teacherName = teacherInfo?.name || 'Unknown Teacher';
                    const colors = ['#F59E0B', '#FFB800', '#1DD04A'];
                    const avatars = ['/asset 12.webp', '/asset 14.webp', '/asset 13.webp'];
                    const teacherPhoto = teacherInfo?.photo_url || avatars[i % avatars.length];

                    return (
                      <div key={schedule._id} className="border border-border rounded-xl p-3 flex gap-3 items-center">
                        <img src={teacherPhoto} alt={teacherName} className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1.5">
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 capitalize">{schedule.day} - {teacherName}</p>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{subjectInfo}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: '80%', backgroundColor: colors[i % colors.length] }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Performance card removed (Issue 15) ─────────────────────────────
              Performance donut chart & top/avg/below-avg stats
              removed completely from dashboard.
              ─────────────────────────────────────────────────────────────── */}

            </div>
          </div>

          {/* ────────────────────────────────────────────────────
              BOTTOM ROW 1: Fees Collection chart hidden (Issue 16)
              ──────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Leave Requests</h3>
                <Link href="/leave/approve-leave-request" className="text-[12px] font-medium text-[#F59E0B] hover:text-[#D97706]">View All</Link>
              </div>
              <div className="flex-1 space-y-4">
                {leaves.filter(l => l.status === 'pending').slice(0, 3).length === 0 ? (
                  <p className="text-[13px] text-slate-400">No pending leave requests.</p>
                ) : leaves.filter(l => l.status === 'pending').slice(0, 3).map((leave) => {
                  const leaveUser = typeof leave.user_id === 'object' ? leave.user_id : null;
                  const leaveTypeName = typeof leave.leave_type === 'object' ? (leave.leave_type as any)?.name : (leave.leave_type || 'Leave');
                  return (
                    <div key={leave._id} className="border border-slate-100 dark:border-slate-800/50 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                            {((leaveUser as any)?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {(leaveUser as any)?.name || 'Unknown'}
                              <span className="bg-[#FFF7E6] text-[#F59E0B] text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{leaveTypeName}</span>
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{(leaveUser as any)?.role || ''}</p>
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

          {/* ----------------------------------------------------
              BOTTOM ROW 2: ACTION BUTTONS
              ---------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/attendance/student" className="bg-[#FFF7E6] hover:bg-[#ffeed1] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#FFE7B3]">
              <div className="flex items-center gap-3 text-[#F59E0B] font-bold text-[13px]">
                <div className="w-10 h-10 bg-[#F59E0B] rounded-lg text-white flex items-center justify-center shadow-sm">
                  <UserCheck className="w-5 h-5" />
                </div>
                View Attendance
              </div>
              <div className="w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-[#F59E0B]"><ChevronRight className="w-3 h-3" /></div>
            </Link>

            <Link href="/notices" className="bg-[#E8F8E8] hover:bg-[#d5f3d5] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#BDE8B5]">
              <div className="flex items-center gap-3 text-[#1D7F2C] font-bold text-[13px]">
                <div className="w-10 h-10 bg-[#1DD04A] rounded-lg text-white flex items-center justify-center shadow-sm">
                  <CalendarDays className="w-5 h-5" />
                </div>
                New Events
              </div>
              <div className="w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-[#1DD04A]"><ChevronRight className="w-3 h-3" /></div>
            </Link>

            <Link href="/examination/exam-results" className="bg-[#FFEBF0] hover:bg-[#ffdce5] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#FFCCD8]">
              <div className="flex items-center gap-3 text-[#FF4A6B] font-bold text-[13px]">
                <div className="w-10 h-10 bg-[#FF4A6B] rounded-lg text-white flex items-center justify-center shadow-sm">
                  <Award className="w-5 h-5" />
                </div>
                Exam Results
              </div>
            </Link>

          {/* ── Finance & Accounts button hidden (Issue 16) ────────────────
          <Link href="/fees-collection/collect-fees" ...>Finance & Accounts</Link>
          ─────────────────────────────────────────────────────────────── */}
          </div>

          {/* Bottom Row: Notice Board only (Sparklines & Fee Stats hidden — Issue 16) */}
          <div className="grid grid-cols-1 gap-6 pb-6">

            {/* Notice Board */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Notice Board</h3>
                <Link href="/notices" className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200">View All</Link>
              </div>
              <div className="divide-y divide-border flex-1">
                {notices.length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-3">No recent notices.</p>
                ) : notices.slice(0, 5).map((notice, i) => {
                  const icons = [FileText, Megaphone, CalendarDays, BookOpen, Clock];
                  const Icon = icons[i % icons.length];
                  const bgColors = ['bg-[#EAEFFF]', 'bg-[#E8F8E8]', 'bg-[#FFEBF0]', 'bg-[#E6F8FF]', 'bg-[#FFF7E6]'];
                  const textColors = ['text-[#3B66FF]', 'text-[#1DD04A]', 'text-[#FF4A6B]', 'text-[#00B5FF]', 'text-[#F59E0B]'];

                  return (
                    <div key={notice._id} className="py-3.5 first:pt-0 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full ${bgColors[i % bgColors.length]} ${textColors[i % textColors.length]} flex items-center justify-center shrink-0`}>
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

            {/* Total Earnings sparkline hidden (Issue 16) */}
            {/* Total Expenses sparkline hidden (Issue 16) */}
            {/* Fee Stats column hidden (Issue 16) */}

          </div>

        </div>
      )}

      {/* ----------------------------------------------------
          TEACHER VIEW
          ---------------------------------------------------- */}
      {activeRole === "teacher" && (
        <div className="space-y-6">

          {/* Top Row: Banner, Profile, Syllabus */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Welcome Banner */}
            <div className="lg:col-span-6 relative overflow-hidden bg-[#1975D1] rounded-xl text-white p-6 md:p-8 flex flex-col justify-center text-left card-shadow min-h-[160px]">
              <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none" style={{ backgroundImage: "url('/asset 11.svg')", backgroundSize: "cover", backgroundPosition: "center right" }}></div>
              <div className="relative z-10">
                <h2 className="text-[22px] font-bold">Good Morning {user?.name || "Teacher"}</h2>
                <p className="text-[13px] text-white/80 mt-1">Have a Good day at work</p>
                {latestNotice && (
                  <div className="mt-4 text-[12px] text-white/90 font-medium">
                    Notice : {latestNotice.title}
                  </div>
                )}
              </div>
              {/* Optional Illustration */}
              <img src="/student-performer-01.png" alt="" className="absolute right-4 bottom-0 h-[90%] object-contain" />
            </div>

            {/* Profile Card */}
            <div className="lg:col-span-3 bg-[#0F172A] rounded-xl p-5 card-shadow flex items-center gap-4 relative overflow-hidden">
              {/* Abstract dark shapes mockup */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#2D3748] rounded-full opacity-50"></div>

              <img src={(user as any)?.photo_url || "/asset 12.webp"} alt="Profile" className="w-full sm:w-[72px] h-[72px] rounded-lg object-cover border-2 border-slate-700 z-10 bg-slate-800" />
              <div className="z-10 text-left">
                <span className="bg-white text-[#F59E0B] text-[9px] font-bold px-2 py-0.5 rounded uppercase">#{(user as any)?.employee_id || "T094001"}</span>
                <h3 className="text-[15px] font-bold text-white mt-1.5">{user?.name || "Teacher Name"}</h3>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1" title={`Classes : ${uniqueClasses.join(', ')} • ${uniqueSubjects.join(', ')}`}>
                  Classes : {uniqueClasses.length > 0 ? uniqueClasses.slice(0, 2).join(', ') : "None"}  <span className="mx-1">•</span> {uniqueSubjects.length > 0 ? uniqueSubjects[0] : "No Subject"}
                </p>
              </div>
              <button className="absolute bottom-4 right-4 bg-[#F59E0B] text-white text-[11px] font-bold px-3 py-1.5 rounded z-10 hover:bg-[#D97706]">
                Edit Profile
              </button>
            </div>

            {/* Syllabus Progress */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center justify-between text-left">
              <div className="w-full sm:w-[80px] h-[80px] relative shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#FF4A6B" strokeWidth="16" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="12.56" />
                  {/* ~95% filled */}
                </svg>
              </div>
              <div className="flex-1 ml-6">
                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-3">Syllabus</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> Completed : 95%
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-[#FF4A6B]"></span> Pending : 5%
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Main Grid: 8 + 4 cols */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column (8-span) */}
            <div className="lg:col-span-8 space-y-6">

              {/* Today's Class */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Today's Class</h3>
                    <div className="flex items-center gap-1">
                      <button className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronLeft className="w-3.5 h-3.5" /></button>
                      <button className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" /> {today.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' })} <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {todaysClasses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
                    {todaysClasses.map((cls, idx) => {
                      // Alternate colors for variety
                      const colors = [
                        { bg: "bg-[#FF4A6B]", text: "text-[#FF4A6B]" },
                        { bg: "bg-[#F59E0B]", text: "text-[#F59E0B]" },
                        { bg: "bg-[#1DD04A]", text: "text-[#1DD04A]" },
                        { bg: "bg-[#00B5FF]", text: "text-[#00B5FF]" },
                      ];
                      const color = colors[idx % colors.length];

                      return (
                        <div key={cls._id || idx} className="bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50">
                          <div className={`${color.bg} text-white text-[11px] font-bold rounded-md px-2 py-1.5 flex items-center justify-center gap-1.5 w-max mb-3`}>
                            <Clock className="w-3 h-3" /> {cls.start_time} - {cls.end_time}
                          </div>
                          <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                            {typeof cls.class_id === 'object' ? `${cls.class_id?.name} ${cls.class_id?.section}` : 'Class'} <span className="text-slate-400 dark:text-slate-500 ml-1 font-normal">• {typeof cls.subject_id === 'object' ? cls.subject_id.name : 'Subject'}</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-[13px] text-slate-500 dark:text-slate-400 text-center py-6 border border-dashed border-border rounded-xl">
                    No classes scheduled for today
                  </div>
                )}
              </div>

              {/* Attendance & Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* My Leaves Summary */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">My Leaves Summary</h3>
                    <Link href="/leave/apply" className="text-[11px] border border-border px-2 py-1 rounded font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                      Apply Leave
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase mb-1">Approved Leaves</p>
                      <p className="text-[20px] font-bold text-[#1DD04A]">{approvedLeaves}</p>
                    </div>
                    <div className="text-center p-4 bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase mb-1">Pending Requests</p>
                      <p className="text-[20px] font-bold text-[#F59E0B]">{pendingLeaves}</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col space-y-3">
                    <h4 className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 border-b border-border pb-2">Recent Leave Requests</h4>
                    {myLeaves.length > 0 ? (
                      myLeaves.slice(0, 3).map((leave, idx) => (
                        <div key={leave._id || idx} className="flex items-center justify-between">
                          <div>
                            <p className="text-[12px] font-bold text-slate-900 dark:text-white capitalize">{leave.leave_type} Leave</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {new Date(leave.from_date).toLocaleDateString()} - {new Date(leave.to_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${leave.status === 'approved' ? 'bg-[#E8F8E8] text-[#1D7F2C]' :
                            leave.status === 'rejected' ? 'bg-[#FFEBF0] text-[#FF4A6B]' :
                              'bg-[#FFF7E6] text-[#F59E0B]'
                            }`}>
                            {leave.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[12px] text-slate-500 dark:text-slate-400 text-center py-4">No recent leave requests</div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Best Performers */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Best Performers</h3>
                      <Link href="/examination/result" className="text-[12px] font-semibold text-[#F59E0B]">View All</Link>
                    </div>

                    <div className="space-y-5">
                      {bestPerformers.length > 0 ? (
                        bestPerformers.map((result, idx) => {
                          const colors = [
                            { bg: 'bg-[#F59E0B]', bgTrack: 'bg-[#EAEFFF] dark:bg-[#F59E0B]/20' },
                            { bg: 'bg-[#FFB800]', bgTrack: 'bg-[#FFF7E6] dark:bg-[#FFB800]/20' },
                            { bg: 'bg-[#00B5FF]', bgTrack: 'bg-[#E6F8FF] dark:bg-[#00B5FF]/20' },
                          ];
                          const color = colors[idx % colors.length];
                          const studentInfo = typeof result.student_id === 'object' ? result.student_id : null;
                          const studentName = studentInfo?.name || "Student";
                          const studentPhoto = (studentInfo as any)?.photo_url || null;

                          return (
                            <div key={result._id || idx} className="flex items-center justify-between text-[12px] font-bold text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-2 w-28 truncate" title={studentName}>
                                {studentPhoto ? (
                                  <img src={studentPhoto} alt={studentName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className={`w-6 h-6 rounded-full ${color.bgTrack} flex items-center justify-center shrink-0`}>
                                    <span className="text-[9px]">{studentName.charAt(0).toUpperCase()}</span>
                                  </div>
                                )}
                                <span className="truncate">{studentName}</span>
                              </div>
                              <div className={`flex-1 mx-3 h-5 ${color.bgTrack} rounded-full relative overflow-hidden flex items-center px-1`}>
                                <div className={`absolute left-0 top-0 h-full ${color.bg} rounded-full`} style={{ width: `${Math.min(100, result.percentage)}%` }}></div>
                                <div className="flex -space-x-1.5 relative z-10 ml-1">
                                  <span className="text-[9px] text-white mix-blend-difference">{typeof result.subject_id === 'object' ? result.subject_id.name : ""}</span>
                                </div>
                              </div>
                              <span className="w-10 text-right">{Math.round(result.percentage)}%</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[12px] text-slate-500 dark:text-slate-400 text-center py-4">No results published yet for your subjects.</div>
                      )}
                    </div>
                  </div>

                  {/* Student Progress */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Recent Results</h3>
                    </div>

                    <div className="space-y-4">
                      {teacherResults.length > 0 ? (
                        teacherResults.slice(0, 3).map((result, idx) => {
                          const studentInfo = typeof result.student_id === 'object' ? result.student_id : null;
                          const studentName = studentInfo?.name || "Student";
                          const studentPhoto = (studentInfo as any)?.photo_url || null;

                          return (
                            <div key={result._id || idx} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                              <div className="flex flex-wrap items-center gap-3">
                                {studentPhoto ? (
                                  <img src={studentPhoto} alt={studentName} className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-[#EAEFFF] dark:bg-slate-800 flex items-center justify-center text-[#3B66FF] font-bold text-lg">
                                    {studentName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-[13px] font-bold text-slate-900 dark:text-white truncate max-w-full sm:w-[120px]">
                                    {studentName}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {typeof result.subject_id === 'object' ? result.subject_id.name : "Subject"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {result.is_pass !== false ? (
                                  <Award className="w-4 h-4 text-[#1DD04A]" />
                                ) : (
                                  <X className="w-4 h-4 text-[#FF4A6B]" />
                                )}
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${result.is_pass !== false ? 'bg-[#E8F8E8] text-[#1D7F2C]' : 'bg-[#FFEBF0] text-[#FF4A6B]'}`}>
                                  {result.marks_obtained}/{result.total_marks}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[12px] text-slate-500 dark:text-slate-400 text-center py-4">No recent results found.</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column (4-span) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Schedules Card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Schedules</h3>
                  <button className="text-[12px] font-semibold text-[#F59E0B] flex items-center gap-1 hover:text-[#D97706]">
                    <Plus className="w-3.5 h-3.5" />
                    Add New
                  </button>
                </div>

                {/* Mock Calendar */}
                <div className="w-full text-center">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <button className="p-1 hover:bg-slate-100 dark:bg-slate-800 rounded text-slate-400 dark:text-slate-500">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-[14px] text-slate-900 dark:text-white">
                      {today.toLocaleDateString("en-US", { month: 'long', year: 'numeric' })}
                    </span>
                    <button className="p-1 hover:bg-slate-100 dark:bg-slate-800 rounded text-slate-400 dark:text-slate-500">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[12px] font-semibold text-slate-900 dark:text-white mb-2">
                    <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[13px] text-slate-600 dark:text-slate-300">
                    {calendarDays.map((calDate, idx) => {
                      const isCurrentMonth = calDate.getMonth() === today.getMonth();
                      const isToday = calDate.toDateString() === today.toDateString();
                      return (
                        <div key={idx} className={`p-2 ${!isCurrentMonth ? 'text-slate-400 dark:text-slate-500' : ''} ${isToday ? 'bg-[#F59E0B] text-white rounded-lg font-bold shadow-sm' : ''}`}>
                          {calDate.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Upcoming Events Card */}
              {/* <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-5">Upcoming Events</h3>
                <div className="space-y-4">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event, idx) => (
                      <div key={event.id || idx} className={`relative pl-4 border-l-2 py-1`} style={{ borderColor: event.color }}>
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0`} style={{ backgroundColor: event.bgColor, color: event.color }}>
                            {event.type === 'holiday' ? <Award className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">{event.title}</h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                              <CalendarIcon className="w-3.5 h-3.5" /> {event.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 text-center py-4">No upcoming events</div>
                  )}
                </div>
              </div> */}
            </div>

          </div>

          {/* Bottom Rows: Lesson Plan */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Syllabus / Lesson Plan</h3>
              <Link href="#" className="text-[12px] font-semibold text-[#F59E0B]">View All</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Lesson 1 */}
              <div className="border border-border rounded-xl p-4 flex flex-col justify-between h-[140px] hover:shadow-md transition-shadow">
                <div className="bg-[#E8F8E8] text-[#1D7F2C] text-[11px] font-bold text-center py-1.5 rounded-md mb-3">
                  Class V, B
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">Introduction Note to Physics on Tech</h4>
                <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                  <button className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:text-[#F59E0B]">
                    <RefreshCcw className="w-3 h-3" /> Reschedule
                  </button>
                  <button className="text-[11px] font-semibold text-[#00B5FF] flex items-center gap-1.5 hover:text-[#0091cc]">
                    <Share2 className="w-3 h-3" /> Share
                  </button>
                </div>
              </div>

              {/* Lesson 2 */}
              <div className="border border-border rounded-xl p-4 flex flex-col justify-between h-[140px] hover:shadow-md transition-shadow">
                <div className="bg-[#FFF7E6] text-[#F59E0B] text-[11px] font-bold text-center py-1.5 rounded-md mb-3">
                  Class V, A
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">Biometric & their Working Functionality</h4>
                <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                  <button className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:text-[#F59E0B]">
                    <RefreshCcw className="w-3 h-3" /> Reschedule
                  </button>
                  <button className="text-[11px] font-semibold text-[#00B5FF] flex items-center gap-1.5 hover:text-[#0091cc]">
                    <Share2 className="w-3 h-3" /> Share
                  </button>
                </div>
              </div>

              {/* Lesson 3 */}
              <div className="border border-border rounded-xl p-4 flex flex-col justify-between h-[140px] hover:shadow-md transition-shadow">
                <div className="bg-[#E6F8FF] text-[#00B5FF] text-[11px] font-bold text-center py-1.5 rounded-md mb-3">
                  Class IV, C
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">Analyze and interpret literary texts skills</h4>
                <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                  <button className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:text-[#F59E0B]">
                    <RefreshCcw className="w-3 h-3" /> Reschedule
                  </button>
                  <button className="text-[11px] font-semibold text-[#00B5FF] flex items-center gap-1.5 hover:text-[#0091cc]">
                    <Share2 className="w-3 h-3" /> Share
                  </button>
                </div>
              </div>

              {/* Lesson 4 */}
              <div className="border border-border rounded-xl p-4 flex flex-col justify-between h-[140px] hover:shadow-md transition-shadow">
                <div className="bg-[#FFEBF0] text-[#FF4A6B] text-[11px] font-bold text-center py-1.5 rounded-md mb-3">
                  Class V, A
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">Enhance vocabulary and grammar skills</h4>
                <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                  <button className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:text-[#F59E0B]">
                    <RefreshCcw className="w-3 h-3" /> Reschedule
                  </button>
                  <button className="text-[11px] font-semibold text-[#00B5FF] flex items-center gap-1.5 hover:text-[#0091cc]">
                    <Share2 className="w-3 h-3" /> Share
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Rows: Student Marks & Leave Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Student Marks Table */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left overflow-x-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Student Marks</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> All Classes <ChevronRight className="w-3 h-3 rotate-90" />
                  </button>
                  <button className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> All Sections <ChevronRight className="w-3 h-3 rotate-90" />
                  </button>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-[12px] text-slate-500 dark:text-slate-400 font-bold border-b border-border">
                    <th className="py-3 px-4 rounded-tl-lg">ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Marks %</th>
                    <th className="py-3 px-4">CGPA</th>
                    <th className="py-3 px-4 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] text-slate-700 dark:text-slate-200 font-medium">
                  <tr className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="py-3 px-4">35013</td>
                    <td className="py-3 px-4 flex items-center gap-2"><img src="/asset 12.webp" className="w-6 h-6 rounded-full" /> Janet</td>
                    <td className="py-3 px-4">III</td>
                    <td className="py-3 px-4">A</td>
                    <td className="py-3 px-4">89%</td>
                    <td className="py-3 px-4">4.2</td>
                    <td className="py-3 px-4"><span className="bg-[#1DD04A] text-white text-[10px] font-bold px-2 py-0.5 rounded">Pass</span></td>
                  </tr>
                  <tr className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="py-3 px-4">35013</td>
                    <td className="py-3 px-4 flex items-center gap-2"><img src="/asset 13.webp" className="w-6 h-6 rounded-full" /> Joann</td>
                    <td className="py-3 px-4">IV</td>
                    <td className="py-3 px-4">B</td>
                    <td className="py-3 px-4">88%</td>
                    <td className="py-3 px-4">3.2</td>
                    <td className="py-3 px-4"><span className="bg-[#1DD04A] text-white text-[10px] font-bold px-2 py-0.5 rounded">Pass</span></td>
                  </tr>
                  <tr className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="py-3 px-4">35011</td>
                    <td className="py-3 px-4 flex items-center gap-2"><img src="/asset 14.webp" className="w-6 h-6 rounded-full" /> Kathleen</td>
                    <td className="py-3 px-4">II</td>
                    <td className="py-3 px-4">A</td>
                    <td className="py-3 px-4">69%</td>
                    <td className="py-3 px-4">4.5</td>
                    <td className="py-3 px-4"><span className="bg-[#1DD04A] text-white text-[10px] font-bold px-2 py-0.5 rounded">Pass</span></td>
                  </tr>
                  <tr className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="py-3 px-4">35010</td>
                    <td className="py-3 px-4 flex items-center gap-2"><img src="/asset 12.webp" className="w-6 h-6 rounded-full" /> Gifford</td>
                    <td className="py-3 px-4">I</td>
                    <td className="py-3 px-4">B</td>
                    <td className="py-3 px-4">21%</td>
                    <td className="py-3 px-4">4.5</td>
                    <td className="py-3 px-4"><span className="bg-[#1DD04A] text-white text-[10px] font-bold px-2 py-0.5 rounded">Pass</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="py-3 px-4">35009</td>
                    <td className="py-3 px-4 flex items-center gap-2"><img src="/asset 13.webp" className="w-6 h-6 rounded-full" /> Lisa</td>
                    <td className="py-3 px-4">II</td>
                    <td className="py-3 px-4">B</td>
                    <td className="py-3 px-4">31%</td>
                    <td className="py-3 px-4">3.9</td>
                    <td className="py-3 px-4"><span className="bg-[#FF4A6B] text-white text-[10px] font-bold px-2 py-0.5 rounded">Fail</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Leave Status */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Leave Status</h3>
                <button className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5" /> This Month <ChevronRight className="w-3 h-3 rotate-90" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Leave 1 */}
                <div className="border border-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FFEBF0] text-[#FF4A6B] flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Emergency Leave</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Date : 15 Jun 2024</p>
                    </div>
                  </div>
                  <span className="bg-[#E6F8FF] text-[#00B5FF] text-[9px] font-bold px-2 py-1 rounded">Pending</span>
                </div>

                {/* Leave 2 */}
                <div className="border border-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EAEFFF] text-[#F59E0B] flex items-center justify-center">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Medical Leave</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Date : 15 Jun 2024</p>
                    </div>
                  </div>
                  <span className="bg-[#E8F8E8] text-[#1D7F2C] text-[9px] font-bold px-2 py-1 rounded">Approved</span>
                </div>

                {/* Leave 3 */}
                <div className="border border-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EAEFFF] text-[#F59E0B] flex items-center justify-center">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Medical Leave</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Date : 16 Jun 2024</p>
                    </div>
                  </div>
                  <span className="bg-[#FFEBF0] text-[#FF4A6B] text-[9px] font-bold px-2 py-1 rounded">Declined</span>
                </div>

                {/* Leave 4 */}
                <div className="border border-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FFEBF0] text-[#FF4A6B] flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Not Well</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Date : 16 Jun 2024</p>
                    </div>
                  </div>
                  <span className="bg-[#E8F8E8] text-[#1D7F2C] text-[9px] font-bold px-2 py-1 rounded">Approved</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ----------------------------------------------------
          STUDENT & PARENT VIEW
          ---------------------------------------------------- */}
      {(activeRole === "student" || activeRole === "parent") && (
        <div className="space-y-6">
          {activeRole === "parent" && (
            <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 to-purple-600 rounded-xl text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-left shadow-lg mb-6">
              <div className="relative z-10">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  Welcome to the Parent Portal
                </h2>
                <p className="text-[14px] text-purple-100 mt-2 max-w-lg">
                  Track your child's academic progress, attendance, and fee status.
                </p>
              </div>

              <div className="relative z-10 mt-6 md:mt-0 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 min-w-full sm:w-[250px]">
                <p className="text-xs text-purple-200 mb-2 font-medium uppercase tracking-wider">Select Child:</p>
                {parentLoading ? (
                  <div className="text-sm">Loading children...</div>
                ) : (
                  <select
                    className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    value={selectedChildId || ""}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                  >
                    {children.map(c => (
                      <option key={c._id} value={c._id}>{c.name} {c.class_id ? `(${c.class_id?.name} ${c.class_id?.section})` : ""}</option>
                    ))}
                    {children.length === 0 && <option value="" disabled>No children found</option>}
                  </select>
                )}
              </div>
            </div>
          )}

          {!displayStudent && activeRole === "parent" && !parentLoading ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-border">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">No Children Found</h3>
              <p className="text-slate-500 max-w-md mx-auto mt-2">
                We couldn't find any students linked to your account.
              </p>
            </div>
          ) : (
            <>
              {/* Top Section: Masonry-like 3 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Column 1 (Left): Profile & Today's Class */}
                <div className="lg:col-span-3 flex flex-col gap-6">

                  {/* Profile Card */}
                  <div className="bg-[#0F172A] rounded-xl p-5 text-white relative overflow-hidden flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(30,41,59,0.3)]">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "16px 16px" }}></div>
                    <div className="absolute top-3 right-3 w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-yellow-400 border-r-[10px] border-r-transparent transform rotate-45"></div>

                    <div className="relative z-10 flex gap-4 items-center">
                      <div className="w-14 h-14 bg-white rounded flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
                        {(displayStudent as any)?.photo_url
                          ? <img src={(displayStudent as any).photo_url} alt="Profile" className="w-full h-full rounded object-cover" />
                          : <span className="text-primary font-black text-xl">{((displayStudent as any)?.name || 'S').charAt(0).toUpperCase()}</span>
                        }
                      </div>
                      <div>
                        <span className="bg-white text-[#F59E0B] text-[9px] font-bold px-2 py-0.5 rounded uppercase">#{(displayStudent as any)?.roll_no || "ST123456"}</span>
                        <h3 className="text-[16px] font-bold mt-1.5">{(displayStudent as any)?.name}</h3>
                        <p className="text-[11px] text-white/70 mt-0.5">
                          Class : {(displayStudent as any)?.class_id ? `${(displayStudent as any).class_id?.name} ${(displayStudent as any).class_id?.section}` : "N/A"}
                          | Roll No : {(displayStudent as any)?.roll_no || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between mt-8 border-t border-white/10 pt-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-white/60">{today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[12px] font-bold text-white/90 mt-0.5">{(displayStudent as any)?.gender || 'Student'}</span>
                      </div>
                      <Link href={activeRole === "parent" ? "/parent/results" : "/examination/exam-results"} className="bg-[#3B82F6] hover:bg-blue-600 transition-colors text-white text-[11px] font-bold px-4 py-1.5 rounded">
                        View Results
                      </Link>
                    </div>
                  </div>

                  {/* Today's Class */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Today's Class</h3>
                      <span className="text-[11px] font-medium text-slate-500">
                        {today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {studentTodaysClasses.length > 0 ? studentTodaysClasses.map((cls, idx) => {
                        const subject = typeof cls.subject_id === 'object' ? (cls.subject_id as any)?.name : "Subject";
                        const teacher = typeof cls.teacher_id === 'object' ? cls.teacher_id : null;
                        const startTime = new Date(`1970-01-01T${cls.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const endTime = new Date(`1970-01-01T${cls.end_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        const now = new Date();
                        const currentTime = now.getHours() * 60 + now.getMinutes();
                        const startParts = cls.start_time.split(':');
                        const endParts = cls.end_time.split(':');
                        const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || "0");
                        const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1] || "0");

                        let status = "Yet to Start";
                        let statusColor = "bg-[#FFF5E6] text-[#F59E0B]";
                        let dotColor = "bg-[#F59E0B]";

                        if (currentTime >= endMins) {
                          status = "Completed";
                          statusColor = "bg-[#E8F8E8] text-[#1D7F2C]";
                          dotColor = "bg-[#1D7F2C]";
                        } else if (currentTime >= startMins && currentTime < endMins) {
                          status = "Inprogress";
                          statusColor = "bg-[#E6F8FF] text-[#00B5FF]";
                          dotColor = "bg-[#00B5FF]";
                        }

                        return (
                          <div key={cls._id || idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/30">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {(teacher as any)?.photo_url ? <img src={(teacher as any).photo_url} alt="Teacher" className="w-full h-full rounded object-cover" /> : subject.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{subject}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" /> {startTime} - {endTime}</p>
                              </div>
                            </div>
                            <span className={`${statusColor} text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0`}>
                              <span className={`w-1 h-1 rounded-full ${dotColor}`}></span> {status}
                            </span>
                          </div>
                        );
                      }) : (
                        <div className="text-center py-6 text-slate-500 text-xs">No classes scheduled for today.</div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Column 2 (Middle): Attendance & Buttons */}
                <div className="lg:col-span-5 flex flex-col gap-6">

                  {/* Attendance Donut */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex-1 flex flex-col relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Attendance</h3>
                      <button className="text-[11px] border border-border px-2 py-1 rounded font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" /> This Week <ChevronDown className="w-3 h-3 ml-1" />
                      </button>
                    </div>

                    <div className="bg-[#F8FAFC] dark:bg-slate-800/50 rounded flex items-center gap-2 p-2 mb-4">
                      <CalendarIcon className="w-4 h-4 text-[#F59E0B]" />
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                        {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Attendance
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-6 mb-6">
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 font-medium">Present</p>
                        <p className="text-[16px] font-bold mt-1">25</p>
                      </div>
                      <div className="w-px h-8 bg-border"></div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 font-medium">Absent</p>
                        <p className="text-[16px] font-bold mt-1">2</p>
                      </div>
                      <div className="w-px h-8 bg-border"></div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 font-medium">Halfday</p>
                        <p className="text-[16px] font-bold mt-1">0</p>
                      </div>
                    </div>

                    {/* Donut Chart SVG */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="relative w-40 h-40">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {/* Background circle */}
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="12" className="dark:stroke-slate-800" />

                          {/* Absent (Red) - Top Left (approx 10%) */}
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#EF4444" strokeWidth="12"
                            strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 10) / 100}
                            className="transition-all duration-1000 ease-out" />

                          {/* Halfday (Blue) - Bottom Left (approx 15%) */}
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3B82F6" strokeWidth="12"
                            strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 15) / 100}
                            strokeLinecap="round"
                            transform="rotate(36, 50, 50)"
                            className="transition-all duration-1000 ease-out" />

                          {/* Present (Green) - Remaining (approx 75%) */}
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" strokeWidth="12"
                            strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 75) / 100}
                            strokeLinecap="round"
                            transform="rotate(90, 50, 50)"
                            className="transition-all duration-1000 ease-out" />
                        </svg>
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-6">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div><span className="text-[11px] text-slate-500 font-medium">Present</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div><span className="text-[11px] text-slate-500 font-medium">Late</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300"></div><span className="text-[11px] text-slate-500 font-medium">Half Day</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#EF4444]"></div><span className="text-[11px] text-slate-500 font-medium">Absent</span></div>
                      </div>
                    </div>

                    {/* Last 7 Days Footer inside Attendance */}
                    <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-slate-900 dark:text-white">This Week</span>
                        <div className="flex items-center gap-1 mt-1.5">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
                            const dayDate = new Date(today);
                            const diff = i - (today.getDay() === 0 ? 6 : today.getDay() - 1);
                            dayDate.setDate(today.getDate() + diff);
                            const isWeekend = i >= 5;
                            const isPast = dayDate < today;
                            return (
                              <div key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${isWeekend ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                                : isPast ? 'bg-[#10B981] text-white'
                                  : 'bg-primary/10 text-primary'
                                }`}>{d}</div>
                            );
                          })}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Pay Fees button hidden — Issue 9 */}
                    <Link href={activeRole === "parent" ? "/parent/results" : "/examination/exam-results"} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-3 flex items-center gap-2 justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                      <div className="w-6 h-6 rounded bg-[#E8F8E8] flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-[#10B981]" />
                      </div>
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Exam Result</span>
                    </Link>
                    <Link href="/academic/class-routine" className="bg-white dark:bg-slate-900 border border-border rounded-xl p-3 flex items-center gap-2 justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                      <div className="w-6 h-6 rounded bg-[#FFF5E6] flex items-center justify-center">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                      </div>
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Calendar</span>
                    </Link>
                    <Link href={activeRole === "parent" ? "/parent/attendance" : "/attendance/my-attendance"} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-3 flex items-center gap-2 justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                      <div className="w-6 h-6 rounded bg-[#EAEFFF] flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-[#0F172A]" />
                      </div>
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Attendance</span>
                    </Link>
                  </div>

                </div>

                {/* Column 3 (Right): Schedules & Exams */}
                <div className="lg:col-span-4 flex flex-col gap-6">

                  {/* Schedules Calendar */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Schedules</h3>
                      <span className="text-[12px] font-bold text-slate-500">
                        {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-[11px] font-semibold text-slate-500 py-1">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {calendarDays.map((d, i) => {
                        const isCurrentMonth = d.getMonth() === today.getMonth();
                        const isToday = d.toDateString() === today.toDateString();
                        const hasHoliday = holidays.some(h => new Date(h.date).toDateString() === d.toDateString());
                        return (
                          <div key={i} className={`text-[12px] py-1.5 flex justify-center`}>
                            <span className={`w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#F59E0B] text-white font-bold shadow-md shadow-[#F59E0B]/30'
                              : hasHoliday ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600'
                                : isCurrentMonth ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}>
                              {d.getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Exams list */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex-1">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-4">Upcoming Subjects Today</h3>

                    <div className="space-y-3">
                      {studentTodaysClasses.length > 0 ? studentTodaysClasses.slice(0, 4).map((cls, idx) => {
                        const subject = typeof cls.subject_id === 'object' ? (cls.subject_id as any)?.name : 'Subject';
                        const startTime = new Date(`1970-01-01T${cls.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const endTime = new Date(`1970-01-01T${cls.end_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const now = new Date();
                        const curMins = now.getHours() * 60 + now.getMinutes();
                        const [sh, sm] = cls.start_time.split(':').map(Number);
                        const [eh, em] = cls.end_time.split(':').map(Number);
                        const startMins = sh * 60 + sm;
                        const endMins = eh * 60 + em;
                        const badge = curMins >= endMins ? { label: 'Done', cls: 'bg-emerald-50 text-emerald-700' } : curMins >= startMins ? { label: 'Live', cls: 'bg-blue-50 text-blue-600' } : { label: 'Soon', cls: 'bg-amber-50 text-amber-600' };
                        return (
                          <div key={cls._id || idx} className="border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-[12px] font-bold text-slate-900 dark:text-white">{subject}</h4>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {startTime} - {endTime}</p>
                          </div>
                        );
                      }) : (
                        <div className="text-center py-4 text-slate-500 text-xs">No classes scheduled for today.</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Middle Row: Performance (8) & Home Works (4) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Performance */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Performance</h3>
                    <button className="text-[11px] border border-border px-2 py-1 rounded font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" /> 2024 - 2025 <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                  </div>

                  {/* Area Line Chart SVG Mockup */}
                  <div className="flex-1 w-full relative min-h-[200px]">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-slate-400 py-4">
                      <span>100</span>
                      <span>75</span>
                      <span>50</span>
                      <span>25</span>
                      <span>0</span>
                    </div>
                    {/* Grid lines */}
                    <div className="absolute left-6 right-0 top-0 h-full flex flex-col justify-between py-5">
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full"></div>
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full"></div>
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full"></div>
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full"></div>
                      <div className="border-b border-slate-300 dark:border-slate-700 w-full"></div>
                    </div>

                    {/* SVG Area chart */}
                    <svg className="absolute left-6 right-0 top-0 h-full w-[calc(100%-24px)]" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00B5FF" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#00B5FF" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradNavy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Avg Attendance (Light Blue) line + area */}
                      <path d="M0,30 Q15,20 25,40 T50,50 T75,40 T100,20 L100,85 L0,85 Z" fill="url(#gradBlue)" />
                      <path d="M0,30 Q15,20 25,40 T50,50 T75,40 T100,20" fill="none" stroke="#00B5FF" strokeWidth="2" />

                      {/* Dots for light blue line */}
                      <circle cx="25" cy="40" r="1.5" fill="#00B5FF" />
                      <circle cx="50" cy="50" r="1.5" fill="#00B5FF" />
                      <circle cx="75" cy="40" r="1.5" fill="#00B5FF" />
                      <circle cx="100" cy="20" r="1.5" fill="#00B5FF" />

                      {/* Avg Exam Score (Navy Blue) line + area */}
                      <path d="M0,85 Q15,80 25,70 T50,60 T75,80 T100,50 L100,85 L0,85 Z" fill="url(#gradNavy)" />
                      <path d="M0,85 Q15,80 25,70 T50,60 T75,80 T100,50" fill="none" stroke="#F59E0B" strokeWidth="2" />

                      {/* Dots for navy line */}
                      <circle cx="25" cy="70" r="1.5" fill="#F59E0B" />
                      <circle cx="50" cy="60" r="1.5" fill="#F59E0B" />
                      <circle cx="75" cy="80" r="1.5" fill="#F59E0B" />
                      <circle cx="100" cy="50" r="1.5" fill="#F59E0B" />
                    </svg>

                    {/* X-axis labels */}
                    <div className="absolute left-6 right-0 bottom-0 flex justify-between text-[10px] text-slate-400">
                      <span>Quarter 1</span>
                      <span>Quarter 2</span>
                      <span>Half Yearly</span>
                      <span>Model</span>
                      <span>Final</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                      <span className="text-[11px] text-slate-500 font-medium">Avg. Exam Score</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#00B5FF]"></div>
                      <span className="text-[11px] text-slate-500 font-medium">Avg. Attendance</span>
                    </div>
                  </div>
                </div>

                {/* Home Works */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Home Works</h3>
                    <button className="text-[11px] border border-border px-2 py-1 rounded font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      All Subject <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {studentHomework.length > 0 ? studentHomework.slice(0, 4).map((hw, idx) => {
                      const subject = typeof hw.subject_id === 'object' ? (hw.subject_id as any)?.name : "Subject";
                      const teacher = typeof hw.teacher_id === 'object' ? hw.teacher_id : null;

                      // Compute "completion percentage" mock since this isn't stored per-student yet
                      const pct = Math.floor(Math.random() * 60) + 40; // 40-99
                      let color = "#3B82F6";
                      if (pct > 80) color = "#10B981";
                      else if (pct < 50) color = "#EF4444";

                      const dueStr = new Date(hw.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

                      return (
                        <div key={hw._id || idx} className="flex items-center justify-between gap-3">
                          <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold flex items-center gap-1" style={{ color }}><BookOpen className="w-3 h-3" /> {subject}</p>
                            <h4 className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{hw.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                  {(teacher as any)?.photo_url && <img src={(teacher as any).photo_url} className="w-full h-full object-cover" />}
                                </div>
                                <span className="text-[10px] text-slate-500">{(teacher as any)?.name?.split(' ')[0] || "Teacher"}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">Due: {dueStr}</span>
                            </div>
                          </div>
                          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                              <circle cx="18" cy="18" r="16" fill="transparent" stroke="#F1F5F9" strokeWidth="3" className="dark:stroke-slate-800" />
                              <circle cx="18" cy="18" r="16" fill="transparent" stroke={color} strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - pct} strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-[8px] font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-6 text-slate-500 text-xs">No pending homeworks.</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Class Faculties Row */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Class Faculties</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="w-6 h-6 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button className="w-6 h-6 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 overflow-x-auto pb-2 snap-x">
                  {(() => {
                    // Unique teachers from student's class schedules
                    const seen = new Set<string>();
                    const uniqueTeachers = studentSchedules.reduce((acc: any[], s) => {
                      const t = typeof s.teacher_id === 'object' ? s.teacher_id : null;
                      const sub = typeof s.subject_id === 'object' ? s.subject_id : null;
                      if (t && !(t as any)._id) return acc;
                      const tid = (t as any)?._id;
                      if (tid && !seen.has(tid)) {
                        seen.add(tid);
                        acc.push({ teacher: t, subject: sub });
                      }
                      return acc;
                    }, []);

                    if (uniqueTeachers.length === 0) return (
                      <div className="text-sm text-slate-500 py-4 px-2">No class faculty data available.</div>
                    );

                    return uniqueTeachers.map(({ teacher, subject }, idx) => (
                      <div key={(teacher as any)?._id || idx} className="min-w-full sm:w-[200px] border border-slate-100 dark:border-slate-800 rounded-lg p-3 snap-start">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                          <div className="w-10 h-10 rounded overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                            {(teacher as any)?.photo_url
                              ? <img src={(teacher as any).photo_url} className="w-full h-full object-cover" alt={(teacher as any).name} />
                              : <span className="text-primary font-black">{((teacher as any)?.name || 'T').charAt(0)}</span>
                            }
                          </div>
                          <div>
                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">{(teacher as any)?.name || 'Teacher'}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">{(subject as any)?.name || 'Subject'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <button className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                            <FileText className="w-3 h-3" /> Email
                          </button>
                          <button className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                            <Megaphone className="w-3 h-3" /> Chat
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Bottom Grid: 4 Columns (Leave, Exam, Fees, Syllabus) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                {/* Leave Status */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Leave Status</h3>
                    <button className="text-[11px] border border-border px-2 py-1 rounded font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" /> This Month <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                  </div>

                  <div className="space-y-4 flex-1">
                    {studentLeaves.length > 0 ? studentLeaves.slice(0, 4).map((leave, idx) => {
                      let statusColor = "bg-[#FFEBF0] text-[#EF4444]";
                      let icon = <X className="w-4 h-4" />;
                      if (leave.status === 'approved') {
                        statusColor = "bg-[#E8F8E8] text-[#1DD04A]";
                        icon = <CheckCircle2 className="w-4 h-4" />;
                      } else if (leave.status === 'pending') {
                        statusColor = "bg-[#E6F8FF] text-[#00B5FF]";
                        icon = <Clock className="w-4 h-4" />;
                      }

                      const leaveTypeLabel = typeof leave.leave_type === 'object' ? (leave.leave_type as any)?.name : (leave.leave_type || "Leave");

                      return (
                        <div key={leave._id || idx} className="flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${statusColor.replace('text', 'bg').replace('bg-', 'bg-opacity-20 text-')}`}>
                              {icon}
                            </div>
                            <div>
                              <h4 className="text-[13px] font-bold text-slate-900 dark:text-white capitalize">{leaveTypeLabel}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Date : {new Date(leave.from_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <span className={`${statusColor} text-[9px] font-bold px-2 py-0.5 rounded capitalize`}>{leave.status}</span>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-6 text-slate-500 text-xs">No recent leave requests.</div>
                    )}
                  </div>
                </div>

                {/* Exam Result (Bar Chart) */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Exam Result</h3>
                    <button className="text-[11px] border border-border px-2 py-1 rounded font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" /> 1st Quarter <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                  </div>

                  {/* Legend Badges */}
                  <div className="flex flex-wrap justify-center gap-2 mb-6 text-[10px] font-bold border-b border-border pb-4">
                    {studentResults.length > 0 ? studentResults.slice(0, 4).map((r, i) => {
                      const subName = typeof r.subject_id === 'object' ? (r.subject_id as any)?.name : 'Sub';
                      const pct = r.total_marks > 0 ? Math.round((r.marks_obtained / r.total_marks) * 100) : 0;
                      return (
                        <span key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                          {subName?.substring(0, 3)} : {pct}
                        </span>
                      );
                    }) : <span className="text-slate-500">No results</span>}
                  </div>

                  {/* Bar Chart */}
                  <div className="flex-1 flex items-end justify-around px-2 pt-2 relative min-h-[140px]">
                    {/* Grid Lines */}
                    <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between py-1 z-0 pointer-events-none">
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 flex items-center"><span className="absolute -left-2 text-[9px] text-slate-400">100</span></div>
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 flex items-center"><span className="absolute -left-2 text-[9px] text-slate-400">80</span></div>
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 flex items-center"><span className="absolute -left-2 text-[9px] text-slate-400">60</span></div>
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 flex items-center"><span className="absolute -left-2 text-[9px] text-slate-400">40</span></div>
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 flex items-center"><span className="absolute -left-2 text-[9px] text-slate-400">20</span></div>
                      <div className="border-b border-slate-300 dark:border-slate-700 flex items-center"><span className="absolute -left-2 text-[9px] text-slate-400">0</span></div>
                    </div>

                    {/* Bars */}
                    {studentResults.length > 0 ? studentResults.slice(0, 5).map((r, i) => {
                      const subName = typeof r.subject_id === 'object' ? (r.subject_id as any)?.name : 'Sub';
                      const pct = r.total_marks > 0 ? Math.round((r.marks_obtained / r.total_marks) * 100) : 0;
                      const barColor = pct >= 90 ? "bg-[#1DD04A]" : pct >= 75 ? "bg-[#F59E0B]" : pct >= 50 ? "bg-[#3B82F6]" : "bg-[#EF4444]";
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 z-10">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                          <div className={`w-6 ${barColor} rounded-t transition-all`} style={{ height: `${Math.max(pct, 5)}px` }}></div>
                          <span className="text-[10px] text-slate-500 mt-1">{subName?.substring(0, 3)}</span>
                        </div>
                      );
                    }) : (
                      <div className="z-10 w-full text-center text-slate-500 text-xs mb-8">No exam results available.</div>
                    )}
                  </div>
                </div>

                {/* Fees — Recent Payments */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Recent Payments</h3>
                    <Link href={activeRole === "parent" ? "/parent/fees" : "/fees"} className="text-[12px] font-semibold text-[#F59E0B]">View All</Link>
                  </div>

                  <div className="space-y-3 flex-1">
                    {payments.filter(p => {
                      const sid = typeof (p as any).student_id === 'object' ? (p as any).student_id?._id : (p as any).student_id;
                      return sid === displayStudentId;
                    }).slice(0, 5).length > 0 ? payments.filter(p => {
                      const sid = typeof (p as any).student_id === 'object' ? (p as any).student_id?._id : (p as any).student_id;
                      return sid === displayStudentId;
                    }).slice(0, 5).map((p, i) => (
                      <div key={(p as any)._id || i} className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-[12px] font-bold text-slate-900 dark:text-white">{(p as any).fee_type || 'Fee Payment'}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{new Date((p as any).transaction_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <span className="text-[12px] font-black text-emerald-600">${(p as any).amount_paid?.toLocaleString()}</span>
                      </div>
                    )) : (
                      <div className="text-center py-6 text-slate-500 text-xs">No payment history found.</div>
                    )}
                  </div>
                </div>

                {/* Exam Performance Per Subject */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-4">Subject Performance</h3>

                  {studentResults.length > 0 ? (
                    <div className="space-y-3">
                      {studentResults.slice(0, 7).map((r, i) => {
                        const subName = typeof r.subject_id === 'object' ? (r.subject_id as any)?.name : 'Subject';
                        const pct = r.total_marks > 0 ? Math.round((r.marks_obtained / r.total_marks) * 100) : 0;
                        const color = pct >= 80 ? '#1DD04A' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#00B5FF' : '#EF4444';
                        return (
                          <div key={r._id || i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{subName}</span>
                              <span className="text-[11px] font-bold" style={{ color }}>{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">No exam results yet.</div>
                  )}
                </div>

              </div>

              {/* Footer Grid: Notice Board & Todo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Notice Board — Dynamic */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col text-left">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Notice Board</h3>
                    <Link href="/notices" className="text-[12px] font-semibold text-[#F59E0B]">View All</Link>
                  </div>

                  <div className="space-y-4">
                    {notices.filter(n => n.is_published).sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()).slice(0, 5).length > 0
                      ? notices.filter(n => n.is_published).sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()).slice(0, 5).map((notice, i) => {
                        const colors = ['bg-[#EAEFFF] text-[#F59E0B]', 'bg-[#E8F8E8] text-[#1DD04A]', 'bg-[#FFEBF0] text-[#EF4444]', 'bg-[#E6F8FF] text-[#00B5FF]', 'bg-[#FFF5E6] text-[#F59E0B]'];
                        return (
                          <div key={notice._id || i} className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${colors[i % colors.length]}`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{notice.title}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(notice.publish_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </div>
                        );
                      })
                      : <p className="text-[13px] text-slate-400">No notices published yet.</p>
                    }
                  </div>
                </div>

                {/* Todo List */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col text-left">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Todo</h3>
                    <button className="text-[11px] border border-border px-2 py-1 rounded font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" /> Today <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded bg-[#F59E0B] flex items-center justify-center text-white shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">Send Reminder to Students</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">01:00 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#E8F8E8] text-[#1DD04A] text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Completed</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5"></div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">Create Routine to new staff</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">04:50 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#E6F8FF] text-[#00B5FF] text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Inprogress</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5"></div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">Extra Class Info to Students</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">04:55 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#FFF5E6] text-[#F59E0B] text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Yet to Start</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5"></div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">Fees for Upcoming Academics</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">04:55 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#FFF5E6] text-[#F59E0B] text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Yet to Start</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5"></div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">English - Essay on Visit</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">05:55 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#FFF5E6] text-[#F59E0B] text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Yet to Start</span>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
