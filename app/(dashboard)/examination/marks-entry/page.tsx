"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Save,
  Loader2,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  FileText,
  ChevronDown,
  XCircle,
  AlertCircle,
  Info,
  Calendar,
  Layers,
  HelpCircle,
  Clipboard,
  History,
  Lock,
  Printer,
  Download,
  Unlock
} from "lucide-react";
import { useExams } from "@/app/hooks/useExams";
import { useClasses } from "@/app/hooks/useClasses";
import { useSubjects } from "@/app/hooks/useSubjects";
import { useStudents } from "@/app/hooks/useStudents";
import { useResults } from "@/app/hooks/useExams";
import { useExamSchedule } from "@/app/hooks/useExamSchedule";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";
import { getAuthHeaders } from "@/lib/utils/session";

function resolveId(field: { _id: string } | string | undefined): string {
  if (!field) return "";
  return typeof field === "object" ? field._id : field;
}

export default function MarksEntryPage() {
  const { user } = useAuth();
  const { academicYear } = useAppState();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const isTeacher = user?.role === "teacher";

  const searchParams = useSearchParams();
  const examIdParam = searchParams.get("exam_id") || "";

  // Selected filters
  const [filterYear, setFilterYear] = useState(academicYear || "2026");
  const [selectedExamId, setSelectedExamId] = useState(examIdParam);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { exams } = useExams();
  const { classes, isLoading: loadingClasses } = useClasses({ filterByYear: true });
  const { students, isLoading: loadingStudents, fetchStudents } = useStudents({ skip: true });
  const { results, fetchResults, createResults, isLoading: loadingResults } = useResults(selectedExamId || undefined);

  // Modals & Drawers
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Status flags
  const [saving, setSaving] = useState(false);
  const [toastSuccess, setToastSuccess] = useState("");
  const [toastError, setToastError] = useState("");

  // Sync selected exam from URL query parameter
  useEffect(() => {
    if (examIdParam) {
      setSelectedExamId(examIdParam);
    }
  }, [examIdParam]);

  // When selected exam changes, auto-resolve Class Name
  useEffect(() => {
    if (selectedExamId) {
      const ex = exams.find(e => e._id === selectedExamId);
      if (ex) {
        const clsId = resolveId(ex.class_id);
        const clsObj = classes.find(c => c._id === clsId);
        if (clsObj) {
          setSelectedClassName(clsObj.name);
          setSelectedSection(clsObj.section || "");
        }
      }
    }
  }, [selectedExamId, exams, classes]);

  // Load all students and results on start
  useEffect(() => {
    fetchStudents({ limit: 10000 });
  }, [fetchStudents]);

  // Resolve target class ID based on Class name + Section selection
  const resolvedClass = useMemo(() => {
    if (!selectedClassName || !selectedSection) return null;
    return classes.find(c => c.name === selectedClassName && c.section === selectedSection) || null;
  }, [classes, selectedClassName, selectedSection]);

  const resolvedClassId = resolvedClass?._id || "";

  // Fetch subjects for the resolved class dynamically
  const { subjects, loading: loadingSubjects } = useSubjects(resolvedClassId || undefined);

  // Fetch schedules for the selected exam to get max_marks and passing_marks
  const { schedules, loading: loadingSchedules } = useExamSchedule(selectedExamId || undefined);

  const activeSchedule = useMemo(() => {
    if (!selectedSubjectId || schedules.length === 0) return null;
    return schedules.find(s => resolveId(s.subject_id) === selectedSubjectId);
  }, [selectedSubjectId, schedules]);

  const maxMarksForSubject = useMemo(() => {
    if (activeSchedule) return activeSchedule.max_marks;
    const sub = subjects.find(s => s._id === selectedSubjectId);
    return sub?.full_marks || 100;
  }, [activeSchedule, selectedSubjectId, subjects]);

  const passingMarksForSubject = useMemo(() => {
    if (activeSchedule) return activeSchedule.passing_marks;
    const sub = subjects.find(s => s._id === selectedSubjectId);
    return sub?.pass_marks || 33;
  }, [activeSchedule, selectedSubjectId, subjects]);

  // Unique Class Names for dropdown (Nursery, LKG, UKG, Class 1...)
  const uniqueClassNames = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.name) set.add(c.name);
    });
    return Array.from(set).sort();
  }, [classes]);

  // Unique Sections for the selected class name (A, B, Science, Commerce...)
  const sectionsForSelectedClass = useMemo(() => {
    if (!selectedClassName) return [];
    const secs = new Set<string>();
    classes.forEach(c => {
      if (c.name === selectedClassName && c.section) secs.add(c.section);
    });
    return Array.from(secs).sort();
  }, [classes, selectedClassName]);

  // Filter students: strictly matching resolved class ID
  const classStudents = useMemo(() => {
    if (!resolvedClassId) return [];
    return students.filter(s => resolveId(s.class_id) === resolvedClassId && s.is_active !== false);
  }, [students, resolvedClassId]);

  // Apply search filtering on Roll, Admission No, Student Name
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      const sName = s.name || "";
      const sRoll = s.roll_no || "";
      const sAdmission = s.admission_no || "";
      return sName.toLowerCase().includes(q) ||
        sRoll.toLowerCase().includes(q) ||
        sAdmission.toLowerCase().includes(q);
    });
  }, [classStudents, searchTerm]);

  // Determine if the exam is published and locked
  const isExamLocked = useMemo(() => {
    const ex = exams.find(e => e._id === selectedExamId);
    return !!(ex?.is_published && isTeacher);
  }, [selectedExamId, exams, isTeacher]);

  // Local state to track marks being entered
  const [marksData, setMarksData] = useState<Record<string, {
    marks_obtained: string,
    total_marks: string,
    remarks: string,
    attendance_status: string
  }>>({});

  // Auto-Save unsaved cache ref
  const hasUnsavedChanges = useRef(false);

  // When selected exam/class/subject changes, pre-fill marksData with existing results
  useEffect(() => {
    if (!selectedExamId || !resolvedClassId || !selectedSubjectId) {
      setMarksData({});
      hasUnsavedChanges.current = false;
      return;
    }

    const defaultTotal = maxMarksForSubject.toString();
    const newMarksData: Record<string, {
      marks_obtained: string,
      total_marks: string,
      remarks: string,
      attendance_status: string
    }> = {};

    classStudents.forEach(student => {
      const existing = results.find(r =>
        resolveId(r.exam_id) === selectedExamId &&
        resolveId(r.subject_id) === selectedSubjectId &&
        resolveId(r.student_id) === student._id
      );

      if (existing) {
        newMarksData[student._id] = {
          marks_obtained: existing.marks_obtained !== undefined ? existing.marks_obtained.toString() : (existing.obtained_marks !== undefined ? existing.obtained_marks.toString() : ""),
          total_marks: existing.total_marks.toString(),
          remarks: existing.remarks || "",
          attendance_status: existing.attendance_status || "Present"
        };
      } else {
        newMarksData[student._id] = {
          marks_obtained: "",
          total_marks: defaultTotal,
          remarks: "",
          attendance_status: "Present"
        };
      }
    });

    setMarksData(newMarksData);
    hasUnsavedChanges.current = false;
  }, [selectedExamId, resolvedClassId, selectedSubjectId, classStudents, results, maxMarksForSubject]);

  const handleMarksChange = (studentId: string, field: "marks_obtained" | "total_marks" | "remarks" | "attendance_status", value: string) => {
    if (isExamLocked) return;
    hasUnsavedChanges.current = true;
    setMarksData(prev => {
      const current = prev[studentId] || { marks_obtained: "", total_marks: maxMarksForSubject.toString(), remarks: "", attendance_status: "Present" };
      const updated = { ...current, [field]: value };

      // If student is marked Absent, clear and disable obtained marks
      if (field === "attendance_status" && value === "Absent") {
        updated.marks_obtained = "0";
      }
      return {
        ...prev,
        [studentId]: updated
      };
    });
  };

  // Grade & Result calculator matching CBSE/State Board rules
  const calculateGradeAndResult = (obtainedStr: string, totalStr: string, attendanceStatus: string) => {
    if (attendanceStatus === "Absent") {
      return { grade: "F", isPass: false, resultLabel: "Absent" };
    }
    if (attendanceStatus === "Medical") {
      return { grade: "—", isPass: false, resultLabel: "Medical" };
    }
    if (attendanceStatus === "Exempted") {
      return { grade: "—", isPass: false, resultLabel: "Exempted" };
    }

    const obtained = Number(obtainedStr);
    const total = Number(totalStr);

    if (obtainedStr.trim() === "" || isNaN(obtained) || isNaN(total) || total <= 0) {
      return { grade: "—", isPass: false, resultLabel: "—" };
    }

    const percentage = (obtained / total) * 105; // Grade scaling factor
    let grade = "F";
    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B";
    else if (percentage >= 60) grade = "C";
    else if (percentage >= 50) grade = "D";
    else if (percentage >= 40) grade = "E";

    const isPass = obtained >= passingMarksForSubject;
    return { grade, isPass, resultLabel: isPass ? "Pass" : "Fail" };
  };

  // Save Marks handler
  const handleSaveMarks = async (status: "draft" | "final", showToast = true) => {
    if (!selectedExamId || !resolvedClassId || !selectedSubjectId) return false;

    // Collect and validate entries
    const entriesToSave: any[] = [];
    const validationErrors: string[] = [];

    for (const student of classStudents) {
      const data = marksData[student._id];
      if (data) {
        const obtained = Number(data.marks_obtained || 0);
        const total = Number(data.total_marks || maxMarksForSubject);

        // Standard validation checks
        if (obtained < 0) {
          validationErrors.push(`Marks for ${student.name} cannot be negative.`);
        }
        if (obtained > total) {
          validationErrors.push(`Marks for ${student.name} (${obtained}) cannot exceed Maximum Marks (${total}).`);
        }

        const { grade, isPass } = calculateGradeAndResult(data.marks_obtained, data.total_marks, data.attendance_status);

        entriesToSave.push({
          exam_id: selectedExamId,
          class_id: resolvedClassId,
          student_id: student._id,
          subject_id: selectedSubjectId,
          marks_obtained: obtained,
          total_marks: total,
          passing_marks: passingMarksForSubject,
          grade,
          is_pass: isPass,
          remarks: data.remarks,
          attendance_status: data.attendance_status || "Present",
          status
        });
      }
    }

    if (validationErrors.length > 0) {
      setToastError(validationErrors[0]);
      setTimeout(() => setToastError(""), 4500);
      return false;
    }

    if (entriesToSave.length === 0) {
      return false;
    }

    setSaving(true);
    const res = await createResults(entriesToSave);
    setSaving(false);

    if (res.success) {
      hasUnsavedChanges.current = false;
      if (showToast) {
        setToastSuccess(status === "draft" ? "Marks draft saved successfully!" : "Final marks submitted successfully!");
        setTimeout(() => setToastSuccess(""), 3000);
      }
      fetchResults();
      return true;
    } else {
      if (showToast) {
        setToastError(res.message || "Failed to save marks.");
        setTimeout(() => setToastError(""), 3000);
      }
      return false;
    }
  };

  // Background Auto-Save Daemon
  useEffect(() => {
    const timer = setInterval(() => {
      if (hasUnsavedChanges.current && !isExamLocked && selectedExamId && resolvedClassId && selectedSubjectId) {
        console.log("Auto-Saving draft in background...");
        handleSaveMarks("draft", false);
      }
    }, 10000); // Trigger auto save every 10 seconds

    return () => clearInterval(timer);
  }, [selectedExamId, resolvedClassId, selectedSubjectId, marksData, isExamLocked]);

  // Load Audit Trail logs drawer
  const handleOpenAuditLogs = async () => {
    if (!selectedExamId || !selectedSubjectId) {
      alert("Please select an Exam and Subject first.");
      return;
    }
    setLoadingAudit(true);
    setIsAuditOpen(true);
    try {
      const res = await fetch(`/api/results/audit?exam_id=${selectedExamId}&subject_id=${selectedSubjectId}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data);
      } else {
        setToastError(data.message || "Failed to load logs.");
      }
    } catch {
      setToastError("Network error.");
    } finally {
      setLoadingAudit(false);
    }
  };

  // Keyboard navigation arrow refs mapping
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentId: string, index: number) => {
    const keys = ["ArrowUp", "ArrowDown", "Enter"];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const studentsIds = filteredStudents.map(s => s._id);
    let targetIndex = index;

    if (e.key === "ArrowUp") {
      targetIndex = Math.max(0, index - 1);
    } else if (e.key === "ArrowDown" || e.key === "Enter") {
      targetIndex = Math.min(studentsIds.length - 1, index + 1);
    }

    const targetStudentId = studentsIds[targetIndex];
    const targetRef = inputRefs.current[targetStudentId];
    if (targetRef) {
      targetRef.focus();
      targetRef.select();
    }
  };

  // Parse bulk excel pasted marks
  const handleParseBulk = () => {
    if (!bulkInput.trim()) return;

    // Parses pasted spreadsheet cells (tab or newline separated)
    const rows = bulkInput.trim().split("\n");
    const parsedData: Record<string, string> = {};

    rows.forEach(row => {
      const cells = row.split("\t");
      if (cells.length >= 2) {
        const rollOrAdm = cells[0].trim().toLowerCase();
        const score = cells[1].trim();
        parsedData[rollOrAdm] = score;
      }
    });

    // Match matched scores back to local student structures
    setMarksData(prev => {
      const copy = { ...prev };
      classStudents.forEach(student => {
        const rollMatch = student.roll_no ? parsedData[student.roll_no.toLowerCase()] : null;
        const admMatch = student.admission_no ? parsedData[student.admission_no.toLowerCase()] : null;
        const matchedScore = rollMatch || admMatch;

        if (matchedScore && !isNaN(Number(matchedScore))) {
          copy[student._id] = {
            ...copy[student._id],
            marks_obtained: matchedScore,
            attendance_status: "Present"
          };
        }
      });
      return copy;
    });

    hasUnsavedChanges.current = true;
    setIsBulkOpen(false);
    setBulkInput("");
    setToastSuccess("Excel clipboard data parsed and mapped successfully!");
    setTimeout(() => setToastSuccess(""), 3000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header and Actions bar */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/examination/exam" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 mr-1 cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="page-title">Marks Entry System</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-10 font-normal">Record marks, assign attendance statuses, and calculate passing metrics dynamically.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenAuditLogs}
            disabled={!selectedExamId || !selectedSubjectId}
            className="p-2 border border-border text-slate-655 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40"
            title="View Audit Logs"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsBulkOpen(true)}
            disabled={isExamLocked || !selectedExamId || !selectedSubjectId || filteredStudents.length === 0}
            className="px-4 py-2 border border-border bg-white dark:bg-slate-900 text-slate-655 hover:bg-slate-50 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-45"
          >
            <Clipboard className="w-4 h-4" /> Import Excel
          </button>

          <button
            onClick={() => handleSaveMarks("draft")}
            disabled={saving || isExamLocked || !selectedExamId || !resolvedClassId || !selectedSubjectId || filteredStudents.length === 0}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <FileText className="w-4 h-4" />}
            Save Draft
          </button>

          <button
            onClick={() => handleSaveMarks("final")}
            disabled={saving || isExamLocked || !selectedExamId || !resolvedClassId || !selectedSubjectId || filteredStudents.length === 0}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle className="w-4 h-4" />}
            Submit Final
          </button>
        </div>
      </div>

      {/* Lock banner if published */}
      {isExamLocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>These marks are locked because the exam results have been published. Only Admins or Principals can make updates.</span>
        </div>
      )}

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-4 text-left">
        <div className="flex flex-wrap items-center gap-4">
          {/* Academic Session */}
          <div className="flex flex-col gap-1 w-full sm:w-40">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Session</label>
            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none animate-in fade-in"
              >
                <option value="2026">Session 2026</option>
                <option value="2027">Session 2027</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Exam Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-56">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Exam Event</label>
            <div className="relative">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
              >
                <option value="">Select Exam</option>
                {exams.filter(e => e.academic_year === filterYear).map(e => (
                  <option key={e._id} value={e._id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Class name Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-40">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Class</label>
            <div className="relative">
              <select
                value={selectedClassName}
                onChange={(e) => {
                  setSelectedClassName(e.target.value);
                  setSelectedSection("");
                  setSelectedSubjectId("");
                }}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-955 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none"
              >
                <option value="">Select Class</option>
                {uniqueClassNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Section Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-36">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Section</label>
            <div className="relative">
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setSelectedSubjectId("");
                }}
                disabled={!selectedClassName}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none disabled:opacity-50"
              >
                <option value="">Select Section</option>
                {sectionsForSelectedClass.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Subject Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-52">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Subject</label>
            <div className="relative">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!resolvedClassId || loadingSubjects}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none cursor-pointer appearance-none disabled:opacity-50"
              >
                <option value="">{loadingSubjects ? "Loading..." : "Select Subject"}</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Marks Entry Portal grid */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table top toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-955/20">
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span>Roster list of <span className="font-bold text-slate-800 dark:text-slate-100">{filteredStudents.length}</span> active student(s)</span>
            {selectedSubjectId && (
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                Max Marks: {maxMarksForSubject} | Passing: {passingMarksForSubject}
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student, adm, or roll..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 pr-3 py-1.8 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-xl outline-none"
            />
          </div>
        </div>

        {/* Dynamic marks entry table layout */}
        <div className="overflow-x-auto relative">
          <table className="erp-table text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-950/10 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="px-6 py-4 w-20">Roll No</th>
                <th className="px-6 py-4 w-32">Adm No</th>
                <th className="px-6 py-4 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-border">Student Name</th>
                <th className="px-6 py-4 w-36">Attendance</th>
                <th className="px-6 py-4 w-40">Obtained Marks</th>
                <th className="px-6 py-4 w-28">Max Marks</th>
                <th className="px-6 py-4 text-center w-24">Grade</th>
                <th className="px-6 py-4 text-center w-24">Result</th>
                <th className="px-6 py-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(!selectedExamId || !resolvedClassId || !selectedSubjectId) ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-450 font-bold text-xs">
                    Please use the filter bar above to select Exam, Class Section, and Subject to start entering marks.
                  </td>
                </tr>
              ) : (loadingStudents || loadingResults || loadingSchedules) ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-bold text-xs">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-xs">Loading records...</p>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-450 font-bold text-xs">
                    No active students found matching the selected class/section or search filter.
                  </td>
                </tr>
              ) : filteredStudents.map((student, idx) => {
                const data = marksData[student._id] || { marks_obtained: "", total_marks: maxMarksForSubject.toString(), remarks: "", attendance_status: "Present" };
                const { grade, resultLabel, isPass } = calculateGradeAndResult(data.marks_obtained, data.total_marks, data.attendance_status);

                const isAbsent = data.attendance_status === "Absent";
                const marksLimitWarning = data.marks_obtained && Number(data.marks_obtained) > Number(data.total_marks);

                return (
                  <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-sans font-bold text-slate-500">{student.roll_no || "—"}</td>
                    <td className="px-6 py-4 font-sans text-slate-500">{student.admission_no || "—"}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-border">
                      <div className="flex items-center gap-2">
                        {student.photo_url ? (
                          <img src={student.photo_url} alt={student.name} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-400">
                            {student.name.charAt(0)}
                          </div>
                        )}
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative">
                        <select
                          value={data.attendance_status}
                          onChange={(e) => handleMarksChange(student._id, "attendance_status", e.target.value)}
                          disabled={isExamLocked}
                          className="w-full pl-2 pr-6 py-1.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-xs font-bold outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Medical">Medical</option>
                          <option value="Exempted">Exempted</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-455 absolute right-2 top-2 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative">
                        <input
                          type="number"
                          ref={el => { inputRefs.current[student._id] = el; }}
                          min="0"
                          max={data.total_marks}
                          value={data.marks_obtained}
                          onChange={(e) => handleMarksChange(student._id, "marks_obtained", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, student._id, idx)}
                          disabled={isAbsent || isExamLocked}
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs outline-none focus:border-primary font-bold ${isAbsent
                              ? "bg-slate-150 dark:bg-slate-850 cursor-not-allowed opacity-50"
                              : "bg-white dark:bg-slate-900"
                            } ${marksLimitWarning ? "border-rose-500 focus:border-rose-500 bg-rose-50/30 text-rose-700" : "border-border text-slate-850 dark:text-slate-150"}`}
                          placeholder={isAbsent ? "DISABLED" : "Enter Marks"}
                        />
                        {marksLimitWarning && (
                          <div className="absolute -bottom-1 -right-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 rounded">
                            Exceeds max
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        value={data.total_marks}
                        disabled
                        className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs outline-none bg-slate-100 dark:bg-slate-800/40 text-slate-400 font-bold cursor-not-allowed"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${grade === 'F'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-indigo-50 text-indigo-750 border-indigo-200'
                        }`}>
                        {grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${resultLabel === "Pass"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : resultLabel === "Fail" || resultLabel === "Absent"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-655 border-border"
                        }`}>
                        {resultLabel}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        value={data.remarks}
                        onChange={(e) => handleMarksChange(student._id, "remarks", e.target.value)}
                        disabled={isExamLocked}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary text-slate-800 dark:text-slate-200"
                        placeholder="Optional remarks..."
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BULK CLIPBOARD IMPORT DIALOG ── */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsBulkOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col z-50 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-primary" />
                <span>Bulk Spreadsheet Import</span>
              </h3>
              <button
                onClick={() => setIsBulkOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-slate-450" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border border-border rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-350 font-medium">
                <p className="font-bold text-slate-800 dark:text-slate-200">Clipboard Format Guidelines:</p>
                <p>1. Copy two columns from Excel (Roll Number / Adm Number in Column 1, Marks Obtained in Column 2).</p>
                <p>2. Paste directly into the area below. The system will match your rows dynamically by roll/adm ID.</p>
              </div>

              <textarea
                placeholder="RollNo&#9;Marks&#10;1&#9;85&#10;2&#9;92..."
                rows={8}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-xs font-sans outline-none focus:border-primary bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150"
              />

              <div className="flex justify-end gap-2.5 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-50 bg-white cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseBulk}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  Parse and Map Marks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT TRAILS DRAWER ── */}
      {isAuditOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsAuditOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border-l border-border w-full max-w-lg h-full z-50 flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-250 text-left">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <span>Audit Logs History Ledger</span>
              </h3>
              <button
                onClick={() => setIsAuditOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-slate-450" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingAudit ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-bold text-slate-400">Fetching ledger...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center text-slate-450 py-20 font-bold text-xs">
                  No audit modification logs recorded for this class & subject.
                </div>
              ) : (
                <div className="space-y-4 font-semibold text-xs text-slate-700 dark:text-slate-300">
                  {auditLogs.map((log) => (
                    <div key={log._id} className="bg-slate-50 dark:bg-slate-800/40 p-4 border border-border rounded-xl space-y-2 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            Student: {log.student_id?.name || "Student"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Roll No: {log.student_id?.roll_no || "N/A"}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase border ${log.action_type === "create"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                            : "bg-indigo-50 text-indigo-750 border-indigo-250"
                          }`}>
                          {log.action_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-[10px] text-slate-455 block">Previous Marks</span>
                          <span className="font-bold font-sans">{log.previous_marks}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-455 block">New Marks</span>
                          <span className="font-bold font-sans text-indigo-650 dark:text-indigo-400">{log.new_marks}</span>
                        </div>
                      </div>

                      <div className="text-[11px] pt-1 italic text-slate-500">
                        Reason: "{log.reason || "Updated manually"}"
                      </div>

                      <div className="h-px bg-border my-2" />

                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Changed By: {log.changed_by?.name || "Admin"}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-950/20 flex justify-end">
              <button
                onClick={() => setIsAuditOpen(false)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-100 bg-white cursor-pointer text-slate-700"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success & Error Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toastSuccess && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
            <CheckCircle className="w-4 h-4 shrink-0 stroke-[3]" />
            <span className="text-xs font-bold">{toastSuccess}</span>
          </div>
        )}
        {toastError && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[3]" />
            <span className="text-xs font-bold">{toastError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
