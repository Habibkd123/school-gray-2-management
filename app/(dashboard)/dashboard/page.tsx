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
import { HIDE_FEES_FEATURE } from "@/lib/permissions";
import { useAppState } from "../../context/store";
import { useSchedules } from "../../hooks/useSchedules";
import { useHolidays } from "../../hooks/useHolidays";
import { useResults } from "../../hooks/useResults";
import { getAuthHeaders, getStoredUser } from "@/lib/utils/session";
import { useLeave } from "../../hooks/useLeave";
import { useAttendanceSummary, AttendanceSummaryRecord } from "../../hooks/useAttendanceSummary";
import { useSubjects } from "../../hooks/useSubjects";
import { useParent } from "../../hooks/useParent";
import { useTeacherAssignment } from "../../hooks/useTeacherAssignment";
import { useDashboardStats } from "../../hooks/useDashboardStats";
import { ParentOverview } from "../../components/parent/ParentOverview";
import { LineChart, BarChart, DoughnutChart } from "../../components/ui/charts";
import { useThemeColors } from "../../components/SchoolThemeProvider";
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

const getScheduleProgress = (day: string, start: string, end: string) => {
  try {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const parseTimeToMinutes = (tStr: string) => {
      const parts = tStr.trim().toLowerCase().match(/^(\d+):(\d+)\s*(am|pm)?$/);
      if (!parts) return 0;
      let hrs = parseInt(parts[1], 10);
      const mins = parseInt(parts[2], 10);
      const ampme = parts[3];
      if (ampme === 'pm' && hrs < 12) hrs += 12;
      if (ampme === 'am' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };

    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (day.toLowerCase() !== currentDay) {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const scheduleDayIdx = days.indexOf(day.toLowerCase());
      const currentDayIdx = days.indexOf(currentDay);
      if (scheduleDayIdx < currentDayIdx) return 100;
      if (scheduleDayIdx > currentDayIdx) return 0;
    }

    if (currentMinutes < startMinutes) return 0;
    if (currentMinutes > endMinutes) return 100;
    return Math.round(((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100);
  } catch {
    return 50;
  }
};

export default function DashboardPage() {
  const SHOW_FEES = !HIDE_FEES_FEATURE;
  // ── Synchronous role detection ──────────────────────────────────
  // getStoredUser() reads from localStorage synchronously (no effect needed)
  // so we can determine the role on the very first render and skip
  // API fetches that are irrelevant to this user's role.
  const storedUser = getStoredUser();
  const storedRole = storedUser?.role ?? "school_admin";

  const isAdmin = storedRole === "school_admin";
  const isTeacher = storedRole === "teacher";
  const isStudent = storedRole === "student";
  const isParent = storedRole === "parent";
  const isSuperAdmin = storedRole === "super_admin";
  const theme = useThemeColors();
  const { students, fetchStudents } = useStudents({ skip: isSuperAdmin });
  const { teachers } = useTeachers({ skip: isSuperAdmin || isStudent || isParent });
  const { classes } = useClasses({ skip: isSuperAdmin || isStudent || isParent });
  // Fees only used in admin dashboard — pass skip as second arg (studentId is first)
  const { payments } = useFeePayments(undefined, { skip: !isAdmin });
  // Notices needed by all roles
  const { notices } = useNotices();
  // Homework: teacher, student, parent — classId is first arg, options second
  const { homework } = useHomework(undefined, { skip: isSuperAdmin || isAdmin });
  // Holidays: needed by all roles for calendar highlights
  const { holidays } = useHolidays({ skip: isSuperAdmin });
  // Results: admin, teacher, student, parent
  const { results } = useResults({ skip: isSuperAdmin });
  // Leave: needed by all roles to view leave request status
  const { leaveRequests: leaves } = useLeave(undefined, undefined, { skip: isSuperAdmin });
  // Dashboard stats (real-time school-wide attendance metrics)
  const { stats: dashboardStats } = useDashboardStats({
    skip: isSuperAdmin || isStudent || isParent
  });
  // Subjects: admin only — classId is first arg, options second
  const { subjects } = useSubjects(undefined, { skip: !isAdmin });
  const { user } = useAuth();
  const { academicYear } = useAppState();
  // Parent portal only
  const { children, selectedChildId, setSelectedChildId, isLoading: parentLoading } = useParent({ skip: !isParent });

  const student = useMemo(() => {
    return students.find(s => {
      const sUserId = typeof s.user_id === 'object' && s.user_id ? s.user_id._id : s.user_id;
      return sUserId === user?.id;
    }) || null;
  }, [students, user?.id]);

  const selectedChild = useMemo(() => {
    return children.find(c => c._id === selectedChildId) || children[0] || null;
  }, [children, selectedChildId]);

  const activeRole = isSuperAdmin ? "super_admin" : isTeacher ? "teacher" : isParent ? "parent" : isStudent ? "student" : "admin";
  const displayStudent = activeRole === "parent" ? selectedChild : student;
  const displayStudentId = displayStudent?._id;
  const displayStudentClassId = typeof displayStudent?.class_id === 'object' ? displayStudent?.class_id?._id : displayStudent?.class_id;

  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState<AttendanceSummaryRecord | null>(null);
  const [studentWeeklyAttendance, setStudentWeeklyAttendance] = useState<Array<{ date: string; status: string; note?: string }>>([]);

  const { fetchSummary, fetchDetail } = useAttendanceSummary();

  React.useEffect(() => {
    if ((isStudent || isParent) && displayStudentId) {
      const fetchMonthly = async () => {
        const todayDate = new Date();
        const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().split('T')[0];
        const summaryData = await fetchSummary(startOfMonth, endOfMonth, "student");
        if (summaryData && summaryData[displayStudentId]) {
          setStudentAttendanceSummary(summaryData[displayStudentId]);
        } else {
          setStudentAttendanceSummary({ present: 0, absent: 0, late: 0, holiday: 0, half_day: 0, leave: 0 });
        }
      };

      const fetchWeekly = async () => {
        const todayDate = new Date();
        const monday = new Date(todayDate);
        const dayOfWeek = todayDate.getDay(); 
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        monday.setDate(todayDate.getDate() + diffToMonday);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startOfWeek = monday.toISOString().split('T')[0];
        const endOfWeek = sunday.toISOString().split('T')[0];

        const details = await fetchDetail(startOfWeek, endOfWeek, "student", displayStudentId);
        if (details) {
          setStudentWeeklyAttendance(details);
        } else {
          setStudentWeeklyAttendance([]);
        }
      };

      fetchMonthly();
      fetchWeekly();
    }
  }, [displayStudentId, isStudent, isParent, fetchSummary, fetchDetail]);
  const [assessments, setAssessments] = useState<any[]>([]);

  React.useEffect(() => {
    if ((isStudent || isParent) && displayStudentClassId) {
      fetch(`/api/assessments?class_id=${displayStudentClassId}&academic_year=${academicYear}`, {
        headers: getAuthHeaders(),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAssessments(data.data || []);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isStudent, isParent, displayStudentClassId, academicYear]);

  const { assignments: teacherAssignments, fetchAssignments: fetchTeacherAssignments } = useTeacherAssignment();

  const [attendanceTab, setAttendanceTab] = useState<'Students' | 'Teachers' | 'Staff'>('Students');

  const [superAdminSchools, setSuperAdminSchools] = useState<any[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [teacherSyllabi, setTeacherSyllabi] = useState<any[]>([]);
  const [todaysAttendanceStatus, setTodaysAttendanceStatus] = useState<string>("—");

  const currentTeacherProfile = useMemo(() => {
    if (!isTeacher || teachers.length === 0) return null;
    return teachers.find(t => {
      const tUserId = typeof t.user_id === "object" ? t.user_id?._id : t.user_id;
      return tUserId === user?.id;
    });
  }, [isTeacher, teachers, user?.id]);

  // Schedules: loaded role-based. Admins see all, teachers see theirs, students/parents see their class's.
  const scheduleTeacherId = isTeacher ? currentTeacherProfile?._id : undefined;
  const scheduleClassId = (isStudent || isParent) ? displayStudentClassId : undefined;
  const { schedules } = useSchedules(scheduleClassId, scheduleTeacherId, { skip: isSuperAdmin });

  React.useEffect(() => {
    if (isTeacher && currentTeacherProfile) {
      fetchTeacherAssignments({ teacher_id: currentTeacherProfile._id, academic_year: academicYear, limit: 500 });
    }
  }, [isTeacher, currentTeacherProfile, fetchTeacherAssignments, academicYear]);

  React.useEffect(() => {
    if (isTeacher) {
      fetchStudents({ academic_year: academicYear, limit: 1000 });
    }
  }, [isTeacher, fetchStudents, academicYear]);

  React.useEffect(() => {
    if (isTeacher && currentTeacherProfile) {
      fetch(`/api/syllabus?teacher_id=${currentTeacherProfile._id}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeacherSyllabi(data.data);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isTeacher, currentTeacherProfile]);

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
  const classIdsInYear = useMemo(() => new Set(classes.map(c => c._id)), [classes]);

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

  const emergencyLeaves = dashboardStats?.attendance?.marked 
    ? (dashboardStats.attendance.leave ?? 0)
    : 0;
  const absentLeavesCount = dashboardStats?.attendance?.marked 
    ? (dashboardStats.attendance.absent ?? 0)
    : 0;
  const lateCount = dashboardStats?.attendance?.marked 
    ? (dashboardStats.attendance.late ?? 0)
    : 0;

  const attendanceRateMock = dashboardStats?.attendance?.marked && dashboardStats?.attendance?.percentage !== null
    ? dashboardStats.attendance.percentage.toFixed(1)
    : "0.0";
  const attendanceRateVal = parseFloat(attendanceRateMock) || 0;
  const attendanceGaugeLength = (125.66 * attendanceRateVal) / 100;

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

  const topCount = useMemo(() => filteredResults.filter(r => r.total_marks > 0 && (r.marks_obtained / r.total_marks) >= 0.8).length, [filteredResults]);
  const avgCount = useMemo(() => filteredResults.filter(r => r.total_marks > 0 && (r.marks_obtained / r.total_marks) >= 0.5 && (r.marks_obtained / r.total_marks) < 0.8).length, [filteredResults]);
  const belowAvgCount = useMemo(() => filteredResults.filter(r => r.total_marks > 0 && (r.marks_obtained / r.total_marks) < 0.5).length, [filteredResults]);

  const filteredPayments = useMemo(() => payments.filter(p => {
    const studentId = typeof p.student_id === 'object' ? p.student_id?._id : p.student_id;
    return studentIdsInYear.has(studentId);
  }), [payments, studentIdsInYear]);

  const totalRevenue = useMemo(() =>
    filteredPayments.reduce((acc: number, curr) => acc + curr.amount_paid, 0)
    , [filteredPayments]);

  // Fee Quarters Calculation for Chart
  const getQuarter = (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}: ${date.getFullYear()}`;
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
  const today = new Date();
  const currentDayName = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

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

  const totalAttendanceDays = studentAttendanceSummary
    ? (studentAttendanceSummary.present + studentAttendanceSummary.absent + studentAttendanceSummary.late + studentAttendanceSummary.half_day + (studentAttendanceSummary.leave ?? 0))
    : 0;
  const studentAttendanceRate = totalAttendanceDays > 0 && studentAttendanceSummary
    ? Math.round((studentAttendanceSummary.present / totalAttendanceDays) * 100)
    : 100; // Default to 100 if no records
  const pendingHwCount = studentHomework.filter(hw => hw.status !== "completed").length;

  const averageGrade = studentResults.length > 0
    ? Math.round(studentResults.reduce((acc, r) => acc + (r.total_marks > 0 ? (r.marks_obtained / r.total_marks) * 100 : 0), 0) / studentResults.length)
    : 0;
  const studentPendingFees = 0; // Mocked for now

  const totalSubjectsCount = useMemo(() => {
    const seen = new Set();
    studentSchedules.forEach(s => {
      const subId = typeof s.subject_id === 'object' && s.subject_id ? s.subject_id._id : s.subject_id;
      if (subId) seen.add(subId);
    });
    return seen.size;
  }, [studentSchedules]);

  const examPerformance = useMemo(() => {
    const examsMap: Record<string, { totalObtained: number; totalMax: number }> = {};
    studentResults.forEach(r => {
      const examName = typeof r.exam_id === 'object' && r.exam_id ? (r.exam_id as any).name : 'Exam';
      if (!examsMap[examName]) {
        examsMap[examName] = { totalObtained: 0, totalMax: 0 };
      }
      examsMap[examName].totalObtained += r.marks_obtained;
      examsMap[examName].totalMax += r.total_marks;
    });

    const list = Object.entries(examsMap).map(([examName, data]) => {
      const score = data.totalMax > 0 ? Math.round((data.totalObtained / data.totalMax) * 100) : 0;
      return { label: examName, score };
    });

    if (list.length === 0) {
      return [
        { label: "Quarter 1", score: 0 },
        { label: "Quarter 2", score: 0 },
        { label: "Half Yearly", score: 0 },
        { label: "Model", score: 0 },
        { label: "Final", score: 0 }
      ];
    }
    return list;
  }, [studentResults]);

  const examPoints = useMemo(() => {
    return examPerformance.map((item, idx) => {
      const x = (idx / Math.max(1, examPerformance.length - 1)) * 100;
      const y = 100 - item.score;
      return `${x},${y}`;
    });
  }, [examPerformance]);

  const attendancePoints = useMemo(() => {
    return examPerformance.map((item, idx) => {
      const x = (idx / Math.max(1, examPerformance.length - 1)) * 100;
      const y = 100 - studentAttendanceRate;
      return `${x},${y}`;
    });
  }, [examPerformance, studentAttendanceRate]);

  const examPath = examPoints.length > 0 ? `M ${examPoints.join(' L ')}` : '';
  const examAreaPath = examPoints.length > 0 ? `M 0,100 L ${examPoints.join(' L ')} L 100,100 Z` : '';
  
  const attendancePath = attendancePoints.length > 0 ? `M ${attendancePoints.join(' L ')}` : '';
  const attendanceAreaPath = attendancePoints.length > 0 ? `M 0,100 L ${attendancePoints.join(' L ')} L 100,100 Z` : '';

  // Latest Notice (used in multiple places)
  const latestNotice = notices.filter(n => n.is_published).sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime())[0];

  // ---------------------------------------------------------------------------
  // Teacher View Calculations
  // ---------------------------------------------------------------------------

  // Assigned Classes & Subjects
  const teacherSchedules = useMemo(() => {
    if (!currentTeacherProfile) return [];
    return schedules.filter(s => {
      const tId = typeof s.teacher_id === 'object' && s.teacher_id !== null ? s.teacher_id._id : s.teacher_id;
      return tId === currentTeacherProfile._id;
    });
  }, [schedules, currentTeacherProfile]);

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
  const todaysClasses = useMemo(() => {
    return teacherSchedules
      .filter(s => s.day === currentDayName)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [teacherSchedules, currentDayName]);

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
        color: theme.danger,
        bgColor: 'color-mix(in srgb, var(--danger) 12%, transparent)'
      })),
    ...notices
      .filter(n => new Date(n.publish_date) >= today)
      .map(n => ({
        id: n._id,
        title: n.title,
        date: new Date(n.publish_date),
        type: 'notice',
        icon: 'Users',
        color: theme.primary,
        bgColor: 'color-mix(in srgb, var(--primary) 12%, transparent)'
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
  const myLeaves = useMemo(() => {
    return leaves.filter(l => {
      const lUserId = typeof l.user_id === 'object' ? l.user_id?._id : l.user_id;
      return lUserId === user?.id;
    }).sort((a, b) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime());
  }, [leaves, user?.id]);

  const approvedLeaves = useMemo(() => myLeaves.filter(l => l.status === "approved").length, [myLeaves]);
  const pendingLeaves = useMemo(() => myLeaves.filter(l => l.status === "pending").length, [myLeaves]);

  // ── Teacher Dashboard Dynamic Stats ─────────────────────────────
  // Unique class IDs from the teacher's schedule
  const teacherClassIds = useMemo(() => {
    const ids = new Set<string>();
    teacherSchedules.forEach(s => {
      const cId = typeof s.class_id === 'object' && s.class_id !== null ? (s.class_id as any)._id : s.class_id;
      if (cId) ids.add(String(cId));
    });
    return ids;
  }, [teacherSchedules]);

  // Students belonging to classes this teacher teaches
  const teacherStudents = useMemo(() => {
    return students.filter(s => {
      const cId = typeof s.class_id === 'object' && s.class_id !== null ? (s.class_id as any)._id : s.class_id;
      return cId && teacherClassIds.has(String(cId));
    });
  }, [students, teacherClassIds]);

  const totalTeacherStudentsCount = teacherStudents.length;

  // Active (non-completed) homework for teacher's classes
  const pendingHomeworkCount = useMemo(() => {
    return homework.filter(h => h.status !== "completed").length;
  }, [homework]);

  // Classes where the logged-in teacher is the designated class teacher
  const myClassTeacherClasses = useMemo(() => {
    if (!currentTeacherProfile) return [];
    return classes.filter(c => {
      const ctId = typeof c.class_teacher_id === 'object' && c.class_teacher_id !== null
        ? (c.class_teacher_id as any)._id
        : c.class_teacher_id;
      return String(ctId) === String(currentTeacherProfile._id);
    });
  }, [classes, currentTeacherProfile]);

  // Check whether attendance has been marked today for the teacher's class(es)
  React.useEffect(() => {
    if (!isTeacher || !currentTeacherProfile) return;
    if (myClassTeacherClasses.length === 0) {
      setTodaysAttendanceStatus("N/A");
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const checkAttendance = async () => {
      try {
        let takenCount = 0;
        for (const cls of myClassTeacherClasses) {
          const res = await fetch(
            `/api/attendance/student?date=${todayStr}&classId=${cls._id}&academic_year=${academicYear}`,
            { headers: getAuthHeaders() }
          );
          const data = await res.json();
          if (data.success && data.data && data.data.length > 0) takenCount++;
        }
        setTodaysAttendanceStatus(
          takenCount === myClassTeacherClasses.length ? "Taken" : `${takenCount}/${myClassTeacherClasses.length}`
        );
      } catch {
        setTodaysAttendanceStatus("—");
      }
    };
    checkAttendance();
  }, [isTeacher, currentTeacherProfile, myClassTeacherClasses, academicYear]);

  // Syllabus chapters that are not yet completed (pending / in-progress)
  const pendingOrInProgressChapters = useMemo(() => {
    const list: any[] = [];
    teacherSyllabi.forEach(syl => {
      const assignment = teacherAssignments.find(a => a._id === syl.teacher_assignment_id);
      const className = assignment?.class_id && typeof assignment.class_id === 'object'
        ? `${(assignment.class_id as any).name} ${(assignment.class_id as any).section || ""}`.trim()
        : "Class";
      const subjectName = assignment?.subject_master_id && typeof assignment.subject_master_id === 'object'
        ? (assignment.subject_master_id as any).name
        : "Subject";
      (syl.chapters || []).forEach((ch: any) => {
        if (ch.status !== "Completed") list.push({ ...ch, className, subjectName });
      });
    });
    return list;
  }, [teacherSyllabi, teacherAssignments]);

  // Student marks mapped for the table
  const studentMarksList = useMemo(() => {
    return teacherResults.map(r => {
      const studentInfo = typeof r.student_id === 'object' ? r.student_id as any : null;
      const foundStudent = students.find(s => s._id === studentInfo?._id);
      const classIdObj = foundStudent ? foundStudent.class_id : null;
      let className = "—";
      let sectionName = "—";
      if (classIdObj) {
        if (typeof classIdObj === 'object') {
          className = (classIdObj as any).name || "—";
          sectionName = (classIdObj as any).section || "—";
        } else {
          const cls = classes.find(c => c._id === classIdObj);
          if (cls) { className = cls.name; sectionName = (cls as any).section || "—"; }
        }
      }
      const percentage = r.total_marks > 0 ? (r.marks_obtained / r.total_marks) * 100 : 0;
      const cgpa = (percentage / 20).toFixed(1);
      return {
        id: (foundStudent as any)?.admission_no || (foundStudent as any)?.roll_no || r._id.slice(-5),
        name: studentInfo?.name || "Student",
        photo: foundStudent ? (foundStudent as any)?.photo_url || null : null,
        class: className,
        section: sectionName,
        marks: `${Math.round(percentage)}%`,
        cgpa,
        status: r.is_pass !== false ? "Pass" : "Fail"
      };
    });
  }, [teacherResults, students, classes]);

  const syllabusStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    const inProgressList: any[] = [];

    teacherSyllabi.forEach(syl => {
      // Find the assignment details from teacherSchedules
      const matchingSchedule = teacherSchedules.find(s => {
        // Match either class and subject OR teacher_assignment_id (if we have it, else match via metadata)
        return true;
      });

      // Let's find assignment in teacherAssignments
      const assignment = teacherAssignments.find(a => a._id === syl.teacher_assignment_id);
      const className = assignment?.class_id?.name || "Class";
      const subjectName = assignment?.subject_master_id?.name || "Subject";

      (syl.chapters || []).forEach((ch: any) => {
        total++;
        if (ch.status === "Completed") completed++;
        if (ch.status === "In Progress") {
          inProgressList.push({
            ...ch,
            className,
            subjectName
          });
        }
      });
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      completionRate,
      pendingRate: total > 0 ? 100 - completionRate : 0,
      inProgressList
    };
  }, [teacherSyllabi, teacherAssignments]);

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
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-[var(--primary-hover)] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Student</span>
              </Link>
              {/* Fees Details button hidden (Issue 9) */}
            </>
          )}
          {activeRole === "teacher" && (
            <Link
              href="/attendance/student"
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
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${school.is_active
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-rose-500/15 text-rose-500"
                              }`}>
                              {school.is_active ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href="/schools"
                              className="text-[12px] font-semibold text-slate-500 hover:text-amber-500 underline dark:text-slate-400"
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
                  <Link href="/classes/schedule" className="text-[12px] font-semibold text-primary flex items-center gap-1 hover:text-[var(--primary-hover)]">
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

              {/* Upcoming Events Card — Dynamic */}
              {/* <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow flex flex-col text-left">
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
                    {/* Background Arc */}
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="10"
                      strokeLinecap="round"
                      className="dark:stroke-slate-800"
                    />
                    {/* Dynamic Foreground Progress Arc */}
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="var(--success)"
                      strokeWidth="10"
                      strokeLinecap="round"
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight"> Result</span>
                  </Link>
                  <Link href="/attendance/student" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                    <div className="w-12 h-12 rounded-full bg-[var(--section-alt)] border border-[#FFE7B3] text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Attendance</span>
                  </Link>
                  {/* Fees quick link hidden (Issue 9) */}
                  {/* <Link href="/homework" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                    <div className="w-12 h-12 rounded-full bg-[#FFEBF0] border border-[#FFCCD8] text-danger flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight">Home work</span>
                  </Link> */}
                  <Link href="/reports/student-report" className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                    <div className="w-12 h-12 rounded-full bg-[#EAF9F5] border border-[#C4F0E4] text-success flex items-center justify-center group-hover:scale-105 transition-transform">
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
                  <Link href="/classes/schedule" className="text-[12px] font-semibold text-primary flex items-center gap-1 hover:text-[var(--primary-hover)]">
                    <Plus className="w-3.5 h-3.5" />
                    Add New
                  </Link>
                </div>
                <div className="space-y-4">
                  {schedules.length === 0 ? (
                    <p className="text-[13px] text-slate-400">No schedules found.</p>
                  ) : schedules.slice(0, 3).map((schedule, i) => {
                    const classInfo = typeof schedule.class_id === 'object' ? `${(schedule.class_id as any)?.name} - ${(schedule.class_id as any)?.section}` : String(schedule?.class_id || '');
                    const subjectInfo = typeof schedule.subject_id === 'object' ? (schedule?.subject_id as any)?.name : String(schedule?.subject_id || '');
                    const teacherInfo = typeof schedule.teacher_id === 'object' ? (schedule?.teacher_id as any) : null;
                    const teacherName = teacherInfo?.name || 'Unknown Teacher';
                    const colors = [theme.primary, theme.warning, theme.success];
                    const avatars = ['/asset 12.webp', '/asset 14.webp', '/asset 13.webp'];
                    const teacherPhoto = teacherInfo?.photo_url || avatars[i % avatars.length];
                    const progressVal = getScheduleProgress(schedule.day, schedule.start_time, schedule.end_time);

                    return (
                      <div key={schedule._id} className="border border-border rounded-xl p-3 flex gap-3 items-center">
                        <img src={teacherPhoto} alt={teacherName} className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1.5">
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 capitalize">
                              {schedule.day} ({schedule.start_time} - {schedule.end_time}) - {teacherName}
                            </p>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              {subjectInfo} {classInfo && `(${classInfo})`}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressVal}%`, backgroundColor: colors[i % colors.length] }}></div>
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
              <Link 
                href={isAdmin ? "/leave/approve-leave-request" : "/leave/apply"} 
                className="text-[12px] font-medium text-primary hover:text-[var(--primary-hover)]"
              >
                {isAdmin ? "View All" : "Apply Leave"}
              </Link>
            </div>
            <div className="flex-1 space-y-4">
              {leaves.filter(l => l.status === 'pending').slice(0, 3).length === 0 ? (
                <p className="text-[13px] text-slate-400">No pending leave requests.</p>
              ) : leaves.filter(l => l.status === 'pending').slice(0, 3).map((leave) => {
                const leaveUser = typeof leave.user_id === 'object' ? (leave.user_id as any) : null;
                const leaveTypeName = typeof leave.leave_type === 'object' ? (leave.leave_type as any)?.name : (leave.leave_type || 'Leave');
                return (
                  <div key={leave._id} className="border border-slate-100 dark:border-slate-800/50 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        {leaveUser?.photo_url ? (
                          <img 
                            src={leaveUser.photo_url} 
                            alt={leaveUser.name} 
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" 
                          />
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

          {/* ----------------------------------------------------
              BOTTOM ROW 2: ACTION BUTTONS
              ---------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/attendance/student" className="bg-[var(--section-alt)] hover:bg-[#ffeed1] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#FFE7B3]">
              <div className="flex items-center gap-3 text-primary font-bold text-[13px]">
                <div className="w-10 h-10 bg-primary rounded-lg text-white flex items-center justify-center shadow-sm">
                  <UserCheck className="w-5 h-5" />
                </div>
                View Attendance
              </div>
              <div className="w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-primary"><ChevronRight className="w-3 h-3" /></div>
            </Link>

            <Link href="/notices" className="bg-[#E8F8E8] hover:bg-[#d5f3d5] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#BDE8B5]">
              <div className="flex items-center gap-3 text-success font-bold text-[13px]">
                <div className="w-10 h-10 bg-success rounded-lg text-white flex items-center justify-center shadow-sm">
                  <CalendarDays className="w-5 h-5" />
                </div>
                New Events
              </div>
              <div className="w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-success"><ChevronRight className="w-3 h-3" /></div>
            </Link>

            <Link href="/examination/exam-results" className="bg-[#FFEBF0] hover:bg-[#ffdce5] transition-colors rounded-xl p-4 flex items-center justify-between border border-[#FFCCD8]">
              <div className="flex items-center gap-3 text-danger font-bold text-[13px]">
                <div className="w-10 h-10 bg-danger rounded-lg text-white flex items-center justify-center shadow-sm">
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
                  let Icon = FileText;
                  let bgColor = 'bg-blue-500/15';
                  let textColor = 'text-blue-500';

                  const aud = String(notice.target_audience).toLowerCase();
                  if (aud === 'all') {
                    Icon = Megaphone;
                    bgColor = 'bg-primary/15';
                    textColor = 'text-primary';
                  } else if (aud === 'teachers' || aud === 'staff') {
                    Icon = Users;
                    bgColor = 'bg-emerald-500/15';
                    textColor = 'text-emerald-500';
                  } else if (aud === 'students') {
                    Icon = BookOpen;
                    bgColor = 'bg-amber-500/15';
                    textColor = 'text-amber-500';
                  } else if (aud === 'parents') {
                    Icon = Clock;
                    bgColor = 'bg-purple-500/15';
                    textColor = 'text-purple-500';
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
            <div className="lg:col-span-3 bg-[var(--sidebar-bg)] rounded-xl p-5 card-shadow flex items-center gap-4 relative overflow-hidden">
              {/* Abstract dark shapes mockup */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#2D3748] rounded-full opacity-50"></div>

              <img src={(user as any)?.photo_url || "/asset 12.webp"} alt="Profile" className="w-full sm:w-[72px] h-[72px] rounded-lg object-cover border-2 border-slate-700 z-10 bg-slate-800" />
              <div className="z-10 text-left">
                <span className="bg-white text-primary text-[9px] font-bold px-2 py-0.5 rounded uppercase dark:bg-slate-900">#{(user as any)?.employee_id || "T094001"}</span>
                <h3 className="text-[15px] font-bold text-white mt-1.5">{user?.name || "Teacher Name"}</h3>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1" title={`Classes : ${uniqueClasses.join(', ')} • ${uniqueSubjects.join(', ')}`}>
                  Classes : {uniqueClasses.length > 0 ? uniqueClasses.slice(0, 2).join(', ') : "None"}  <span className="mx-1">•</span> {uniqueSubjects.length > 0 ? uniqueSubjects[0] : "No Subject"}
                </p>
              </div>
              <button className="absolute bottom-4 right-4 bg-primary text-white text-[11px] font-bold px-3 py-1.5 rounded z-10 hover:bg-[var(--primary-hover)]">
                Edit Profile
              </button>
            </div>

            {/* Syllabus Progress */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center justify-between text-left">
              <div className="w-full sm:w-[80px] h-[80px] relative shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--danger)" strokeWidth="16" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--primary)" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * syllabusStats.completionRate) / 100} />
                </svg>
              </div>
              <div className="flex-1 ml-6">
                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-3">Syllabus</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-primary"></span> Completed : {syllabusStats.completionRate}%
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-danger"></span> Pending : {syllabusStats.pendingRate}%
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
                        { bg: "bg-danger", text: "text-danger" },
                        { bg: "bg-primary", text: "text-primary" },
                        { bg: "bg-success", text: "text-success" },
                        { bg: "bg-info", text: "text-info" },
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

              {/* In-Progress Chapters */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  In-Progress Chapters
                </h3>
                {syllabusStats.inProgressList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {syllabusStats.inProgressList.map((ch, idx) => (
                      <div key={idx} className="bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                            CH {ch.chapter_no}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {ch.className} • {ch.subjectName}
                          </span>
                        </div>
                        <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{ch.chapter_name}</h4>
                        {ch.target_date && (
                          <p className="text-[11px] text-slate-500 mt-1 dark:text-slate-400">Target: {new Date(ch.target_date).toLocaleDateString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[13px] text-slate-500 dark:text-slate-400 text-center py-6 border border-dashed border-border rounded-xl">
                    No chapters currently in progress
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
                      <p className="text-[20px] font-bold text-success">{approvedLeaves}</p>
                    </div>
                    <div className="text-center p-4 bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase mb-1">Pending Requests</p>
                      <p className="text-[20px] font-bold text-primary">{pendingLeaves}</p>
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
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${leave.status === 'approved' ? 'bg-success/10 text-success' :
                            leave.status === 'rejected' ? 'bg-danger/10 text-danger' :
                              'bg-[var(--section-alt)] text-primary'
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
                      <Link href="/examination/result" className="text-[12px] font-semibold text-primary">View All</Link>
                    </div>

                    <div className="space-y-5">
                      {bestPerformers.length > 0 ? (
                        bestPerformers.map((result, idx) => {
                          const colors = [
                            { bg: 'bg-primary', bgTrack: 'bg-primary/10 dark:bg-primary/20' },
                            { bg: 'bg-warning', bgTrack: 'bg-warning/10 dark:bg-warning/20' },
                            { bg: 'bg-info', bgTrack: 'bg-info/10 dark:bg-info/20' },
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
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-slate-800 flex items-center justify-center text-info font-bold text-lg">
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
                                  <Award className="w-4 h-4 text-success" />
                                ) : (
                                  <X className="w-4 h-4 text-danger" />
                                )}
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${result.is_pass !== false ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
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
            <div className="lg:col-span-4 space-y-4">
              {/* Today's Classes Card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {todaysClasses.length}
                  </h4>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Today's Classes</p>
                </div>
              </div>

              {/* Total Students Card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {totalTeacherStudentsCount}
                  </h4>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Total Students</p>
                </div>
              </div>

              {/* Homework Pending Card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {pendingHomeworkCount}
                  </h4>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Homework Pending</p>
                </div>
              </div>

              {/* Attendance Taken Today Card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
                <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {todaysAttendanceStatus}
                  </h4>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Attendance Taken Today</p>
                </div>
              </div>

              {/* Assignments Card */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 hover:shadow-md group">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
                  <Award className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {teacherAssignments.length}
                  </h4>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Assignments</p>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Rows: Lesson Plan */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 card-shadow text-left">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Syllabus / Lesson Plan</h3>
              <Link href="#" className="text-[12px] font-semibold text-primary">View All</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pendingOrInProgressChapters.length > 0 ? (
                pendingOrInProgressChapters.slice(0, 4).map((ch, idx) => {
                  const bgColors = [
                    'bg-success/10 text-success',
                    'bg-primary/10 text-primary',
                    'bg-info/10 text-info',
                    'bg-danger/10 text-danger'
                  ];
                  const bgClass = bgColors[idx % bgColors.length];

                  return (
                    <div key={idx} className="border border-border rounded-xl p-4 flex flex-col justify-between h-[140px] hover:shadow-md transition-shadow">
                      <div className={`${bgClass} text-[11px] font-bold text-center py-1.5 rounded-md mb-3`}>
                        {ch.className}
                      </div>
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-2 line-clamp-2" title={ch.chapter_name}>
                        Ch {ch.chapter_no}: {ch.chapter_name}
                      </h4>
                      <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
                          {ch.subjectName}
                        </span>
                        <span className={`text-[10.5px] font-bold ${ch.status === 'In Progress' ? 'text-amber-500' : 'text-slate-400'}`}>
                          {ch.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8 text-[13px] text-slate-500 border border-dashed border-border rounded-xl">
                  All chapters are completed! No pending lesson plans.
                </div>
              )}
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
                  {studentMarksList.length > 0 ? (
                    studentMarksList.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-4">{row.id}</td>
                        <td className="py-3 px-4 flex items-center gap-2">
                          {row.photo ? (
                            <img src={row.photo} className="w-6 h-6 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {row.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {row.name}
                        </td>
                        <td className="py-3 px-4">{row.class}</td>
                        <td className="py-3 px-4">{row.section}</td>
                        <td className="py-3 px-4">{row.marks}</td>
                        <td className="py-3 px-4">{row.cgpa}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${row.status === "Pass" ? "bg-success text-white" : "bg-danger text-white"
                            }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No student marks found for your subjects.
                      </td>
                    </tr>
                  )}
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
                {myLeaves.length > 0 ? (
                  myLeaves.slice(0, 4).map((leave, idx) => {
                    const statusColors = leave.status === 'approved'
                      ? 'bg-success/10 text-success'
                      : (leave.status as string) === 'rejected' || (leave.status as string) === 'declined'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-info/10 text-info';
                    const iconColor = leave.status === 'approved'
                      ? 'text-success bg-success/10'
                      : 'text-danger bg-danger/10';
                    return (
                      <div key={leave._id || idx} className="border border-border rounded-xl p-4 flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColor}`}>
                            {leave.status === 'approved'
                              ? <CheckCircle2 className="w-4 h-4" />
                              : <X className="w-4 h-4" />
                            }
                          </div>
                          <div>
                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white capitalize">
                              {leave.leave_type || leave.reason || "Leave"} Leave
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Date: {new Date(leave.from_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded capitalize ${statusColors}`}>
                          {leave.status}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 text-center py-8">
                    No leave history found.
                  </div>
                )}
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
                    className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-900 dark:text-white"
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
              <p className="text-slate-500 max-w-md mx-auto mt-2 dark:text-slate-400">
                We couldn't find any students linked to your account.
              </p>
            </div>
          ) : (
            <>
              {/* Overview Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-left">
                {/* Today's Classes */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {studentTodaysClasses.length}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Today's Classes</p>
                  </div>
                </div>

                {/* Total Subjects */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {totalSubjectsCount}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Total Subjects</p>
                  </div>
                </div>

                {/* Attendance Rate */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-lg">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {studentAttendanceRate}%
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Attendance Rate</p>
                  </div>
                </div>

                {/* Present Days */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-teal-500/10 text-teal-500 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {studentAttendanceSummary?.present ?? 0}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Present Days</p>
                  </div>
                </div>

                {/* Absent Days */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg">
                    <X className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {studentAttendanceSummary?.absent ?? 0}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Absent Days</p>
                  </div>
                </div>

                {/* Pending Homework */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {pendingHwCount}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Pending Homework</p>
                  </div>
                </div>

                {/* Upcoming Tests */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {assessments.filter(t => new Date(t.test_date) >= new Date() && t.computedStatus !== "completed").length}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Upcoming Tests</p>
                  </div>
                </div>

                {/* Latest Result */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500/10 text-sky-500 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {averageGrade > 0 ? `${averageGrade}%` : "—"}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Latest Result</p>
                  </div>
                </div>
              </div>

              {/* Top Section: Masonry-like 3 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Column 1 (Left): Profile & Today's Class */}
                <div className="lg:col-span-3 flex flex-col gap-6">

                  {/* Profile Card */}
                  <div className="bg-[var(--sidebar-bg)] rounded-xl p-5 text-white relative overflow-hidden flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(30,41,59,0.3)]">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "16px 16px" }}></div>
                    <div className="absolute top-3 right-3 w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-yellow-400 border-r-[10px] border-r-transparent transform rotate-45"></div>

                    <div className="relative z-10 flex gap-4 items-center">
                      <div className="w-14 h-14 bg-white rounded flex items-center justify-center p-0.5 shadow-sm overflow-hidden dark:bg-slate-900">
                        {(displayStudent as any)?.photo_url
                          ? <img src={(displayStudent as any).photo_url} alt="Profile" className="w-full h-full rounded object-cover" />
                          : <span className="text-primary font-black text-xl">{((displayStudent as any)?.name || 'S').charAt(0).toUpperCase()}</span>
                        }
                      </div>
                      <div>
                        <span className="bg-white text-primary text-[9px] font-bold px-2 py-0.5 rounded uppercase dark:bg-slate-900">#{(displayStudent as any)?.admission_no || (displayStudent as any)?.roll_no || "ST123456"}</span>
                        <h3 className="text-[16px] font-bold mt-1.5">{(displayStudent as any)?.name}</h3>
                        <p className="text-[11px] text-white/70 mt-0.5">
                          Class : {(displayStudent as any)?.class_id ? (typeof (displayStudent as any).class_id === 'object' ? (displayStudent as any).class_id.name : "N/A") : "N/A"}
                          | Section : {(displayStudent as any)?.class_id ? (typeof (displayStudent as any).class_id === 'object' ? (displayStudent as any).class_id.section : "N/A") : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Academic Info Grid inside profile card */}
                    <div className="relative z-10 mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-y-3 text-left text-white/80">
                      <div>
                        <span className="text-[9px] block text-white/60">Roll Number</span>
                        <span className="text-[12px] font-bold text-white">{(displayStudent as any)?.roll_no || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] block text-white/60">Academic Year</span>
                        <span className="text-[12px] font-bold text-white">{(displayStudent as any)?.academic_year || academicYear || "N/A"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] block text-white/60">Class Teacher</span>
                        <span className="text-[12px] font-bold text-white">
                          {(displayStudent as any)?.class_id?.class_teacher_id?.name || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between mt-6 border-t border-white/10 pt-4">
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
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
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
                        let statusColor = "bg-[#FFF5E6] text-primary";
                        let dotColor = "bg-primary";

                        if (currentTime >= endMins) {
                          status = "Completed";
                          statusColor = "bg-success/10 text-success";
                          dotColor = "bg-[#1D7F2C]";
                        } else if (currentTime >= startMins && currentTime < endMins) {
                          status = "Inprogress";
                          statusColor = "bg-info/10 text-info";
                          dotColor = "bg-info";
                        }

                        return (
                          <div key={cls._id || idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/30">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {(teacher as any)?.photo_url ? <img src={(teacher as any).photo_url} alt="Teacher" className="w-full h-full rounded object-cover" /> : subject.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{subject}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 dark:text-slate-400"><Clock className="w-3 h-3 shrink-0" /> {startTime} - {endTime}</p>
                              </div>
                            </div>
                            <span className={`${statusColor} text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0`}>
                              <span className={`w-1 h-1 rounded-full ${dotColor}`}></span> {status}
                            </span>
                          </div>
                        );
                      }) : (
                        <div className="text-center py-6 text-slate-500 text-xs dark:text-slate-400">No classes scheduled for today.</div>
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
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                        {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Attendance
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-6 mb-6">
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Present</p>
                        <p className="text-[16px] font-bold mt-1">{studentAttendanceSummary?.present ?? 0}</p>
                      </div>
                      <div className="w-px h-8 bg-border"></div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Absent</p>
                        <p className="text-[16px] font-bold mt-1">{studentAttendanceSummary?.absent ?? 0}</p>
                      </div>
                      <div className="w-px h-8 bg-border"></div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Late / Leave</p>
                        <p className="text-[16px] font-bold mt-1">{(studentAttendanceSummary?.late ?? 0) + (studentAttendanceSummary?.leave ?? 0)}</p>
                      </div>
                    </div>

                    {/* Donut Chart SVG */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="relative w-40 h-40">
                        {(() => {
                          const attPresent = studentAttendanceSummary?.present ?? 0;
                          const attAbsent = studentAttendanceSummary?.absent ?? 0;
                          const attLate = studentAttendanceSummary?.late ?? 0;
                          const attHalfDay = studentAttendanceSummary?.half_day ?? 0;
                          const attLeave = studentAttendanceSummary?.leave ?? 0;
                          const attTotal = attPresent + attAbsent + attLate + attHalfDay + attLeave;

                          const pctPresent = attTotal > 0 ? (attPresent / attTotal) * 100 : 0;
                          const pctLate = attTotal > 0 ? (attLate / attTotal) * 100 : 0;
                          const pctHalfDay = attTotal > 0 ? (attHalfDay / attTotal) * 100 : 0;
                          const pctLeave = attTotal > 0 ? (attLeave / attTotal) * 100 : 0;
                          const pctAbsent = attTotal > 0 ? (attAbsent / attTotal) * 100 : 0;

                          const dashOffset1 = 251.2 - (251.2 * pctPresent) / 100;
                          const dashOffset2 = 251.2 - (251.2 * pctLate) / 100;
                          const rotate2 = (pctPresent * 3.6);
                          const dashOffset3 = 251.2 - (251.2 * pctHalfDay) / 100;
                          const rotate3 = ((pctPresent + pctLate) * 3.6);
                          const dashOffset4 = 251.2 - (251.2 * pctLeave) / 100;
                          const rotate4 = ((pctPresent + pctLate + pctHalfDay) * 3.6);
                          const dashOffset5 = 251.2 - (251.2 * pctAbsent) / 100;
                          const rotate5 = ((pctPresent + pctLate + pctHalfDay + pctLeave) * 3.6);

                          return (
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                              {/* Background circle */}
                              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="12" className="dark:stroke-slate-800" />
                              
                              {/* Present (Green) */}
                              {pctPresent > 0 && (
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" strokeWidth="12"
                                  strokeDasharray="251.2" strokeDashoffset={dashOffset1}
                                  className="transition-all duration-1000 ease-out" />
                              )}
                              {/* Late (Blue) */}
                              {pctLate > 0 && (
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3B82F6" strokeWidth="12"
                                  strokeDasharray="251.2" strokeDashoffset={dashOffset2}
                                  transform={`rotate(${rotate2}, 50, 50)`}
                                  className="transition-all duration-1000 ease-out" />
                              )}
                              {/* Half Day (Gray) */}
                              {pctHalfDay > 0 && (
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#94A3B8" strokeWidth="12"
                                  strokeDasharray="251.2" strokeDashoffset={dashOffset3}
                                  transform={`rotate(${rotate3}, 50, 50)`}
                                  className="transition-all duration-1000 ease-out" />
                              )}
                              {/* Leave (Purple) */}
                              {pctLeave > 0 && (
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#A855F7" strokeWidth="12"
                                  strokeDasharray="251.2" strokeDashoffset={dashOffset4}
                                  transform={`rotate(${rotate4}, 50, 50)`}
                                  className="transition-all duration-1000 ease-out" />
                              )}
                              {/* Absent (Red) */}
                              {pctAbsent > 0 && (
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#EF4444" strokeWidth="12"
                                  strokeDasharray="251.2" strokeDashoffset={dashOffset5}
                                  transform={`rotate(${rotate5}, 50, 50)`}
                                  className="transition-all duration-1000 ease-out" />
                              )}
                            </svg>
                          );
                        })()}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-6">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div><span className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Present</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div><span className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Late</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400"></div><span className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Half Day</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#EF4444]"></div><span className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Absent</span></div>
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

                            const dateStr = dayDate.toISOString().split('T')[0];
                            const matchingRecord = studentWeeklyAttendance.find(rec => {
                              const recDate = new Date(rec.date).toISOString().split('T')[0];
                              return recDate === dateStr;
                            });

                            let dotColor = "bg-primary/10 text-primary";
                            if (matchingRecord) {
                              const status = matchingRecord.status;
                              if (status === "present") dotColor = "bg-[#10B981] text-white";
                              else if (status === "late") dotColor = "bg-[#3B82F6] text-white";
                              else if (status === "absent") dotColor = "bg-[#EF4444] text-white";
                              else if (status === "leave") dotColor = "bg-[#A855F7] text-white";
                              else if (status === "half_day") dotColor = "bg-slate-400 text-white";
                            } else if (isWeekend) {
                              dotColor = "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700";
                            } else if (isPast) {
                              dotColor = "bg-slate-200 dark:bg-slate-800/40 text-slate-400";
                            }

                            return (
                              <div key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${dotColor}`}>{d}</div>
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
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Calendar</span>
                    </Link>
                    <Link href={activeRole === "parent" ? "/parent/attendance" : "/attendance/my-attendance"} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-3 flex items-center gap-2 justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-foreground" />
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
                      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                        {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-[11px] font-semibold text-slate-500 py-1 dark:text-slate-400">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {calendarDays.map((d, i) => {
                        const isCurrentMonth = d.getMonth() === today.getMonth();
                        const isToday = d.toDateString() === today.toDateString();
                        const hasHoliday = holidays.some(h => new Date(h.date).toDateString() === d.toDateString());
                        return (
                          <div key={i} className={`text-[12px] py-1.5 flex justify-center`}>
                            <span className={`w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white font-bold shadow-md shadow-primary/30'
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
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 dark:text-slate-400"><Clock className="w-3 h-3" /> {startTime} - {endTime}</p>
                          </div>
                        );
                      }) : (
                        <div className="text-center py-4 text-slate-500 text-xs dark:text-slate-400">No classes scheduled for today.</div>
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
                          <stop offset="0%" stopColor="var(--info)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--info)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradNavy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Avg Attendance (Light Blue) line + area */}
                      {attendancePath && (
                        <>
                          <path d={attendanceAreaPath} fill="url(#gradBlue)" />
                          <path d={attendancePath} fill="none" stroke="var(--info)" strokeWidth="2" />
                        </>
                      )}

                      {/* Dots for light blue line */}
                      {attendancePoints.map((pt, i) => {
                        const [x, y] = pt.split(',');
                        return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--info)" />;
                      })}

                      {/* Avg Exam Score (Navy Blue) line + area */}
                      {examPath && (
                        <>
                          <path d={examAreaPath} fill="url(#gradNavy)" />
                          <path d={examPath} fill="none" stroke="var(--primary)" strokeWidth="2" />
                        </>
                      )}

                      {/* Dots for navy line */}
                      {examPoints.map((pt, i) => {
                        const [x, y] = pt.split(',');
                        return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--primary)" />;
                      })}
                    </svg>

                    {/* X-axis labels */}
                    <div className="absolute left-6 right-0 bottom-0 flex justify-between text-[10px] text-slate-400">
                      {examPerformance.map((item, idx) => (
                        <span key={idx}>{item.label}</span>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Avg. Exam Score</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-info"></div>
                      <span className="text-[11px] text-slate-500 font-medium dark:text-slate-400">Avg. Attendance</span>
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

                      // Calculate real status and completion percentage
                      const hasSubmitted = (hw as any).submissions?.some((sub: any) => {
                        const subStudentId = typeof sub.student_id === 'object' ? sub.student_id?._id : sub.student_id;
                        return subStudentId?.toString() === displayStudentId?.toString();
                      });
                      const isCompleted = hw.status === "completed" || hasSubmitted;
                      const isOverdue = !isCompleted && new Date(hw.due_date) < new Date();
                      
                      const pct = isCompleted ? 100 : isOverdue ? 0 : 50;
                      let color = "#3B82F6"; // default blue
                      if (isCompleted) color = "#10B981"; // green
                      else if (isOverdue) color = "#EF4444"; // red
                      else color = "#F59E0B"; // amber

                      const dueStr = new Date(hw.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

                      return (
                        <div key={hw._id || idx} className="flex items-center justify-between gap-3">
                          <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 dark:text-slate-400">
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
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">{(teacher as any)?.name?.split(' ')[0] || "Teacher"}</span>
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
                      <div className="text-center py-6 text-slate-500 text-xs dark:text-slate-400">No pending homeworks.</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Class Faculties Row */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Class Faculties</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="w-6 h-6 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400">
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button className="w-6 h-6 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400">
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
                      <div className="text-sm text-slate-500 py-4 px-2 dark:text-slate-400">No class faculty data available.</div>
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
                            <p className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">{(subject as any)?.name || 'Subject'}</p>
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
              <div className={`grid grid-cols-1 md:grid-cols-2 ${SHOW_FEES ? "xl:grid-cols-4" : "xl:grid-cols-3"} gap-6`}>

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
                        statusColor = "bg-[#E8F8E8] text-success";
                        icon = <CheckCircle2 className="w-4 h-4" />;
                      } else if (leave.status === 'pending') {
                        statusColor = "bg-info/10 text-info";
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
                              <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">Date : {new Date(leave.from_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <span className={`${statusColor} text-[9px] font-bold px-2 py-0.5 rounded capitalize`}>{leave.status}</span>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-6 text-slate-500 text-xs dark:text-slate-400">No recent leave requests.</div>
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
                    }) : <span className="text-slate-500 dark:text-slate-400">No results</span>}
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
                      const barColor = pct >= 90 ? "bg-success" : pct >= 75 ? "bg-primary" : pct >= 50 ? "bg-info" : "bg-danger";
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 z-10">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                          <div className={`w-6 ${barColor} rounded-t transition-all`} style={{ height: `${Math.max(pct, 5)}px` }}></div>
                          <span className="text-[10px] text-slate-500 mt-1 dark:text-slate-400">{subName?.substring(0, 3)}</span>
                        </div>
                      );
                    }) : (
                      <div className="z-10 w-full text-center text-slate-500 text-xs mb-8 dark:text-slate-400">No exam results available.</div>
                    )}
                  </div>
                </div>

                {/* Fees — Recent Payments */}
                {SHOW_FEES && (
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Recent Payments</h3>
                      <Link href={activeRole === "parent" ? "/parent/fees" : "/fees"} className="text-[12px] font-semibold text-primary">View All</Link>
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
                              <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">{new Date((p as any).transaction_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <span className="text-[12px] font-black text-emerald-600">${(p as any).amount_paid?.toLocaleString()}</span>
                        </div>
                      )) : (
                        <div className="text-center py-6 text-slate-500 text-xs dark:text-slate-400">No payment history found.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Exam Performance Per Subject */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-4">Subject Performance</h3>

                  {studentResults.length > 0 ? (
                    <div className="space-y-3">
                      {studentResults.slice(0, 7).map((r, i) => {
                        const subName = typeof r.subject_id === 'object' ? (r.subject_id as any)?.name : 'Subject';
                        const pct = r.total_marks > 0 ? Math.round((r.marks_obtained / r.total_marks) * 100) : 0;
                        const color = pct >= 80 ? theme.success : pct >= 60 ? theme.primary : pct >= 40 ? theme.info : theme.danger;
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
                    <div className="text-center py-6 text-slate-500 text-xs dark:text-slate-400">No exam results yet.</div>
                  )}
                </div>

              </div>

              {/* Footer Grid: Notice Board & Todo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Notice Board — Dynamic */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex flex-col text-left">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Notice Board</h3>
                    <Link href="/notices" className="text-[12px] font-semibold text-primary">View All</Link>
                  </div>

                  <div className="space-y-4">
                    {notices.filter(n => n.is_published).sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()).slice(0, 5).length > 0
                      ? notices.filter(n => n.is_published).sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()).slice(0, 5).map((notice, i) => {
                        const colors = ['bg-primary/10 text-primary', 'bg-[#E8F8E8] text-success', 'bg-[#FFEBF0] text-[#EF4444]', 'bg-info/10 text-info', 'bg-[#FFF5E6] text-primary'];
                        return (
                          <div key={notice._id || i} className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${colors[i % colors.length]}`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{notice.title}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 dark:text-slate-400">
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
                        <div className="w-4 h-4 rounded bg-primary flex items-center justify-center text-white shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">Send Reminder to Students</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">01:00 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#E8F8E8] text-success text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Completed</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5"></div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">Create Routine to new staff</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">04:50 PM</p>
                        </div>
                      </div>
                      <span className="bg-info/10 text-info text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Inprogress</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5"></div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">Extra Class Info to Students</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">04:55 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#FFF5E6] text-primary text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Yet to Start</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5"></div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">Fees for Upcoming Academics</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">04:55 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#FFF5E6] text-primary text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Yet to Start</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5"></div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">English - Essay on Visit</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">05:55 PM</p>
                        </div>
                      </div>
                      <span className="bg-[#FFF5E6] text-primary text-[9px] font-bold px-2 py-0.5 rounded ml-2 shrink-0">Yet to Start</span>
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
