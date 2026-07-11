"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTeachers, ApiTeacher } from "../../../hooks/useTeachers";
import { useClasses } from "../../../hooks/useClasses";
import { useLeave } from "../../../hooks/useLeave";
import { useSchedules } from "../../../hooks/useSchedules";
import { useAttendanceSummary } from "../../../hooks/useAttendanceSummary";
import { Modal } from "../../../components/ui/modal";
import { Loader2, AlertCircle } from "lucide-react";
import { getAuthHeaders, getStoredUser } from "@/lib/utils/session";
import { LoginDetailsModal } from "../../../components/modals/LoginDetailsModal";
import { ResetPasswordModal } from "../../../components/modals/ResetPasswordModal";
import { GenerateDocumentWizard } from "@/app/components/document-builder/GenerateDocumentWizard";
import {
  User, Phone, Mail, FileText, Calendar, Clock, Edit, ChevronDown, CheckCircle, RefreshCcw, Check, X, Download, Briefcase, Copy, Plus, AlertTriangle, Lock
} from "lucide-react";

export default function TeacherDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;
  const { getTeacher } = useTeachers({ skip: true });
  const { classes } = useClasses();

  const [teacher, setTeacher] = useState<ApiTeacher | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab states
  const [activeMainTab, setActiveMainTab] = useState<string>("Teacher Details");
  const [attendanceSubTab, setAttendanceSubTab] = useState<"Leaves" | "Attendance">("Attendance");

  // Modal states
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isLoginDetailsOpen, setIsLoginDetailsOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  // Live assignments state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Dynamic schedules & leaves
  const { schedules, isLoading: schedulesLoading } = useSchedules(undefined, teacherId);

  const teacherUserId = teacher
    ? (teacher.user_id && typeof teacher.user_id === "object"
      ? (teacher.user_id as any)._id
      : (typeof teacher.user_id === "string" ? teacher.user_id : undefined))
    : undefined;
  const { leaveRequests, submitLeave, loading: leavesLoading } = useLeave(undefined, teacherUserId);

  // Attendance summary & details state
  const { fetchSummary, fetchDetail } = useAttendanceSummary();
  const [selectedYear, setSelectedYear] = useState("2026-2027");
  const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, late: 0, holiday: 0, half_day: 0 });
  const [dailyAttendance, setDailyAttendance] = useState<Array<{ date: string; status: string; note?: string }>>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Apply Leave form states
  const [leaveType, setLeaveType] = useState("casual");
  const [leaveFromDate, setLeaveFromDate] = useState("");
  const [leaveToDate, setLeaveToDate] = useState("");
  const [leaveDaysNum, setLeaveDaysNum] = useState("1");
  const [leaveReason, setLeaveReason] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Fetch teacher details
  useEffect(() => {
    if (!teacherId) return;
    getTeacher(teacherId).then(t => {
      setTeacher(t);
      setLoading(false);
    });
  }, [teacherId, getTeacher]);

  // Fetch live assignments
  useEffect(() => {
    if (!teacherId) return;
    setAssignmentsLoading(true);
    fetch(`/api/teacher-assignment?teacher_id=${teacherId}&limit=all`, {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setAssignments(res.data.assignments || []);
        }
      })
      .catch(err => console.error("Error fetching assignments:", err))
      .finally(() => setAssignmentsLoading(false));
  }, [teacherId]);

  // Sync leave duration calculation
  useEffect(() => {
    if (leaveFromDate && leaveToDate) {
      const from = new Date(leaveFromDate);
      const to = new Date(leaveToDate);
      const diffTime = to.getTime() - from.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setLeaveDaysNum(diffDays > 0 ? String(diffDays) : "0");
    }
  }, [leaveFromDate, leaveToDate]);

  // Load attendance data
  useEffect(() => {
    if (!teacher) return;

    const loadAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const [startYr, endYr] = selectedYear.split("-");
        const start = `${startYr}-06-01`;
        const end = `${endYr}-05-31`;

        // Fetch summary
        const summary = await fetchSummary(start, end, "teacher");
        if (summary && summary[teacher._id]) {
          setAttendanceSummary(summary[teacher._id]);
        } else {
          setAttendanceSummary({ present: 0, absent: 0, late: 0, holiday: 0, half_day: 0 });
        }

        // Fetch daily detail list
        const details = await fetchDetail(start, end, "teacher", teacher._id);
        if (details) {
          setDailyAttendance(details);
        } else {
          setDailyAttendance([]);
        }
      } catch (err) {
        console.error("Error loading attendance:", err);
      } finally {
        setAttendanceLoading(false);
      }
    };

    loadAttendance();
  }, [teacher, selectedYear, fetchSummary, fetchDetail]);

  // Security Check (Part 12)
  const loggedInUser = getStoredUser();
  const isTeacherSelf = loggedInUser?.role === "teacher" && teacher && String(teacherUserId) === String(loggedInUser.id);
  const isAuthorized = loggedInUser?.role !== "teacher" || isTeacherSelf;

  // Derivations from live assignments
  const assignedClasses = useMemo(() => {
    const list: string[] = [];
    assignments.forEach(a => {
      if (a.class_id) {
        const clsName = a.class_id.section ? `${a.class_id.name} - ${a.class_id.section}` : a.class_id.name;
        if (!list.includes(clsName)) list.push(clsName);
      }
    });
    return list;
  }, [assignments]);

  const assignedSubjects = useMemo(() => {
    const list: string[] = [];
    assignments.forEach(a => {
      if (a.subject_master_id) {
        const subName = a.subject_master_id.name;
        if (!list.includes(subName)) list.push(subName);
      }
    });
    return list;
  }, [assignments]);

  const currentWorkload = useMemo(() => {
    return assignments.reduce((acc, a) => acc + (Number(a.weekly_periods) || 0), 0);
  }, [assignments]);

  if (loading) return <div className="p-10 flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span>Loading teacher...</span></div>;
  if (!teacher) return <div className="p-10 text-slate-500 dark:text-slate-400">Teacher not found.</div>;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center px-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Access Denied</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">You do not have permission to view this teacher's personal information.</p>
        <button onClick={() => router.push("/teachers")} className="mt-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-850 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const canManage = loggedInUser?.role !== "teacher";
  const canEdit = loggedInUser?.role !== "teacher" || isTeacherSelf;

  const getClassName = (cid: any) => {
    if (!cid) return "Not Assigned";
    if (typeof cid === "object") {
      if (cid.name) {
        return `${cid.name} ${cid.section || ""}`.trim();
      }
      return "Not Assigned";
    }
    const found = classes.find(c => c._id === cid);
    return found ? `${found.name} ${found.section || ""}`.trim() : "Not Assigned";
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/30">
      <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <span className="text-[13px] text-slate-500 dark:text-slate-400 text-right">{value}</span>
    </div>
  );

  const DocRow = ({ title, url }: { title: string; url?: string }) => (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-slate-50/30">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-8 h-8 bg-white dark:bg-slate-900 border border-border rounded flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            {title.split(".").pop() || "PDF"}
          </span>
        </div>
        <p className="text-[13px] font-bold text-slate-900 dark:text-white max-w-full sm:w-[200px] truncate">{title}</p>
      </div>
      {url ? (
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-slate-700 bg-slate-800 rounded text-white transition-colors flex items-center justify-center"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      ) : (
        <button className="p-1.5 hover:bg-slate-700 bg-slate-800 rounded text-white transition-colors cursor-not-allowed opacity-50">
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const TabItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-[13px] font-bold transition-all border-b-2 whitespace-nowrap
        ${active ? "text-primary border-primary bg-primary/5" : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  // Map Timetable Routine entries dynamically
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const timeTableData = daysOfWeek.map(dayName => {
    return schedules
      .filter(s => s.day.toLowerCase() === dayName)
      .map(s => {
        const className = typeof s.class_id === "object" ? `${s.class_id?.name}, ${s.class_id?.section}` : "Unknown Class";
        const subjectName = typeof s.subject_id === "object" ? s.subject_id.name : "Unknown Subject";
        return {
          room: s.room || "",
          class: className,
          subject: subjectName,
          time: `${s.start_time} - ${s.end_time}`
        };
      });
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Leave calculations
  const approvedLeaves = leaveRequests.filter(l => l.status === "approved");
  const medicalUsed = approvedLeaves.filter(l => l.leave_type === "sick").reduce((acc, l) => acc + (l.total_days || 0), 0);
  const casualUsed = approvedLeaves.filter(l => l.leave_type === "casual").reduce((acc, l) => acc + (l.total_days || 0), 0);
  const emergencyUsed = approvedLeaves.filter(l => l.leave_type === "emergency").reduce((acc, l) => acc + (l.total_days || 0), 0);
  const otherUsed = approvedLeaves.filter(l => l.leave_type === "other").reduce((acc, l) => acc + (l.total_days || 0), 0);

  const medicalTotal = 10;
  const casualTotal = 12;
  const emergencyTotal = 10;
  const otherTotal = 10;

  // Handle Apply Leave Form Submission
  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherUserId) return alert("Teacher login credentials not found.");
    if (!leaveFromDate || !leaveToDate) return alert("Please specify dates.");

    setIsSubmittingLeave(true);
    try {
      const res = await submitLeave({
        leave_type: leaveType as any,
        from_date: leaveFromDate,
        to_date: leaveToDate,
        reason: leaveReason,
        user_id: teacherUserId
      });
      if (res.success) {
        setIsApplyLeaveOpen(false);
        setLeaveFromDate("");
        setLeaveToDate("");
        setLeaveReason("");
        alert("Leave applied successfully!");
      } else {
        alert(res.message || "Failed to apply leave.");
      }
    } catch {
      alert("Failed to apply leave.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Daily attendance grid construction
  const dailyMap: Record<string, string> = {};
  dailyAttendance.forEach((r) => {
    const d = new Date(r.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;

    let s = "";
    if (r.status === "present") s = "P";
    else if (r.status === "absent") s = "A";
    else if (r.status === "late") s = "L";
    else if (r.status === "half_day" || r.status === "halfday") s = "HD";
    else if (r.status === "holiday") s = "H";
    dailyMap[key] = s;
  });

  const startYr = parseInt(selectedYear.split("-")[0]);
  const monthsList = [
    { name: "Jun", monthIndex: 5, yearOffset: 0 },
    { name: "Jul", monthIndex: 6, yearOffset: 0 },
    { name: "Aug", monthIndex: 7, yearOffset: 0 },
    { name: "Sep", monthIndex: 8, yearOffset: 0 },
    { name: "Oct", monthIndex: 9, yearOffset: 0 },
    { name: "Nov", monthIndex: 10, yearOffset: 0 },
    { name: "Dec", monthIndex: 11, yearOffset: 0 },
    { name: "Jan", monthIndex: 0, yearOffset: 1 },
    { name: "Feb", monthIndex: 1, yearOffset: 1 },
    { name: "Mar", monthIndex: 2, yearOffset: 1 },
    { name: "Apr", monthIndex: 3, yearOffset: 1 }
  ];

  const daysArray = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const matrixRows = daysArray.map(dayStr => {
    const statuses = monthsList.map(month => {
      const year = startYr + month.yearOffset;
      const monthStr = String(month.monthIndex + 1).padStart(2, "0");
      const key = `${year}-${monthStr}-${dayStr}`;

      const dayNum = parseInt(dayStr);
      const testDate = new Date(year, month.monthIndex, dayNum);
      if (testDate.getMonth() !== month.monthIndex || testDate.getDate() !== dayNum) {
        return ""; // Invalid date
      }
      return dailyMap[key] || "";
    });
    return { day: dayStr, statuses };
  });

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[20px] leading-[24px] font-semibold text-foreground dark:text-slate-100">Teacher Details</h1>
          <div className="flex items-center gap-2 text-[14px] leading-[21px] text-[#68718a] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/teachers" className="hover:text-primary">Teachers</Link>
            <span>/</span>
            <span className="text-foreground dark:text-slate-100 font-normal">Teacher Details</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canManage && (
            <>
              <button
                onClick={() => setIsLoginDetailsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Login Details</span>
              </button>
              <button
                onClick={() => setIsGenerateOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-indigo-200 dark:border-indigo-700/50 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 shadow-sm transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generate Document</span>
              </button>
              <button
                onClick={() => setIsResetPasswordOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>
            </>
          )}
          {canEdit && (
            <button
              onClick={() => router.push(`/teachers/${teacher._id}/edit`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* LEFT SIDEBAR (30%) */}
        <div className="w-full xl:w-[300px] flex-shrink-0 space-y-6">

          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow text-left relative overflow-hidden">
            <div className="flex items-center gap-4">
              <img src={teacher.photo_url || "/asset 7.webp"} className="w-[60px] h-[60px] rounded-xl object-cover border border-slate-200 dark:border-slate-800" alt="Avatar" />
              <div>
                <h2 className="text-[16px] leading-[19.2px] font-medium text-foreground dark:text-slate-100">{teacher.name}</h2>
                <p className="text-[12px] text-primary font-bold mt-0.5">{teacher.employee_id || "No ID"}</p>
                <p className="text-[11px] text-[#68718a] font-medium mt-1">Joined : {formatDate(teacher.join_date)}</p>
              </div>
            </div>
          </div>

          {/* Basic Information (Dynamic Assigned Details) */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow text-left">
            <div className="p-4 text-[12px]">
              <h3 className="text-[14px] leading-[19.2px] font-medium text-slate-800 dark:text-slate-100 mb-3.5">Basic Information</h3>
              <div className="space-y-3.5">
                <InfoRow label="Department" value={teacher.department || "Academic"} />
                <InfoRow label="Designation" value={teacher.designation || "Teacher"} />
                <InfoRow label="Class Teacher Of" value={getClassName(teacher.classId || teacher.class_id || "")} />
                <InfoRow label="Assigned Classes" value={assignedClasses.join(", ") || "None"} />
                <InfoRow label="Assigned Subjects" value={assignedSubjects.join(", ") || "None"} />
                <InfoRow label="Current Workload" value={`${currentWorkload} periods/week`} />
                <InfoRow label="Gender" value={teacher.gender ? teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1) : "Not Specified"} />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow text-left">
            <div className="p-4 space-y-4">
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-2">Contact Information</h3>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-800/50 flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Phone Number</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{teacher.phone || "Not Specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-800/50 flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Email Address</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{teacher.email || "Not Specified"}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT MAIN CONTENT (70%) */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Top Tabs Header */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-t-xl overflow-x-auto custom-scrollbar flex items-center gap-1 px-1.5 pt-1.5">
            <TabItem icon={<User className="w-3.5 h-3.5" />} label="Teacher Details" active={activeMainTab === "Teacher Details"} onClick={() => setActiveMainTab("Teacher Details")} />
            <TabItem icon={<Calendar className="w-3.5 h-3.5" />} label="Routine" active={activeMainTab === "Routine"} onClick={() => setActiveMainTab("Routine")} />
            <TabItem icon={<Clock className="w-3.5 h-3.5" />} label="Leave & Attendance" active={activeMainTab === "Leave & Attendance"} onClick={() => setActiveMainTab("Leave & Attendance")} />
            <TabItem icon={<FileText className="w-3.5 h-3.5" />} label="Salary" active={activeMainTab === "Salary"} onClick={() => setActiveMainTab("Salary")} />
          </div>

          {/* 1. Teacher Details Tab Content */}
          {activeMainTab === "Teacher Details" && (
            <div className="space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
              {/* Profile Details */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Profile Details</h3>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">Teacher Name</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{teacher.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">Employee ID</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{teacher.employee_id || "No ID"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">DOB</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{formatDate(teacher.dob)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">Qualification</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{teacher.qualification || "Not Specified"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">Experience</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{teacher.experience_years} Years</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">Joining Date</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{formatDate(teacher.join_date)}</p>
                  </div>
                </div>
              </div>

              {/* Documents and Address Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Documents */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Documents</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {teacher.resume_url ? (
                      <DocRow title={teacher.resume_url.split("/").pop() || "Resume.pdf"} url={teacher.resume_url} />
                    ) : (
                      <div className="text-[12px] text-slate-400 italic py-1">No Resume Uploaded</div>
                    )}
                    {teacher.joining_letter_url ? (
                      <DocRow title={teacher.joining_letter_url.split("/").pop() || "Joining Letter.pdf"} url={teacher.joining_letter_url} />
                    ) : (
                      <div className="text-[12px] text-slate-400 italic py-1">No Joining Letter Uploaded</div>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Address</h3>
                  </div>
                  <div className="p-5 space-y-5">
                    <div>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white mb-1">Address</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{teacher.address || "Not Specified"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Routine Content */}
          {activeMainTab === "Routine" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow p-5 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[14px] font-bold text-slate-900 dark:text-white">Time Table</h2>
                <div className="px-3 py-1.5 border border-border rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>This Year</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              {schedulesLoading ? (
                <div className="p-10 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Loading schedules...</span>
                </div>
              ) : schedules.length === 0 ? (
                <div className="p-10 text-center text-slate-400">No schedules assigned to this teacher.</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar pb-6">
                  <div className="min-w-full sm:w-[900px]">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
                        <div key={day} className="text-[13px] font-bold text-slate-900 dark:text-white pb-2">{day}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
                      {timeTableData.map((col, idx) => (
                        <div key={idx} className="flex flex-col gap-4">
                          {col.map((slot, sIdx) => (
                            <div key={sIdx} className="bg-white dark:bg-slate-900 border border-[#FFE2E6] rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                              {slot.room && (
                                <span className="inline-block px-1.5 py-0.5 bg-[#FFF0F2] text-[#E02424] text-[10px] font-bold rounded mb-2">Room: {slot.room}</span>
                              )}
                              <div className="space-y-1.5">
                                <p className="text-[12px] font-bold text-slate-900 dark:text-white">Class : <span className="font-medium text-slate-500 dark:text-slate-400">{slot.class}</span></p>
                                <p className="text-[12px] font-bold text-slate-900 dark:text-white">Subject : <span className="font-medium text-slate-500 dark:text-slate-400">{slot.subject}</span></p>
                              </div>
                              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                {slot.time}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Leave & Attendance Content */}
          {activeMainTab === "Leave & Attendance" && (
            <div className="space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setAttendanceSubTab("Leaves")}
                  className={`px-6 py-2.5 text-[13px] font-bold transition-all rounded-t-lg
                    ${attendanceSubTab === "Leaves" ? "bg-primary text-white" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-b-0 border-border"}
                  `}
                >
                  Leaves
                </button>
                <button
                  onClick={() => setAttendanceSubTab("Attendance")}
                  className={`px-6 py-2.5 text-[13px] font-bold transition-all rounded-t-lg ml-2
                    ${attendanceSubTab === "Attendance" ? "bg-primary text-white" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-b-0 border-border"}
                  `}
                >
                  Attendance
                </button>
              </div>

              {attendanceSubTab === "Leaves" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow text-left">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white mb-2">Medical Leave ({medicalTotal})</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">Used : {medicalUsed} <span className="ml-2">Available : {medicalTotal - medicalUsed}</span></p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow text-left">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white mb-2">Casual Leave ({casualTotal})</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">Used : {casualUsed} <span className="ml-2">Available : {casualTotal - casualUsed}</span></p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow text-left">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white mb-2">Emergency Leave ({emergencyTotal})</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">Used : {emergencyUsed} <span className="ml-2">Available : {emergencyTotal - emergencyUsed}</span></p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow text-left">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white mb-2">Other Leave ({otherTotal})</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">Used : {otherUsed} <span className="ml-2">Available : {otherTotal - otherUsed}</span></p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Leaves Request History</h3>
                      <button
                        onClick={() => setIsApplyLeaveOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Apply Leave
                      </button>
                    </div>

                    {leavesLoading ? (
                      <div className="p-10 flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Loading leaves request...</span>
                      </div>
                    ) : leaveRequests.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 font-medium">No leave request records found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[12px]">
                          <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] text-slate-700 dark:text-slate-200 border-b border-border">
                            <tr>
                              <th className="px-5 py-3 font-semibold">Leave Type</th>
                              <th className="px-5 py-3 font-semibold">Leave Date</th>
                              <th className="px-5 py-3 font-semibold">No of Days</th>
                              <th className="px-5 py-3 font-semibold">Applied On</th>
                              <th className="px-5 py-3 font-semibold">Reason</th>
                              <th className="px-5 py-3 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-slate-600 dark:text-slate-350">
                            {leaveRequests.map((l) => (
                              <tr key={l._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                <td className="px-5 py-3 font-bold capitalize">{l.leave_type} Leave</td>
                                <td className="px-5 py-3 font-medium">{formatDate(l.from_date)} - {formatDate(l.to_date)}</td>
                                <td className="px-5 py-3 font-bold">{l.total_days || 0} Days</td>
                                <td className="px-5 py-3">{formatDate(l.createdAt)}</td>
                                <td className="px-5 py-3">{l.reason}</td>
                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold
                                    ${l.status === "approved" ? "bg-success/10 text-success" : ""}
                                    ${l.status === "pending" ? "bg-[#FFF8E6] text-primary" : ""}
                                    ${l.status === "rejected" ? "bg-[#FFEBEB] text-[#E02424]" : ""}
                                  `}>
                                    {l.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {attendanceSubTab === "Attendance" && (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Attendance Detail</h2>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[12px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 shadow-sm outline-none cursor-pointer"
                    >
                      <option value="2026-2027">Year : 2026 / 2027</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-success/10 text-success flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Total Present</p>
                        <p className="text-[18px] font-bold text-slate-900 dark:text-white">{attendanceSummary.present}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#FFEBEB] text-[#E02424] flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Total Absent</p>
                        <p className="text-[18px] font-bold text-slate-900 dark:text-white">{attendanceSummary.absent}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800/50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Half Day</p>
                        <p className="text-[18px] font-bold text-slate-900 dark:text-white">{attendanceSummary.half_day}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#FFF8E6] text-primary flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Total Late</p>
                        <p className="text-[18px] font-bold text-slate-900 dark:text-white">{attendanceSummary.late}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden p-5 space-y-5">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Attendance Matrix Grid</h3>

                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-success/10 text-success border border-[#1D7F2C]/20 text-[11px] font-bold">
                        <CheckCircle className="w-3.5 h-3.5" /> Present
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#FFEBEB] text-[#E02424] border border-[#E02424]/20 text-[11px] font-bold">
                        <X className="w-3.5 h-3.5" /> Absent
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#FFF8E6] text-primary border border-primary/20 text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5" /> Late
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 text-[11px] font-bold">
                        <Calendar className="w-3.5 h-3.5" /> Halfday
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#E6F4FE] text-[#3B82F6] border border-[#3B82F6]/20 text-[11px] font-bold">
                        <Calendar className="w-3.5 h-3.5" /> Holiday
                      </div>
                    </div>

                    {attendanceLoading ? (
                      <div className="p-10 flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Loading matrix details...</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-[12px] min-w-full sm:w-[800px]">
                          <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] text-slate-700 dark:text-slate-200 border-y border-border">
                            <tr>
                              <th className="px-4 py-3 font-semibold whitespace-nowrap">Day | Month</th>
                              {monthsList.map(m => (
                                <th key={m.name} className="px-3 py-3 font-semibold text-center">{m.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-slate-600 dark:text-slate-300 font-medium">
                            {matrixRows.map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3">{row.day}</td>
                                {row.statuses.map((s, idx) => (
                                  <td key={idx} className="px-3 py-3 text-center">
                                    {s === "P" && <span className="inline-block w-2.5 h-4 rounded-[4px] bg-success" />}
                                    {s === "A" && <span className="inline-block w-2.5 h-4 rounded-[4px] bg-[#E02424]" />}
                                    {s === "L" && <span className="inline-block w-2.5 h-4 rounded-[4px] bg-primary" />}
                                    {s === "HD" && <span className="inline-block w-2.5 h-4 rounded-[4px] bg-slate-400 dark:bg-slate-600" />}
                                    {s === "H" && <span className="inline-block w-2.5 h-4 rounded-[4px] bg-[#3B82F6]" />}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Salary Content */}
          {activeMainTab === "Salary" && (
            <div className="space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
              {!teacher.basic_salary ? (
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-8 card-shadow text-center text-slate-400 font-semibold">
                  No salary structure or records configured for this teacher.
                </div>
              ) : (() => {
                const basic = teacher.basic_salary || 0;
                const allowances = Math.round(basic * 0.10);
                const deductions = Math.round(basic * 0.05);
                const net = basic + allowances - deductions;

                const months = ["May", "Apr", "Mar", "Feb", "Jan", "Dec"];
                const years = [2026, 2026, 2026, 2026, 2026, 2025];
                const history = months.map((m, idx) => {
                  const payDate = `05 ${m} ${years[idx]}`;
                  return {
                    id: String(8200 - idx),
                    month: `${m} - ${years[idx]}`,
                    date: payDate,
                    method: idx % 3 === 0 ? "Cheque" : "Bank Transfer",
                    salary: `₹${net.toLocaleString()}`
                  };
                });

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1">Net Salary (Monthly)</p>
                          <p className="text-[20px] font-bold text-slate-900 dark:text-white">₹{net.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#E8F8E8] flex items-center justify-center border border-[#1D7F2C]/20">
                          <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1">Gross Salary (Monthly)</p>
                          <p className="text-[20px] font-bold text-slate-900 dark:text-white">₹{(basic + allowances).toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1">Deduction (Monthly)</p>
                          <p className="text-[20px] font-bold text-slate-900 dark:text-white">₹{deductions.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                          <Download className="w-5 h-5 text-rose-500" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow text-left h-fit space-y-4">
                        <h3 className="text-[14px] font-bold text-slate-900 dark:text-white border-b border-border pb-2">Salary Structure</h3>
                        <div className="space-y-3 text-[13px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Basic Salary</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{basic.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Allowances (HRA/TA)</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{allowances.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Deductions (EPF/Tax)</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{deductions.toLocaleString()}</span>
                          </div>
                          <div className="h-px bg-border" />
                          <div className="flex justify-between text-[14px]">
                            <span className="font-bold text-slate-800 dark:text-slate-100">Net Salary</span>
                            <span className="font-extrabold text-primary">₹{net.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden lg:col-span-2">
                        <div className="p-4 border-b border-border">
                          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Monthly Salary Records</h3>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[12px]">
                            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] text-slate-700 dark:text-slate-200 border-b border-border">
                              <tr>
                                <th className="px-5 py-3 font-semibold">ID</th>
                                <th className="px-5 py-3 font-semibold">Salary For</th>
                                <th className="px-5 py-3 font-semibold">Payment Date</th>
                                <th className="px-5 py-3 font-semibold">Method</th>
                                <th className="px-5 py-3 font-semibold">Net Salary</th>
                                <th className="px-5 py-3 font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-slate-600 dark:text-slate-300 font-medium">
                              {history.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-5 py-3 text-primary font-bold">#{s.id}</td>
                                  <td className="px-5 py-3">{s.month}</td>
                                  <td className="px-5 py-3">{s.date}</td>
                                  <td className="px-5 py-3">{s.method}</td>
                                  <td className="px-5 py-3 font-bold text-slate-950 dark:text-white">{s.salary}</td>
                                  <td className="px-5 py-3">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                      Paid
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

        </div>
      </div>

      <Modal isOpen={isApplyLeaveOpen} onClose={() => setIsApplyLeaveOpen(false)} title="Apply Leave">
        <form onSubmit={handleApplyLeaveSubmit} className="space-y-4 text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-foreground dark:text-slate-100">Leave Type</label>
            <div className="relative">
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-colors appearance-none bg-white dark:bg-slate-900"
                required
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="emergency">Emergency Leave</option>
                <option value="other">Other Leave</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-foreground dark:text-slate-100">Leave From date</label>
            <input
              type="date"
              value={leaveFromDate}
              onChange={(e) => setLeaveFromDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 focus:border-primary/50 transition-colors"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-foreground dark:text-slate-100">Leave to Date</label>
            <input
              type="date"
              value={leaveToDate}
              onChange={(e) => setLeaveToDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 focus:border-primary/50 transition-colors"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-foreground dark:text-slate-100">No of Days</label>
            <input
              type="text"
              value={leaveDaysNum}
              readOnly
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-not-allowed dark:text-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-foreground dark:text-slate-100">Reason</label>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 focus:border-primary/50 transition-colors min-h-[60px]"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsApplyLeaveOpen(false)}
              className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 text-foreground dark:text-slate-100 text-[13px] font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingLeave}
              className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingLeave && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Apply Leave</span>
            </button>
          </div>
        </form>
      </Modal>

      <LoginDetailsModal
        isOpen={isLoginDetailsOpen}
        onClose={() => setIsLoginDetailsOpen(false)}
        teacher={teacher}
        target="teacher"
      />

      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        userId={teacherUserId}
        userName={teacher?.name || ""}
        userEmail={(teacher?.user_id && typeof teacher.user_id === "object" && teacher.user_id.email) ? teacher.user_id.email : (teacher?.email || "")}
        onSuccess={() => getTeacher(teacherId).then(t => { if (t) setTeacher(t); })}
      />

      {/* Generate Document Wizard */}
      <GenerateDocumentWizard
        open={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        defaultModule="teacher"
        defaultReferenceId={teacher._id}
        defaultReferenceLabel={teacher.name}
      />

    </div>
  );
}
