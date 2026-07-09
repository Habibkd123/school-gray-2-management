"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useStudents, ApiStudent } from "../../../hooks/useStudents";
import { useClasses } from "../../../hooks/useClasses";
import { Loader2 } from "lucide-react";
import {
  User, Phone, Mail, FileText, Calendar, Droplet, Users, BookOpen, Clock, Settings, Building2, MapPin, Bus, Lock, Edit, ChevronDown, CheckCircle, RefreshCcw, Check, X, Download, Paperclip, Plus, Trash2
} from "lucide-react";
import { useLeave } from "../../../hooks/useLeave";
import { useSchedules } from "../../../hooks/useSchedules";
import { useAttendanceSummary } from "../../../hooks/useAttendanceSummary";
import { useFeeAllocations, useFeePayments, useFeeMasters } from "../../../hooks/useFees";
import { useExams, useResults } from "../../../hooks/useExams";
import { useSubjects } from "../../../hooks/useSubjects";
import { getAuthHeaders } from "@/lib/utils/session";
import { LoginDetailsModal } from "@/app/components/modals/LoginDetailsModal";
import { ResetPasswordModal } from "@/app/components/modals/ResetPasswordModal";
import { GenerateDocumentWizard } from "@/app/components/document-builder/GenerateDocumentWizard";

function StudentViewContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = params.id as string;
  const { getStudent } = useStudents({ skip: true });
  const { classes } = useClasses();

  const [student, setStudent] = useState<ApiStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [bottomTab, setBottomTab] = useState<"Hostel" | "Transportation">("Hostel");

  // Tab states
  const initialTab = searchParams.get("tab") || "Student Details";
  const [activeMainTab, setActiveMainTab] = useState<string>(initialTab);
  const [attendanceSubTab, setAttendanceSubTab] = useState<"Leaves" | "Attendance">("Leaves");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalTarget, setLoginModalTarget] = useState<"student" | "parent">("student");
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [resetPassTarget, setResetPassTarget] = useState<{ userId: string | undefined; name: string; email: string } | null>(null);
  const [isFeesModalOpen, setIsFeesModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  // Dynamic hooks integration
  const studentClassId = student ? (typeof student.class_id === "object" ? student.class_id?._id : student.class_id) : undefined;
  const { schedules, isLoading: schedulesLoading } = useSchedules(studentClassId);

  const studentUserId = student ? (typeof student.user_id === "object" ? student.user_id?._id : student.user_id) : undefined;
  const { leaveRequests, submitLeave, loading: leavesLoading } = useLeave(undefined, studentUserId);

  const { fetchSummary, fetchDetail } = useAttendanceSummary();

  const { allocations, loading: allocationsLoading } = useFeeAllocations(studentId);
  const { payments, loading: paymentsLoading } = useFeePayments(studentId);
  const { masters, loading: mastersLoading } = useFeeMasters();

  const { exams, loading: examsLoading } = useExams(studentClassId);
  const { results, loading: resultsLoading, fetchResults } = useResults(undefined, studentId);
  const { subjects } = useSubjects(studentClassId);

  // Custom states
  const [siblings, setSiblings] = useState<ApiStudent[]>([]);
  const [selectedYear, setSelectedYear] = useState("2026-2027");
  const [selectedExamYear, setSelectedExamYear] = useState("2026 / 2027");
  const [selectedFeesYear, setSelectedFeesYear] = useState("2026 / 2027");

  // Editable/Manipulatable Marks states
  const [editingResult, setEditingResult] = useState<any | null>(null);
  const [editMarksObtained, setEditMarksObtained] = useState("");
  const [editTotalMarks, setEditTotalMarks] = useState("100");
  const [editPassingMarks, setEditPassingMarks] = useState("33");
  const [editRemarks, setEditRemarks] = useState("");

  // Add Result states
  const [isAddResultOpen, setIsAddResultOpen] = useState(false);
  const [addExamId, setAddExamId] = useState("");
  const [addSubjectId, setAddSubjectId] = useState("");
  const [addMarksObtained, setAddMarksObtained] = useState("");
  const [addTotalMarks, setAddTotalMarks] = useState("100");
  const [addPassingMarks, setAddPassingMarks] = useState("33");
  const [addRemarks, setAddRemarks] = useState("");

  const handleOpenEditModal = (res: any) => {
    setEditingResult(res);
    setEditMarksObtained((res.obtained_marks ?? res.marks_obtained ?? 0).toString());
    setEditTotalMarks((res.total_marks || 100).toString());
    setEditPassingMarks((res.passing_marks || 33).toString());
    setEditRemarks(res.remarks || "");
  };

  const handleSaveEditedMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          exam_id: typeof editingResult.exam_id === "object" ? editingResult.exam_id._id : editingResult.exam_id,
          student_id: typeof editingResult.student_id === "object" ? editingResult.student_id._id : editingResult.student_id,
          subject_id: typeof editingResult.subject_id === "object" ? editingResult.subject_id._id : editingResult.subject_id,
          marks_obtained: Number(editMarksObtained),
          total_marks: Number(editTotalMarks),
          passing_marks: Number(editPassingMarks),
          remarks: editRemarks
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingResult(null);
        fetchResults();
      } else {
        alert(data.message || "Failed to update results");
      }
    } catch (e) {
      console.error(e);
      alert("Network error updating marks");
    }
  };

  const handleSaveNewResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addExamId || !addSubjectId || !addMarksObtained || !addTotalMarks) {
      alert("Please fill all required fields");
      return;
    }
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          exam_id: addExamId,
          student_id: studentId,
          subject_id: addSubjectId,
          marks_obtained: Number(addMarksObtained),
          total_marks: Number(addTotalMarks),
          passing_marks: addPassingMarks ? Number(addPassingMarks) : undefined,
          remarks: addRemarks
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddResultOpen(false);
        setAddExamId("");
        setAddSubjectId("");
        setAddMarksObtained("");
        setAddTotalMarks("100");
        setAddPassingMarks("33");
        setAddRemarks("");
        fetchResults();
      } else {
        alert(data.message || "Failed to add result");
      }
    } catch (e) {
      console.error(e);
      alert("Network error saving result");
    }
  };

  const handleDeleteResult = async (resToDelete: any) => {
    if (!confirm("Are you sure you want to delete this result?")) return;
    try {
      const resId = resToDelete._id;
      const res = await fetch(`/api/results?id=${resId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        fetchResults();
      } else {
        alert(data.message || "Failed to delete result");
      }
    } catch (e) {
      console.error(e);
      alert("Network error deleting result");
    }
  };
  const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, late: 0, holiday: 0, half_day: 0 });
  const [dailyAttendance, setDailyAttendance] = useState<Array<{ date: string; status: string; note?: string }>>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Apply Leave form states
  const [leaveType, setLeaveType] = useState("casual");
  const [leaveFromDate, setLeaveFromDate] = useState("");
  const [leaveToDate, setLeaveToDate] = useState("");
  const [leaveDaysChoice, setLeaveDaysChoice] = useState("Full Day");
  const [leaveDaysNum, setLeaveDaysNum] = useState("1");
  const [leaveReason, setLeaveReason] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Leave search (must be here — before early return to respect Rules of Hooks)
  const [leaveSearch, setLeaveSearch] = useState("");

  useEffect(() => {
    if (!studentId) return;
    getStudent(studentId).then(s => {
      setStudent(s);
      setLoading(false);
    });
  }, [studentId]);

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

  // Fetch Siblings Effect
  useEffect(() => {
    if (!student?.parent_id) return;
    const parentId = typeof student.parent_id === "object" ? student.parent_id._id : student.parent_id;

    fetch(`/api/students?parent_id=${parentId}`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const sibs = data.data.students.filter((s: ApiStudent) => s._id !== student._id);
          setSiblings(sibs);
        }
      })
      .catch(err => console.error("Error fetching siblings:", err));
  }, [student]);

  // Fetch Attendance Details Effect
  useEffect(() => {
    if (!studentClassId || !student) return;

    const loadAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const [startYr, endYr] = selectedYear.split("-");
        const start = `${startYr}-06-01`;
        const end = `${endYr}-05-31`;

        // Fetch summary
        const summary = await fetchSummary(start, end, "student", studentClassId);
        if (summary && summary[student._id]) {
          setAttendanceSummary(summary[student._id]);
        } else {
          setAttendanceSummary({ present: 0, absent: 0, late: 0, holiday: 0, half_day: 0 });
        }

        // Fetch daily detail list
        const details = await fetchDetail(start, end, "student", student._id);
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
  }, [student, selectedYear, studentClassId, fetchSummary, fetchDetail]);

  // ─── All useMemo hooks BEFORE early returns (Rules of Hooks) ─────

  // Group results by exam
  const examResultsGrouped = React.useMemo(() => {
    const groups: Record<string, { examName: string; examId: string; results: any[] }> = {};
    const targetYear = selectedExamYear.replace(/\s+/g, ""); // e.g. "2024/2025" or "2024-2025"

    results.forEach(res => {
      const eId = typeof res.exam_id === 'object' ? res.exam_id?._id : res.exam_id;
      if (!eId) return;

      const matchingExam = exams.find(ex => ex._id === eId);
      const examYear = matchingExam?.academic_year || (res.exam_id && typeof res.exam_id === 'object' ? res.exam_id.academic_year : "");

      if (examYear) {
        const normExamYear = examYear.replace(/\s+/g, "").replace(/\//g, "-");
        const normTargetYear = targetYear.replace(/\//g, "-");
        if (normExamYear !== normTargetYear) {
          return;
        }
      }

      const eName = typeof res.exam_id === 'object' ? (res.exam_id?.title || res.exam_id?.name) : undefined;
      if (!groups[eId]) {
        groups[eId] = {
          examId: eId,
          examName: eName || matchingExam?.title || matchingExam?.name || "Exam",
          results: []
        };
      }
      groups[eId].results.push(res);
    });
    return Object.values(groups);
  }, [results, exams, selectedExamYear]);

  // Dynamic grouped schedules
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dynamicTimeTableData = React.useMemo(() => {
    const styles = [
      { bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-100 dark:border-rose-900/30", text: "text-rose-600 dark:text-rose-400" },
      { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-100 dark:border-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
      { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-100 dark:border-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
      { bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-100 dark:border-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
      { bg: "bg-teal-50 dark:bg-teal-950/20", border: "border-teal-100 dark:border-teal-900/30", text: "text-teal-600 dark:text-teal-400" },
      { bg: "bg-slate-50 dark:bg-slate-800/50", border: "border-slate-200 dark:border-slate-800", text: "text-slate-700 dark:text-slate-200" }
    ];
    return daysOfWeek.map((day) => {
      const daySchedules = schedules.filter(s => s.day?.toLowerCase() === day);
      return daySchedules.map((slot, index) => {
        const style = styles[index % styles.length];
        const subject = typeof slot.subject_id === "object" ? slot.subject_id?.name : slot.subject_id;
        const teacher = typeof slot.teacher_id === "object" ? slot.teacher_id?.name : "Unknown Teacher";
        return {
          time: `${slot.start_time} - ${slot.end_time}`,
          subject: subject || "No Subject",
          teacher: teacher,
          room: slot.room,
          ...style
        };
      });
    });
  }, [schedules]);

  // Leave limits & usage calculations
  const medicalUsed = leaveRequests
    .filter(r => r.status === "approved" && r.leave_type === "sick")
    .reduce((sum, r) => sum + (r.total_days || 1), 0);
  const casualUsed = leaveRequests
    .filter(r => r.status === "approved" && r.leave_type === "casual")
    .reduce((sum, r) => sum + (r.total_days || 1), 0);
  const emergencyUsed = leaveRequests
    .filter(r => r.status === "approved" && r.leave_type === "emergency")
    .reduce((sum, r) => sum + (r.total_days || 1), 0);
  const otherUsed = leaveRequests
    .filter(r => r.status === "approved" && r.leave_type === "other")
    .reduce((sum, r) => sum + (r.total_days || 1), 0);

  const filteredLeaveRequests = React.useMemo(() => {
    return leaveRequests.filter(r => {
      const type = r.leave_type?.toLowerCase() || "";
      const reason = r.reason?.toLowerCase() || "";
      const search = leaveSearch.toLowerCase();
      return type.includes(search) || reason.includes(search);
    });
  }, [leaveRequests, leaveSearch]);

  // Attendance map
  const MONTH_MAP: Record<string, number> = {
    "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11,
    "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4
  };
  const attendanceMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    dailyAttendance.forEach(att => {
      try {
        const d = new Date(att.date);
        const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        map[formatted] = att.status;
      } catch (e) { }
    });
    return map;
  }, [dailyAttendance]);

  // Fee helpers (depend on allocations/payments/masters state, not hooks — safe after early return)
  const studentGroupIds = allocations.map(a => typeof a.fee_group_id === 'object' ? a.fee_group_id?._id : a.fee_group_id);
  const studentFeeMasters = masters.filter(m => {
    const groupId = typeof m.fee_group_id === 'object' ? m.fee_group_id?._id : m.fee_group_id;
    return studentGroupIds.includes(groupId);
  });
  const getAmountPaid = (masterId: string) =>
    payments
      .filter(p => (typeof p.fee_master_id === 'object' ? p.fee_master_id?._id : p.fee_master_id) === masterId)
      .reduce((sum, p) => sum + p.amount_paid, 0);
  const getPaymentRecord = (masterId: string) =>
    payments.find(p => (typeof p.fee_master_id === 'object' ? p.fee_master_id?._id : p.fee_master_id) === masterId);
  const totalFeesAmount = studentFeeMasters.reduce((sum, m) => sum + m.amount, 0);
  const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalPendingDues = Math.max(0, totalFeesAmount - totalPaidAmount);

  const getAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F1F5F9&color=5D6BEE&bold=true`;
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

  const filteredExamsForAdd = React.useMemo(() => {
    return exams.filter(ex => {
      const examYear = ex.academic_year || "2026 / 2027";
      const normExamYear = examYear.replace(/\s+/g, "").replace(/\//g, "-");
      const normSelected = selectedExamYear.replace(/\s+/g, "").replace(/\//g, "-");
      return normExamYear === normSelected;
    });
  }, [exams, selectedExamYear]);

  if (loading) return <div className="p-10 flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span>Loading student...</span></div>;
  if (!student) return <div className="p-10 text-slate-500 dark:text-slate-400">Student not found.</div>;

  // Apply Leave Handler
  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentUserId) {
      alert("Student user profile not found. Cannot apply leave.");
      return;
    }
    if (!leaveFromDate || !leaveToDate) {
      alert("Please select both start and end dates.");
      return;
    }
    setIsSubmittingLeave(true);
    try {
      const res = await submitLeave({
        user_id: studentUserId,
        leave_type: leaveType as any,
        from_date: leaveFromDate,
        to_date: leaveToDate,
        reason: leaveReason
      });
      if (res.success) {
        setIsLeaveModalOpen(false);
        setLeaveFromDate("");
        setLeaveToDate("");
        setLeaveReason("");
      } else {
        alert(res.message || "Failed to apply leave");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while applying leave.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[20px] leading-[24px] font-semibold text-foreground dark:text-slate-100">Student Details</h1>
          <div className="flex items-center gap-2 text-[14px] leading-[21px] text-[#68718a] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/students" className="hover:text-primary">Student</Link>
            <span>/</span>
            <span className="text-foreground dark:text-slate-100 font-normal">Student Details</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setLoginModalTarget("student"); setIsLoginModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Login Details</span>
          </button>
          <button
            onClick={() => {
              const studentUser = student?.user_id;
              const sUid = studentUser && typeof studentUser === "object" ? studentUser._id : undefined;
              const sEmail = studentUser && typeof studentUser === "object" ? studentUser.email : student.email || "";
              setResetPassTarget({ userId: sUid, name: student.name, email: sEmail });
              setIsResetPassModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            style={{ background: "linear-gradient(90deg, #4338ca, #7c3aed)" }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Document</span>
          </button>
          <button
            onClick={() => router.push(`/students/add?edit=${student._id}`)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Student</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* LEFT SIDEBAR (30%) */}
        <div className="w-full xl:w-[300px] flex-shrink-0 space-y-6">

          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow text-left relative overflow-hidden">
            <div className="flex items-center gap-4">
              <img src={student.photo_url || getAvatar(student.name)} className="w-full sm:w-[60px] h-[60px] rounded-xl object-cover border border-slate-200 dark:border-slate-800" alt="Avatar" />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-success/10 text-success mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Active
                </div>
                <h2 className="text-[16px] leading-[19.2px] font-medium text-foreground dark:text-slate-100">{student.name}</h2>
                <p className="text-[12px] text-slate-500 font-medium mt-0.5 dark:text-slate-400">{getClassName(student.class_id)}</p>
                <p className="text-[12px] text-primary font-bold mt-0.5">{student.admission_no || "No Admission No"}</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow text-left">
            <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[16px] leading-[19.2px] font-medium text-foreground dark:text-slate-100">Basic Information</h3>
            </div>
            <div className="p-4 text-[12px]">
              <div className="space-y-3.5">
                <InfoRow label="Class & Section" value={getClassName(student.class_id)} />
                <InfoRow label="Roll No" value={student.roll_no || "—"} />
                <InfoRow label="Gender" value={student.gender || "—"} />
                <InfoRow label="Date Of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : "—"} />
                <InfoRow label="Blood Group" value={student.blood_group || "—"} />
                <InfoRow label="Religion" value={student.religion || "—"} />
                <InfoRow label="Caste" value={student.caste || "—"} />
                <InfoRow label="Category" value={student.category || "—"} />
                <InfoRow label="Mother tongue" value={student.mother_tongue || "—"} />
                <div className="flex justify-between py-1">
                  <span className="text-[14px] leading-[21px] font-medium text-foreground dark:text-slate-100">Language</span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {student.languages && student.languages.length > 0 ? (
                      student.languages.map((lang, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-700 dark:text-slate-200">{lang}</span>
                      ))
                    ) : (
                      <span className="text-slate-400 font-medium">—</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsFeesModalOpen(true)} className="hidden w-full mt-5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors">
                Add Fees
              </button>
            </div>
          </div>

          {/* Primary Contact Info */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow text-left">
            <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">Primary Contact Info</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-800/50 flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Phone Number</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{student.phone || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-800/50 flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Email Address</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{student.email || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sibling Information */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow text-left">
            <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">Sibling Information</h3>
            </div>
            <div className="p-4 space-y-3.5">
              {siblings.length === 0 ? (
                <p className="text-[12px] text-slate-400 font-medium">No siblings registered.</p>
              ) : (
                siblings.map((sib) => {
                  const classVal = typeof sib.class_id === "object" ? `${sib.class_id?.name}, ${sib.class_id?.section}` : getClassName(sib.class_id);
                  return (
                    <div key={sib._id} className="flex flex-wrap items-center gap-3">
                      <img src={sib.photo_url || getAvatar(sib.name)} className="w-9 h-9 rounded object-cover" alt="Sibling" />
                      <div>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">{sib.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{classVal}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Tabs (Hostel/Transport) */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow text-left">
            <div className="flex border-b border-border">
              <button
                onClick={() => setBottomTab("Hostel")}
                className={`flex-1 py-2.5 text-[12px] font-bold transition-colors ${bottomTab === "Hostel" ? "text-primary border-b-2 border-primary" : "text-slate-500 dark:text-slate-400"}`}
              >
                Hostel
              </button>
              <button
                onClick={() => setBottomTab("Transportation")}
                className={`flex-1 py-2.5 text-[12px] font-bold transition-colors ${bottomTab === "Transportation" ? "text-primary border-b-2 border-primary" : "text-slate-500 dark:text-slate-400"}`}
              >
                Transportation
              </button>
            </div>
            <div className="p-4">
              {bottomTab === "Hostel" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white">Not Assigned</p>
                    <p className="text-[11px] text-slate-400 font-medium">Room No : —</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bus className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white">Not Assigned</p>
                    <p className="text-[11px] text-slate-400 font-medium">Pickup : —</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT MAIN CONTENT (70%) */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Top Tabs Header */}
          <div className="bg-white dark:bg-slate-900 border-b border-border rounded-t-xl overflow-x-auto custom-scrollbar flex items-center gap-1 px-1.5 pt-1.5">
            <TabItem icon={<User className="w-3.5 h-3.5" />} label="Student Details" active={activeMainTab === "Student Details"} onClick={() => setActiveMainTab("Student Details")} />
            <TabItem icon={<Calendar className="w-3.5 h-3.5" />} label="Time Table" active={activeMainTab === "Time Table"} onClick={() => setActiveMainTab("Time Table")} />
            <TabItem icon={<Clock className="w-3.5 h-3.5" />} label="Leave & Attendance" active={activeMainTab === "Leave & Attendance"} onClick={() => setActiveMainTab("Leave & Attendance")} />
            <TabItem icon={<CheckCircle className="w-3.5 h-3.5" />} label="Exam & Results" active={activeMainTab === "Exam & Results"} onClick={() => setActiveMainTab("Exam & Results")} />
            <TabItem icon={<FileText className="w-3.5 h-3.5" />} label="Report Card" active={activeMainTab === "Report Card"} onClick={() => setActiveMainTab("Report Card")} />
          </div>

          {/* 1. Student Details Tab Content */}
          {activeMainTab === "Student Details" && (
            <div className="space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
              {/* Parents Information */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Parents & Guardian Information</h3>
                </div>
                <div className="p-5 space-y-6">
                  {/* Father Row */}
                  {(student.father_name || (student.parent_id && typeof student.parent_id === "object" && student.parent_id.relation?.toLowerCase() === "father")) ? (
                    <ParentRow
                      name={student.father_name || (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.name : "")}
                      role={`Father${student.father_occupation ? ` (${student.father_occupation})` : ""}`}
                      phone={student.father_phone || (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.phone : "") || "—"}
                      email={student.father_email || (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.email : "") || "—"}
                      onViewLogin={student.parent_id && typeof student.parent_id === "object" && student.parent_id.relation?.toLowerCase() === "father" ? () => {
                        setLoginModalTarget("parent");
                        setIsLoginModalOpen(true);
                      } : undefined}
                      onResetPassword={student.parent_id && typeof student.parent_id === "object" && student.parent_id.relation?.toLowerCase() === "father" ? () => {
                        const pUser = student.parent_id && typeof student.parent_id === "object" ? student.parent_id.user_id : null;
                        const pUid = pUser && typeof pUser === "object" ? pUser._id : undefined;
                        const pEmail = pUser && typeof pUser === "object" ? pUser.email : (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.email : "");
                        const pName = student.parent_id && typeof student.parent_id === "object" ? student.parent_id.name : "Parent";
                        setResetPassTarget({ userId: pUid, name: pName, email: pEmail });
                        setIsResetPassModalOpen(true);
                      } : undefined}
                    />
                  ) : null}

                  {/* Mother Row */}
                  {(student.mother_name || (student.parent_id && typeof student.parent_id === "object" && student.parent_id.relation?.toLowerCase() === "mother")) ? (
                    <ParentRow
                      name={student.mother_name || (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.name : "")}
                      role={`Mother${student.mother_occupation ? ` (${student.mother_occupation})` : ""}`}
                      phone={student.mother_phone || (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.phone : "") || "—"}
                      email={student.mother_email || (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.email : "") || "—"}
                      onViewLogin={student.parent_id && typeof student.parent_id === "object" && student.parent_id.relation?.toLowerCase() === "mother" ? () => {
                        setLoginModalTarget("parent");
                        setIsLoginModalOpen(true);
                      } : undefined}
                      onResetPassword={student.parent_id && typeof student.parent_id === "object" && student.parent_id.relation?.toLowerCase() === "mother" ? () => {
                        const pUser = student.parent_id && typeof student.parent_id === "object" ? student.parent_id.user_id : null;
                        const pUid = pUser && typeof pUser === "object" ? pUser._id : undefined;
                        const pEmail = pUser && typeof pUser === "object" ? pUser.email : (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.email : "");
                        const pName = student.parent_id && typeof student.parent_id === "object" ? student.parent_id.name : "Parent";
                        setResetPassTarget({ userId: pUid, name: pName, email: pEmail });
                        setIsResetPassModalOpen(true);
                      } : undefined}
                    />
                  ) : null}

                  {/* Guardian Row (if not father or mother, or if explicitly different) */}
                  {student.guardian_name && (student.guardian_name !== student.father_name && student.guardian_name !== student.mother_name) ? (
                    <ParentRow
                      name={student.guardian_name}
                      role={`Guardian${student.guardian_relation ? ` (${student.guardian_relation})` : ""}${student.guardian_occupation ? ` - ${student.guardian_occupation}` : ""}`}
                      phone={student.guardian_phone || "—"}
                      email={student.guardian_email || "—"}
                      onViewLogin={student.parent_id && typeof student.parent_id === "object" && student.parent_id.relation?.toLowerCase() !== "father" && student.parent_id.relation?.toLowerCase() !== "mother" ? () => {
                        setLoginModalTarget("parent");
                        setIsLoginModalOpen(true);
                      } : undefined}
                      onResetPassword={student.parent_id && typeof student.parent_id === "object" && student.parent_id.relation?.toLowerCase() !== "father" && student.parent_id.relation?.toLowerCase() !== "mother" ? () => {
                        const pUser = student.parent_id && typeof student.parent_id === "object" ? student.parent_id.user_id : null;
                        const pUid = pUser && typeof pUser === "object" ? pUser._id : undefined;
                        const pEmail = pUser && typeof pUser === "object" ? pUser.email : (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.email : "");
                        const pName = student.parent_id && typeof student.parent_id === "object" ? student.parent_id.name : "Parent";
                        setResetPassTarget({ userId: pUid, name: pName, email: pEmail });
                        setIsResetPassModalOpen(true);
                      } : undefined}
                    />
                  ) : (
                    // Default fallback if we don't have separate father/mother fields populated but we do have parent_id
                    (!student.father_name && !student.mother_name && student.parent_id && typeof student.parent_id === "object") ? (
                      <ParentRow
                        name={student.parent_id.name}
                        role={student.parent_id.relation || "Parent"}
                        phone={student.parent_id.phone || "—"}
                        email={student.parent_id.email || "—"}
                        onViewLogin={() => {
                          setLoginModalTarget("parent");
                          setIsLoginModalOpen(true);
                        }}
                        onResetPassword={() => {
                          const pUser = student.parent_id && typeof student.parent_id === "object" ? student.parent_id.user_id : null;
                          const pUid = pUser && typeof pUser === "object" ? pUser._id : undefined;
                          const pEmail = pUser && typeof pUser === "object" ? pUser.email : (student.parent_id && typeof student.parent_id === "object" ? student.parent_id.email : "");
                          const pName = student.parent_id && typeof student.parent_id === "object" ? student.parent_id.name : "Parent";
                          setResetPassTarget({ userId: pUid, name: pName, email: pEmail });
                          setIsResetPassModalOpen(true);
                        }}
                      />
                    ) : null
                  )}

                  {/* Empty fallback */}
                  {!student.father_name && !student.mother_name && !student.guardian_name && !student.parent_id && (
                    <p className="text-[12px] text-slate-400 font-medium">No parent or guardian registered.</p>
                  )}
                </div>
              </div>

              {/* Documents and Address Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Documents */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                  <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Documents</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {student.birth_cert && <DocRow title={student.birth_cert.name || "Birth Certificate"} url={student.birth_cert.url} />}
                    {student.transfer_cert && <DocRow title={student.transfer_cert.name || "Transfer Certificate"} url={student.transfer_cert.url} />}
                    {student.medical_cert && <DocRow title={student.medical_cert.name || "Medical Certificate"} url={student.medical_cert.url} />}
                    {student.migration_cert && <DocRow title={student.migration_cert.name || "Migration Certificate"} url={student.migration_cert.url} />}
                    {!student.birth_cert && !student.transfer_cert && !student.medical_cert && !student.migration_cert && (
                      <p className="text-[12px] text-slate-400 font-semibold">No uploaded documents.</p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                  <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Address</h3>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-slate-800/50">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white mb-0.5">Current Address</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{student.address || "Not Specified"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-slate-800/50">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white mb-0.5">Permanent Address</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{student.permanent_address || student.address || "Not Specified"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Previous School Details */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Previous School Details</h3>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">Previous School Name</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{student.prev_school_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">School Address</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{student.prev_school_address || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Bank Details Only Row */}
              <div className="grid grid-cols-1 gap-5">
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden h-full">
                  <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Bank Details</h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">Bank Name</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{student.bank_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">Branch</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{student.bank_branch || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">IFSC</p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{student.bank_ifsc || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. Fees Tab Content */}
          {activeMainTab === "Fees" && (
            <div className="space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Fees</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <select
                      value={selectedFeesYear}
                      onChange={(e) => setSelectedFeesYear(e.target.value)}
                      className="px-3 py-1.5 border border-border rounded-lg outline-none bg-white dark:bg-slate-900 font-bold text-xs text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm focus:border-primary/50"
                    >
                      <option value="2023 / 2024">Year : 2023 / 2024</option>
                      <option value="2024 / 2025">Year : 2024 / 2025</option>
                      <option value="2025 / 2026">Year : 2025 / 2026</option>
                      <option value="2026 / 2027">Year : 2026 / 2027</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300 font-medium">
                    <span>Row Per Page</span>
                    <select className="border border-border rounded px-2 py-1 outline-none bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200"><option>10</option></select>
                    <span>Entries</span>
                  </div>
                  <input type="text" placeholder="Search" className="px-3 py-1.5 border border-border rounded-lg text-[12px] outline-none w-full sm:w-64 focus:border-primary/50 transition-colors" />
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-[12px] min-w-full sm:w-[900px]">
                    <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] text-slate-700 dark:text-slate-200 border-b border-border font-bold">
                      <tr>
                        <th className="px-5 py-3 whitespace-nowrap">Fees Group</th>
                        <th className="px-5 py-3 whitespace-nowrap">Fees Code</th>
                        <th className="px-5 py-3 whitespace-nowrap">Due Date</th>
                        <th className="px-5 py-3 whitespace-nowrap">Amount $</th>
                        <th className="px-5 py-3 whitespace-nowrap">Status</th>
                        <th className="px-5 py-3 whitespace-nowrap">Ref ID</th>
                        <th className="px-5 py-3 whitespace-nowrap">Mode</th>
                        <th className="px-5 py-3 whitespace-nowrap">Date Paid</th>
                        <th className="px-5 py-3 whitespace-nowrap">Discount ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-slate-600 dark:text-slate-300 font-medium">
                      {/* Total Row */}
                      <tr className="bg-[var(--sidebar-bg)] text-white">
                        <td className="px-5 py-3">Total Outstanding</td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3 font-bold">${totalPendingDues}</td>
                        <td className="px-5 py-3 font-bold text-emerald-400">Paid: ${totalPaidAmount}</td>
                        <td className="px-5 py-3 font-bold text-blue-400">Total: ${totalFeesAmount}</td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                        <td className="px-5 py-3"></td>
                      </tr>
                      {studentFeeMasters.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-5 py-8 text-center text-slate-400 font-semibold">No assigned fees found.</td>
                        </tr>
                      ) : (
                        studentFeeMasters.map((m) => {
                          const groupName = typeof m.fee_group_id === "object" ? m.fee_group_id.name : "Fees";
                          const typeName = typeof m.fee_type_id === "object" ? m.fee_type_id.name : "General";
                          const paidVal = getAmountPaid(m._id);
                          const status = paidVal >= m.amount ? "Paid" : paidVal > 0 ? "Partial" : "Unpaid";
                          const paymentRecord = getPaymentRecord(m._id);

                          return (
                            <FeeRow
                              key={m._id}
                              group={groupName}
                              code={typeName}
                              due={m.due_date ? new Date(m.due_date).toLocaleDateString() : "—"}
                              amount={m.amount}
                              status={status}
                              refId={paymentRecord?.receipt_number || "—"}
                              mode={paymentRecord?.payment_method || "—"}
                              paid={paymentRecord?.transaction_date ? new Date(paymentRecord.transaction_date).toLocaleDateString() : "—"}
                              discount="—"
                            />
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. Exam & Results Tab Content */}
          {activeMainTab === "Exam & Results" && (
            <div className="space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Exams & Results</h3>
                  <div className="flex items-center gap-3">
                    {/* Add Result Button */}
                    <button
                      onClick={() => setIsAddResultOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold shadow-sm hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Result
                    </button>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <select
                        value={selectedExamYear}
                        onChange={(e) => setSelectedExamYear(e.target.value)}
                        className="px-3 py-1.5 border border-border rounded-lg outline-none bg-white dark:bg-slate-900 font-bold text-xs text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm focus:border-primary/50"
                      >
                        <option value="2023 / 2024">Year : 2023 / 2024</option>
                        <option value="2024 / 2025">Year : 2024 / 2025</option>
                        <option value="2025 / 2026">Year : 2025 / 2026</option>
                        <option value="2026 / 2027">Year : 2026 / 2027</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {resultsLoading || examsLoading ? (
                    <div className="text-center text-slate-400 font-semibold py-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">Loading exams and results...</div>
                  ) : examResultsGrouped.length === 0 ? (
                    <div className="text-center text-slate-400 font-semibold py-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">No exam results available for this student.</div>
                  ) : (
                    examResultsGrouped.map((grp, idx) => (
                      <ExamCard
                        key={grp.examId}
                        title={grp.examName}
                        initiallyExpanded={idx === 0}
                        results={grp.results}
                        onEdit={handleOpenEditModal}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Report Card Content */}
          {activeMainTab === "Report Card" && (
            <div className="space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
              {resultsLoading || examsLoading ? (
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-8 card-shadow text-center text-slate-400 font-semibold">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  Loading academic report cards...
                </div>
              ) : examResultsGrouped.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-8 card-shadow text-center text-slate-400 font-semibold">
                  No report card data found for this student.
                </div>
              ) : (
                examResultsGrouped.map((grp) => {
                  const examObj = exams.find(e => e._id === grp.examId);
                  const academicYear = examObj?.academic_year || "—";
                  const totalMaxMarks = grp.results.reduce((sum, r) => sum + (r.total_marks || 100), 0);
                  const totalObtainedMarks = grp.results.reduce((sum, r) => sum + (r.obtained_marks ?? r.marks_obtained ?? 0), 0);
                  const averagePercentage = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;
                  const isOverallPass = grp.results.every(r => r.is_pass !== false);

                  const getGrade = (pct: number) => {
                    if (pct >= 90) return "O";
                    if (pct >= 80) return "A+";
                    if (pct >= 70) return "A";
                    if (pct >= 60) return "B+";
                    if (pct >= 50) return "B";
                    if (pct >= 40) return "C+";
                    if (pct >= 35) return "C";
                    return "F";
                  };

                  return (
                    <div key={grp.examId} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                      {/* Card Header */}
                      <div className="p-5 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{grp.examName}</h3>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Academic Year: {academicYear}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold border ${isOverallPass
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOverallPass ? "bg-emerald-500" : "bg-rose-500"}`} />
                            {isOverallPass ? "Pass" : "Fail"}
                          </span>
                        </div>
                      </div>

                      {/* Subjects Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-slate-50/20 dark:bg-slate-800/20 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                              <th className="px-6 py-3.5">Subject</th>
                              <th className="px-6 py-3.5 text-center">Marks Obtained</th>
                              <th className="px-6 py-3.5 text-center">Total Marks</th>
                              <th className="px-6 py-3.5 text-center">Grade</th>
                              <th className="px-6 py-3.5 text-center">Result</th>
                              <th className="px-6 py-3.5">Teacher Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-medium">
                            {grp.results.map((r) => {
                              const subName = typeof r.subject_id === 'object' ? r.subject_id?.name : "Subject";
                              const obtained = r.obtained_marks ?? r.marks_obtained ?? 0;
                              const pct = r.total_marks > 0 ? (obtained / r.total_marks) * 100 : 0;
                              const subGrade = r.grade || getGrade(pct);
                              const pass = r.is_pass !== false;

                              return (
                                <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{subName}</td>
                                  <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">{obtained}</td>
                                  <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">{r.total_marks}</td>
                                  <td className="px-6 py-4 text-center text-indigo-600 dark:text-indigo-400 font-bold">{subGrade}</td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${pass ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                      }`}>
                                      {pass ? "Pass" : "Fail"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 italic text-[12px]">{r.remarks || "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary Section */}
                      <div className="p-5 border-t border-border bg-slate-50/30 dark:bg-slate-800/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[13px] font-bold">
                        <div className="flex flex-wrap items-center gap-6">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 mr-2 font-medium">Grand Total:</span>
                            <span className="text-slate-900 dark:text-white font-extrabold">{totalObtainedMarks} / {totalMaxMarks}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 mr-2 font-medium">Percentage:</span>
                            <span className="text-primary font-extrabold">{averagePercentage.toFixed(2)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 mr-2 font-medium">Grade:</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{getGrade(averagePercentage)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 mr-2 font-medium">Rank:</span>
                            <span className="text-slate-700 dark:text-slate-200 font-extrabold">—</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Time Table Content */}
          {activeMainTab === "Time Table" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow p-5 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[14px] font-bold text-slate-900 dark:text-white">Class Routine / Timetable</h2>
                <div className="px-3 py-1.5 border border-border rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>This Year</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              {/* Time Table Grid */}
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-full sm:w-[900px]">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
                      <div key={day} className="text-[13px] font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/50">{day}</div>
                    ))}
                  </div>

                  {schedules.length === 0 ? (
                    <div className="text-center text-slate-400 font-semibold py-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">No class routine timetable set for this class.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {dynamicTimeTableData.map((col, idx) => (
                        <div key={idx} className="flex flex-col gap-3">
                          {col.map((slot, sIdx) => (
                            <div key={sIdx} className={`p-3 rounded-lg border ${slot.bg} ${slot.border} transition-transform hover:-translate-y-1 cursor-pointer`}>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                <Clock className="w-3 h-3" />
                                {slot.time}
                              </div>
                              <p className={`text-[12px] font-bold mb-1 ${slot.text}`}>Subject : {slot.subject}</p>
                              {slot.room && <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">Room: {slot.room}</p>}
                              <div className="flex items-center gap-1.5">
                                <img src={getAvatar(slot.teacher)} className="w-5 h-5 rounded-md object-cover" alt="Teacher" />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{slot.teacher}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Breaks Section */}
                  <div className="flex items-center gap-5 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex-1 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex flex-col gap-1.5">
                      <span className="px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded self-start">Morning Break</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                        <Clock className="w-3.5 h-3.5" /> 10:30 to 10:45 AM
                      </div>
                    </div>
                    <div className="flex-1 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex flex-col gap-1.5">
                      <span className="px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded self-start">Lunch</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                        <Clock className="w-3.5 h-3.5" /> 12:15 to 01:30 PM
                      </div>
                    </div>
                    <div className="flex-1 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex flex-col gap-1.5">
                      <span className="px-2.5 py-0.5 bg-[#10B981] text-white text-[10px] font-bold rounded self-start">Evening Break</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                        <Clock className="w-3.5 h-3.5" /> 03:30 PM to 03:45 PM
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Leave & Attendance Content */}
          {activeMainTab === "Leave & Attendance" && (
            <div className="space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
              {/* Sub Tab Toggle */}
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-1 flex items-center gap-1 w-fit card-shadow">
                <button
                  onClick={() => setAttendanceSubTab("Leaves")}
                  className={`px-5 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${attendanceSubTab === "Leaves" ? "bg-primary text-white" : "text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:border-slate-800"}`}
                >
                  Leaves
                </button>
                <button
                  onClick={() => setAttendanceSubTab("Attendance")}
                  className={`px-5 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${attendanceSubTab === "Attendance" ? "bg-primary text-white" : "text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:border-slate-800"}`}
                >
                  Attendance
                </button>
              </div>

              {/* Leaves View */}
              {attendanceSubTab === "Leaves" && (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <LeaveCard title="Medical Leave (10)" used={medicalUsed} available={Math.max(0, 10 - medicalUsed)} />
                    <LeaveCard title="Casual Leave (12)" used={casualUsed} available={Math.max(0, 12 - casualUsed)} />
                    <LeaveCard title="Emergency Leave (10)" used={emergencyUsed} available={Math.max(0, 10 - emergencyUsed)} />
                    <LeaveCard title="Other Leave (5)" used={otherUsed} available={Math.max(0, 5 - otherUsed)} />
                  </div>

                  {/* Leaves Table */}
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Leaves</h3>
                      <button onClick={() => setIsLeaveModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-[12px] font-bold shadow-sm hover:bg-[var(--primary-hover)] transition-colors">
                        <Calendar className="w-3.5 h-3.5" /> Apply Leave
                      </button>
                    </div>

                    <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300 font-medium">
                        <span>Row Per Page</span>
                        <select className="border border-border rounded px-2 py-1 outline-none bg-white dark:bg-slate-900 font-bold"><option>10</option></select>
                        <span>Entries</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Search Leaves..."
                        value={leaveSearch}
                        onChange={(e) => setLeaveSearch(e.target.value)}
                        className="px-3 py-1.5 border border-border rounded-lg text-[12px] outline-none w-full sm:w-64 focus:border-primary/50 transition-colors"
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] text-slate-700 dark:text-slate-200 border-b border-border font-bold">
                          <tr>
                            <th className="px-5 py-3">Leave Type</th>
                            <th className="px-5 py-3">Leave Date</th>
                            <th className="px-5 py-3">No of Days</th>
                            <th className="px-5 py-3">Applied On</th>
                            <th className="px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-slate-600 dark:text-slate-300 font-medium">
                          {leavesLoading ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-semibold">Loading leave requests...</td>
                            </tr>
                          ) : filteredLeaveRequests.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-semibold">No leave requests found.</td>
                            </tr>
                          ) : (
                            filteredLeaveRequests.map((r) => (
                              <LeaveRow
                                key={r._id}
                                type={r.leave_type === "sick" ? "Medical Leave" : r.leave_type === "casual" ? "Casual Leave" : r.leave_type === "emergency" ? "Emergency Leave" : "Other Leave"}
                                date={`${new Date(r.from_date).toLocaleDateString()} - ${new Date(r.to_date).toLocaleDateString()}`}
                                days={r.total_days || 1}
                                applied={r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                                status={r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending"}
                              />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 flex items-center justify-end gap-2 text-[12px] font-bold border-t border-border">
                      <button className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">Prev</button>
                      <button className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center shadow-sm">1</button>
                      <button className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">Next</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance View */}
              {attendanceSubTab === "Attendance" && (
                <div className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                    <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Attendance Summary</h3>
                      <div className="flex items-center gap-3 text-[12px] text-slate-600 dark:text-slate-300 font-bold">
                        <div className="px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-200 dark:border-amber-900/30 rounded-lg text-xs">
                          Year Selection:
                        </div>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="px-3 py-1.5 border border-border rounded-lg outline-none bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm focus:border-amber-500/50"
                        >
                          <option value="2026-2027">2026 / 2027</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <AttSumCard title="Present" value={String(attendanceSummary.present)} icon={<User className="w-4 h-4 text-[#10B981]" />} iconBg="bg-[#10B981]/10" />
                      <AttSumCard title="Absent" value={String(attendanceSummary.absent)} icon={<User className="w-4 h-4 text-danger" />} iconBg="bg-danger/10" />
                      <AttSumCard title="Half Day" value={String(attendanceSummary.half_day)} icon={<User className="w-4 h-4 text-[#3B82F6]" />} iconBg="bg-[#3B82F6]/10" />
                      <AttSumCard title="Late" value={String(attendanceSummary.late)} icon={<User className="w-4 h-4 text-primary" />} iconBg="bg-primary/10" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Leave & Attendance</h3>
                    </div>

                    {/* Legend */}
                    <div className="p-4 flex items-center gap-4 flex-wrap border-b border-slate-50">
                      <LegendBadge label="Present" color="bg-[#10B981]" icon={<Check className="w-3 h-3 text-white" />} />
                      <LegendBadge label="Absent" color="bg-[#EF4444]" icon={<X className="w-3 h-3 text-white" />} />
                      <LegendBadge label="Late" color="bg-[#0EA5E9]" icon={<Clock className="w-3 h-3 text-white" />} />
                      <LegendBadge label="Halfday" color="bg-[#334155]" icon={<FileText className="w-3 h-3 text-white" />} />
                      <LegendBadge label="Holiday" color="bg-[#3B82F6]" icon={<FileText className="w-3 h-3 text-white" />} />
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-[12px] min-w-full sm:w-[800px]">
                        <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] text-slate-700 dark:text-slate-200 border-b border-border font-bold">
                          <tr>
                            <th className="px-4 py-3 whitespace-nowrap">Date | Month</th>
                            {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map(m => (
                              <th key={m} className="px-4 py-3 text-center">{m}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-slate-600 dark:text-slate-300 font-medium">
                          {attendanceLoading ? (
                            <tr>
                              <td colSpan={12} className="px-4 py-8 text-center text-slate-400 font-semibold">Loading attendance details...</td>
                            </tr>
                          ) : (
                            Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <tr key={day} className="hover:bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{day.toString().padStart(2, '0')}</td>
                                {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map(m => {
                                  const monthIndex = MONTH_MAP[m];
                                  const [startYr, endYr] = selectedYear.split("-");
                                  const year = monthIndex >= 5 ? startYr : endYr;
                                  const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                  const status = attendanceMap[dateStr];

                                  if (!status) {
                                    return <td key={m} className="px-4 py-3 text-center"></td>;
                                  }

                                  let bg = "bg-[#10B981]"; // present
                                  if (status === "absent") bg = "bg-[#EF4444]";
                                  if (status === "late") bg = "bg-[#0EA5E9]";
                                  if (status === "half_day") bg = "bg-[#334155]";
                                  if (status === "holiday") bg = "bg-[#3B82F6]";

                                  return (
                                    <td key={m} className="px-4 py-3 text-center">
                                      <div className={`w-2 h-5 rounded-full ${bg} mx-auto shadow-sm`} />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      {/* --- MODALS --- */}
      <LoginDetailsModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        student={student}
        target={loginModalTarget}
      />

      <ResetPasswordModal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        userId={resetPassTarget?.userId}
        userName={resetPassTarget?.name || ""}
        userEmail={resetPassTarget?.email || ""}
        onSuccess={() => getStudent(studentId).then(s => { if (s) setStudent(s); })}
      />

      {isFeesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Collect Fees</h2>
                <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded">{student.admission_no || "No Admission No"}</span>
              </div>
              <button onClick={() => setIsFeesModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-800/50">
                <div className="flex flex-wrap items-center gap-3">
                  <img src={student.photo_url || getAvatar(student.name)} className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-850" alt="Avatar" />
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">{student.name}</h3>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      {typeof student.class_id === 'object' ? `${student.class_id?.name}, ${student.class_id?.section}` : getClassName(student.class_id)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Total Outstanding</p>
                  <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">${totalPendingDues}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Total Paid</p>
                  <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">${totalPaidAmount}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold ${totalPendingDues === 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${totalPendingDues === 0 ? "bg-success" : "bg-danger"}`} /> {totalPendingDues === 0 ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Fees Group</label>
                  <div className="relative border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                    <select className="w-full px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 outline-none appearance-none bg-white dark:bg-slate-900 cursor-pointer">
                      <option>Select Group</option>
                      {Array.from(new Set(studentFeeMasters.map(m => typeof m.fee_group_id === 'object' ? m.fee_group_id.name : "Fees"))).map((grp, i) => (
                        <option key={i} value={grp}>{grp}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Fees Type</label>
                  <div className="relative border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                    <select className="w-full px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 outline-none appearance-none bg-white dark:bg-slate-900 cursor-pointer">
                      <option>Select Type</option>
                      {Array.from(new Set(studentFeeMasters.map(m => typeof m.fee_type_id === 'object' ? m.fee_type_id.name : "General"))).map((t, i) => (
                        <option key={i} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Amount ($)</label>
                  <input type="number" placeholder="Enter Amount" className="px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none focus:border-primary/50 transition-colors bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Collection Date</label>
                  <div className="relative border border-border rounded-lg overflow-hidden shadow-sm">
                    <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2.5 text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Payment Mode</label>
                  <div className="relative border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                    <select className="w-full px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 outline-none appearance-none bg-white dark:bg-slate-900 cursor-pointer">
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Payment Reference No</label>
                  <input type="text" placeholder="Enter Payment Reference No" className="px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none focus:border-primary/50 transition-colors bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mb-6 text-left">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Notes</label>
                <textarea rows={3} placeholder="Add Notes" className="px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none focus:border-primary/50 transition-colors resize-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button onClick={() => setIsFeesModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button onClick={() => { alert("Fee payment processing is managed via fee collection dashboards."); setIsFeesModalOpen(false); }} className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-[var(--primary-hover)] shadow-sm transition-colors">
                  Pay Fees
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingResult && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <form onSubmit={handleSaveEditedMarks} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Edit Subject Marks</h2>
              <button type="button" onClick={() => setEditingResult(null)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-left space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Subject</label>
                <input
                  type="text"
                  value={typeof editingResult.subject_id === "object" ? editingResult.subject_id.name : editingResult.subject_id || ""}
                  disabled
                  className="w-full px-3 py-2.5 border border-border bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[13px] font-medium rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Marks Obtained</label>
                  <input
                    type="number"
                    value={editMarksObtained}
                    onChange={(e) => setEditMarksObtained(e.target.value)}
                    required
                    min={0}
                    max={Number(editTotalMarks) || 9999}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Total Marks</label>
                  <input
                    type="number"
                    value={editTotalMarks}
                    onChange={(e) => setEditTotalMarks(e.target.value)}
                    required
                    min={1}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Passing Marks</label>
                  <input
                    type="number"
                    value={editPassingMarks}
                    onChange={(e) => setEditPassingMarks(e.target.value)}
                    required
                    min={0}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Remarks (Optional)</label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
                <button type="button" onClick={() => setEditingResult(null)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-[var(--primary-hover)] shadow-sm transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isAddResultOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <form onSubmit={handleSaveNewResult} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Add Exam Marks</h2>
              <button type="button" onClick={() => setIsAddResultOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-left space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Exam</label>
                <div className="relative border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <select
                    value={addExamId}
                    onChange={(e) => setAddExamId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 outline-none appearance-none bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    <option value="">Select Exam</option>
                    {filteredExamsForAdd.map(ex => (
                      <option key={ex._id} value={ex._id}>{ex.title || ex.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Subject</label>
                <div className="relative border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <select
                    value={addSubjectId}
                    onChange={(e) => setAddSubjectId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 outline-none appearance-none bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(sub => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Marks Obtained</label>
                  <input
                    type="number"
                    value={addMarksObtained}
                    onChange={(e) => setAddMarksObtained(e.target.value)}
                    required
                    min={0}
                    max={Number(addTotalMarks) || 9999}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Total Marks</label>
                  <input
                    type="number"
                    value={addTotalMarks}
                    onChange={(e) => setAddTotalMarks(e.target.value)}
                    required
                    min={1}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-900 dark:text-white">Passing Marks</label>
                  <input
                    type="number"
                    value={addPassingMarks}
                    onChange={(e) => setAddPassingMarks(e.target.value)}
                    required
                    min={0}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Remarks (Optional)</label>
                <input
                  type="text"
                  value={addRemarks}
                  onChange={(e) => setAddRemarks(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
                <button type="button" onClick={() => setIsAddResultOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-[var(--primary-hover)] shadow-sm transition-colors">
                  Add Marks
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <form onSubmit={handleApplyLeaveSubmit} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Apply Leave</h2>
              <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-left space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Leave Type</label>
                <div className="relative border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 outline-none appearance-none bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Medical Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="other">Other Leave</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Leave From date</label>
                <div className="relative border border-border rounded-lg overflow-hidden shadow-sm">
                  <input
                    type="date"
                    value={leaveFromDate}
                    onChange={(e) => setLeaveFromDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Leave to Date</label>
                <div className="relative border border-border rounded-lg overflow-hidden shadow-sm">
                  <input
                    type="date"
                    value={leaveToDate}
                    onChange={(e) => setLeaveToDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] font-medium outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Leave Days Choice</label>
                <div className="flex items-center gap-4">
                  {["Full Day", "First Half", "Second Half"].map((choice) => (
                    <label key={choice} className="flex items-center gap-2 cursor-pointer" onClick={() => setLeaveDaysChoice(choice)}>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${leaveDaysChoice === choice ? "border-primary border-4" : "border-slate-300"} bg-white dark:bg-slate-900 shadow-sm`} />
                      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{choice}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">No of Days</label>
                <input
                  type="text"
                  value={leaveDaysNum}
                  readOnly
                  className="px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none bg-slate-50 dark:bg-slate-800 cursor-not-allowed text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-900 dark:text-white">Reason</label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="px-3 py-2.5 border border-border rounded-lg text-[13px] font-medium outline-none focus:border-primary/50 transition-colors resize-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingLeave} className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-[var(--primary-hover)] shadow-sm transition-colors flex items-center gap-2">
                  {isSubmittingLeave && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Apply Leave</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Generate Document Wizard */}
      <GenerateDocumentWizard
        open={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        defaultModule="student"
        defaultStudentId={student._id}
        defaultStudentName={student.name}
        defaultReferenceLabel={student.name}
      />
    </div>
  );
}

// Subcomponents & Helpers

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-50 last:border-0">
      <span className="text-[14px] leading-[21px] font-medium text-foreground dark:text-slate-100">{label}</span>
      <span className="text-[14px] leading-[21px] font-normal text-[#6a7287]">{value}</span>
    </div>
  );
}

function TabItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} className={`flex flex-col items-center gap-2 px-5 py-2.5 cursor-pointer whitespace-nowrap transition-colors border-b-2 ${active ? "border-primary text-primary" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[12px] font-bold">{label}</span>
      </div>
    </div>
  );
}

function ParentRow({ name, role, phone, email, hideBorder = false, onViewLogin, onResetPassword }: { name: string, role: string, phone: string, email: string, hideBorder?: boolean, onViewLogin?: () => void, onResetPassword?: () => void }) {
  const getAvatar = (n: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=F1F5F9&color=5D6BEE&bold=true`;
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 ${hideBorder ? '' : 'border-b border-slate-100 dark:border-slate-800/50'}`}>
      <div className="flex items-center gap-3 w-48 text-left">
        <img src={getAvatar(name)} className="w-10 h-10 rounded-lg object-cover" />
        <div>
          <p className="text-[12px] font-bold text-slate-900 dark:text-white mb-0.5">{name}</p>
          <p className="text-[11px] text-primary font-bold">{role}</p>
        </div>
      </div>
      <div className="w-32 text-left">
        <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Phone</p>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">{phone}</p>
      </div>
      <div className="w-48 text-left">
        <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Email</p>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium truncate">{email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onViewLogin && (
          <button
            type="button"
            onClick={onViewLogin}
            title="View Login Details"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm cursor-pointer border border-border text-slate-600 dark:text-slate-350"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}
        {onResetPassword && (
          <button
            type="button"
            onClick={onResetPassword}
            title="Reset Password"
            className="w-8 h-8 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] flex items-center justify-center transition-colors shadow-sm cursor-pointer text-white"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function DocRow({ title, url }: { title: string, url?: string }) {
  return (
    <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/50 rounded-xl hover:border-slate-200 dark:border-slate-800 transition-colors bg-white dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-8 h-8 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50 flex items-center justify-center">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">FILE</span>
        </div>
        <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-full sm:w-[180px]">{title}</span>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm">
          <Download className="w-3.5 h-3.5 text-white" />
        </a>
      ) : (
        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 cursor-not-allowed">
          <Download className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}

function FeeRow({ group, code, due, amount, status, refId, mode, paid, discount }: any) {
  return (
    <tr className="hover:bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
      <td className="px-5 py-3 text-primary hover:underline cursor-pointer">{group}</td>
      <td className="px-5 py-3">{code}</td>
      <td className="px-5 py-3">{due}</td>
      <td className="px-5 py-3">{amount}</td>
      <td className="px-5 py-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success">
          <span className="w-1 h-1 rounded-full bg-success" /> {status}
        </span>
      </td>
      <td className="px-5 py-3">{refId}</td>
      <td className="px-5 py-3">{mode}</td>
      <td className="px-5 py-3">{paid}</td>
      <td className="px-5 py-3">{discount}</td>
    </tr>
  );
}

function ExamCard({
  title,
  initiallyExpanded,
  results = [],
  onEdit
}: {
  title: string,
  initiallyExpanded: boolean,
  results: any[],
  onEdit?: (result: any) => void
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const totalMaxMarks = results.reduce((sum, r) => sum + (r.total_marks || 100), 0);
  const totalObtainedMarks = results.reduce((sum, r) => sum + (r.obtained_marks ?? r.marks_obtained ?? 0), 0);
  const averagePercentage = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;
  const isOverallPass = results.every(r => r.is_pass !== false);

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-200">
      <div onClick={() => setExpanded(!expanded)} className="p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`w-5 h-5 rounded ${isOverallPass ? "bg-[#10B981]" : "bg-[#EF4444]"} text-white flex items-center justify-center shadow-sm`}>
            {isOverallPass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          </div>
          <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </div>
      {expanded && (
        <div className="p-5 bg-white dark:bg-slate-900 border-t border-border animate-in slide-in-from-top-2 duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] min-w-full sm:w-[600px]">
              <thead className="border-b border-border text-slate-900 dark:text-white font-bold">
                <tr>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Max Marks</th>
                  <th className="py-2.5 px-4">Min Marks</th>
                  <th className="py-2.5 px-4">Marks Obtained</th>
                  <th className="py-2.5 px-4 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-slate-600 dark:text-slate-300 font-medium">
                {results.map((r) => {
                  const subjectName = typeof r.subject_id === 'object' ? r.subject_id?.name : r.subject_id;
                  const obtained = r.obtained_marks ?? r.marks_obtained ?? 0;
                  return (
                    <ExamRow
                      key={r._id}
                      subject={subjectName || "Subject"}
                      max={r.total_marks || 100}
                      min={r.passing_marks || 33}
                      obtained={obtained}
                      isPass={r.is_pass !== false}
                      onEdit={onEdit ? () => onEdit(r) : undefined}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 bg-[var(--sidebar-bg)] text-white rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 text-[12px] font-bold shadow-md">
            <div className="flex gap-8">
              <span>Total : {totalMaxMarks}</span>
              <span>Marks Obtained : {totalObtainedMarks}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Percentage : {averagePercentage.toFixed(2)}%</span>
              <span>Result : <span className={isOverallPass ? "text-[#10B981]" : "text-[#EF4444]"}>{isOverallPass ? "Pass" : "Fail"}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamRow({
  subject,
  max,
  min,
  obtained,
  isPass,
  onEdit
}: {
  subject: string,
  max: number,
  min: number,
  obtained: number,
  isPass: boolean,
  onEdit?: () => void
}) {
  return (
    <tr className="hover:bg-slate-50/30 transition-colors">
      <td className="py-3 px-4">{subject}</td>
      <td className="py-3 px-4">{max}</td>
      <td className="py-3 px-4">{min}</td>
      <td className="py-3 px-4">{obtained}</td>
      <td className="py-3 px-4 text-right flex items-center justify-end gap-3">
        {isPass ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" /> Pass
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-danger/10 text-danger">
            <span className="w-1.5 h-1.5 rounded-full bg-danger mr-1.5" /> Fail
          </span>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

function LeaveCard({ title, used, available }: { title: string, used: number, available: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow flex flex-col gap-2">
      <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{title}</h4>
      <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3">
        <span>Used : <span className="text-slate-700 dark:text-slate-200">{used}</span></span>
        <span>Available : <span className="text-slate-700 dark:text-slate-200">{available}</span></span>
      </p>
    </div>
  );
}

function LeaveRow({ type, date, days, applied, status }: { type: string, date: string, days: number, applied: string, status: "Approved" | "Pending" | "Rejected" }) {
  return (
    <tr className="hover:bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{type}</td>
      <td className="px-5 py-3">{date}</td>
      <td className="px-5 py-3">{days}</td>
      <td className="px-5 py-3">{applied}</td>
      <td className="px-5 py-3">
        {status === "Approved" ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success">
            <span className="w-1 h-1 rounded-full bg-success" /> Approved
          </span>
        ) : status === "Rejected" ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-danger/10 text-danger">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" /> Rejected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E0F2FE] text-[#0284C7]">
            <span className="w-1 h-1 rounded-full bg-[#0EA5E9]" /> Pending
          </span>
        )}
      </td>
    </tr>
  );
}

function AttSumCard({ title, value, icon, iconBg }: { title: string, value: string, icon: React.ReactNode, iconBg: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">{title}</p>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{value}</h3>
      </div>
    </div>
  );
}

function LegendBadge({ label, color, icon }: { label: string, color: string, icon: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={`w-5 h-5 rounded flex items-center justify-center shadow-sm ${color}`}>
        {icon}
      </div>
      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}

// Mockup Data for Time Table Grid
const S_RED = { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-600" };
const S_BLUE = { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600" };
const S_GREEN = { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600" };
const S_SLATE = { bg: "bg-slate-50 dark:bg-slate-800/50", border: "border-slate-200 dark:border-slate-800", text: "text-slate-700 dark:text-slate-200" };
const S_PURPLE = { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-600" };
const S_TEAL = { bg: "bg-teal-50", border: "border-teal-100", text: "text-teal-600" };

const timeTableData = [
  [
    { time: "09:00 - 09:45 AM", subject: "Maths", teacher: "Jacquelin", ...S_RED },
    { time: "09:45 - 10:30 AM", subject: "English", teacher: "Hellana", ...S_TEAL },
    { time: "10:45 - 11:30 AM", subject: "Computer", teacher: "Daniel", ...S_GREEN },
    { time: "11:30 - 12:15 PM", subject: "Spanish", teacher: "Erickson", ...S_BLUE },
    { time: "01:30 - 02:15 PM", subject: "Science", teacher: "Morgan", ...S_PURPLE },
    { time: "02:15 - 03:00 PM", subject: "Chemistry", teacher: "Aaron", ...S_SLATE },
    { time: "03:15 - 04:00 PM", subject: "Physics", teacher: "Teresa", ...S_SLATE },
  ],
  [
    { time: "09:00 - 09:45 AM", subject: "Spanish", teacher: "Erickson", ...S_BLUE },
    { time: "09:45 - 10:30 AM", subject: "Physics", teacher: "Teresa", ...S_SLATE },
    { time: "10:45 - 11:30 AM", subject: "Chemistry", teacher: "Aaron", ...S_SLATE },
    { time: "11:30 - 12:15 PM", subject: "Maths", teacher: "Jacquelin", ...S_RED },
    { time: "01:30 - 02:15 PM", subject: "Computer", teacher: "Daniel", ...S_GREEN },
    { time: "02:15 - 03:00 PM", subject: "English", teacher: "Hellana", ...S_TEAL },
    { time: "03:15 - 04:00 PM", subject: "Science", teacher: "Morgan", ...S_PURPLE },
  ],
  [
    { time: "09:00 - 09:45 AM", subject: "Computer", teacher: "Daniel", ...S_GREEN },
    { time: "09:45 - 10:30 AM", subject: "Science", teacher: "Morgan", ...S_PURPLE },
    { time: "10:45 - 11:30 AM", subject: "Maths", teacher: "Jacquelin", ...S_RED },
    { time: "11:30 - 12:15 PM", subject: "Chemistry", teacher: "Aaron", ...S_SLATE },
    { time: "01:30 - 02:15 PM", subject: "Physics", teacher: "Teresa", ...S_SLATE },
    { time: "02:15 - 03:00 PM", subject: "English", teacher: "Hellana", ...S_TEAL },
    { time: "03:15 - 04:00 PM", subject: "Spanish", teacher: "Erickson", ...S_BLUE },
  ],
  [
    { time: "09:00 - 09:45 AM", subject: "Physics", teacher: "Teresa", ...S_SLATE },
    { time: "09:45 - 10:30 AM", subject: "Computer", teacher: "Daniel", ...S_GREEN },
    { time: "10:45 - 11:30 AM", subject: "English", teacher: "Hellana", ...S_TEAL },
    { time: "11:30 - 12:15 PM", subject: "Science", teacher: "Morgan", ...S_PURPLE },
    { time: "01:30 - 02:15 PM", subject: "Spanish", teacher: "Erickson", ...S_BLUE },
    { time: "02:15 - 03:00 PM", subject: "Chemistry", teacher: "Aaron", ...S_SLATE },
    { time: "03:15 - 04:00 PM", subject: "Maths", teacher: "Jacquelin", ...S_RED },
  ],
  [
    { time: "09:00 - 09:45 AM", subject: "English", teacher: "Hellana", ...S_TEAL },
    { time: "09:45 - 10:30 AM", subject: "Spanish", teacher: "Erickson", ...S_BLUE },
    { time: "10:45 - 11:30 AM", subject: "Physics", teacher: "Teresa", ...S_SLATE },
    { time: "11:30 - 12:15 PM", subject: "Chemistry", teacher: "Aaron", ...S_SLATE },
    { time: "01:30 - 02:15 PM", subject: "Maths", teacher: "Jacquelin", ...S_RED },
    { time: "02:15 - 03:00 PM", subject: "Computer", teacher: "Daniel", ...S_GREEN },
    { time: "03:15 - 04:00 PM", subject: "Science", teacher: "Morgan", ...S_PURPLE },
  ],
  [
    { time: "09:00 - 09:45 AM", subject: "English", teacher: "Hellana", ...S_TEAL },
    { time: "09:45 - 10:30 AM", subject: "Spanish", teacher: "Erickson", ...S_BLUE },
    { time: "10:45 - 11:30 AM", subject: "Physics", teacher: "Teresa", ...S_SLATE },
    { time: "11:30 - 12:15 PM", subject: "Chemistry", teacher: "Aaron", ...S_SLATE },
    { time: "01:30 - 02:15 PM", subject: "Maths", teacher: "Jacquelin", ...S_RED },
    { time: "02:15 - 03:00 PM", subject: "Computer", teacher: "Daniel", ...S_GREEN },
    { time: "03:15 - 04:00 PM", subject: "Science", teacher: "Morgan", ...S_PURPLE },
  ]
];

export default function StudentViewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 dark:text-slate-400">Loading...</div>}>
      <StudentViewContent />
    </Suspense>
  );
}
