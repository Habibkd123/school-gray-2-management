"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import { ClassService } from "@/app/services/ClassService";
import {
  ArrowLeft, Save, ClipboardList, Loader2, AlertCircle, CheckCircle,
} from "lucide-react";
import { validateSequential } from "@/lib/utils/formValidation";

const TITLE_PRESETS = [
  "Chapter 1 Test", "Chapter 2 Test", "Chapter 3 Test", "Weekly Test",
  "Monthly Test", "Revision Test", "Surprise Test", "Unit Test",
];

const ASSESSMENT_TYPES = [
  "Class Test",
  "Assignment",
  "Project",
  "Practical",
  "Lab",
  "Notebook",
  "Oral Test",
  "Viva",
  "Activity",
  "Presentation",
  "Homework",
  "Worksheet",
  "Observation"
];

interface ClassOption { _id: string; name: string; section: string }
interface SubjectOption { _id: string; name: string; code?: string }
interface ChapterOption { chapter_no: number; chapter_name: string }

export default function CreateTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = !!editId;
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin";

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [testDate, setTestDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [totalMarks, setTotalMarks] = useState<number | "">("");
  const [passingMarks, setPassingMarks] = useState<number | "">("");
  const [chapter, setChapter] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [assessmentType, setAssessmentType] = useState("Class Test");

  // Data
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [valErrors, setValErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  // Load classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await ClassService.getAllClasses({ status: "Active" });
        setClasses(data);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();

    // Default academic year
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    setAcademicYear(month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`);
  }, []);

  // Load subjects when class changes
  useEffect(() => {
    if (!classId) { setSubjects([]); setSubjectId(""); return; }
    const fetchSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const res = await fetch(`/api/subjects?class_id=${classId}&limit=100`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) setSubjects(data.data.subjects || []);
        else setSubjects([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };
    fetchSubjects();
    setSubjectId("");
    setChapters([]);
    setChapter("");
  }, [classId]);

  // Load chapters from syllabus when class + subject both selected
  useEffect(() => {
    if (!classId || !subjectId) { setChapters([]); return; }
    const fetchChapters = async () => {
      setIsLoadingChapters(true);
      try {
        const res = await fetch(`/api/syllabus?class_id=${classId}&subject_id=${subjectId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.data?.chapters?.length) {
          setChapters(data.data.chapters);
        } else {
          setChapters([]);
        }
      } finally {
        setIsLoadingChapters(false);
      }
    };
    fetchChapters();
  }, [classId, subjectId]);

  // Load existing test for edit mode
  useEffect(() => {
    if (!editId) return;
    const fetchTest = async () => {
      try {
        const res = await fetch(`/api/assessments/${editId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          const t = data.data;
          setTitle(t.title || "");
          setDescription(t.description || "");
          setClassId(t.class_id?._id || t.class_id || "");
          setSubjectId(t.subject_id?._id || t.subject_id || "");
          setTestDate(t.test_date ? t.test_date.split("T")[0] : "");
          setStartTime(t.start_time || "09:00");
          setEndTime(t.end_time || "10:00");
          setTotalMarks(t.total_marks ?? "");
          setPassingMarks(t.passing_marks ?? "");
          setChapter(t.chapter || "");
          setAcademicYear(t.academic_year || "");
          setStatus(t.status || "scheduled");
          setAssessmentType(t.assessment_type || "Class Test");
        }
      } catch { /* silent */ }
    };
    fetchTest();
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent, saveStatus?: string) => {
    e.preventDefault();
    setError("");

    const fieldsToValidate = [
      { id: "title", value: title, label: "Test Title" },
      { id: "classId", value: classId, label: "Class" },
      { id: "subjectId", value: subjectId, label: "Subject" },
      { id: "testDate", value: testDate, label: "Test Date" },
      { id: "startTime", value: startTime, label: "Start Time" },
      { id: "endTime", value: endTime, label: "End Time" },
      {
        id: "totalMarks",
        value: totalMarks,
        label: "Total Marks",
        customValidate: (val: any) => (!val || Number(val) < 1 ? "Total marks must be at least 1." : true)
      },
      {
        id: "passingMarks",
        value: passingMarks,
        label: "Passing Marks",
        customValidate: (val: any) => {
          if (val === "" || val === undefined || val === null) return "Passing marks are required.";
          if (Number(val) > Number(totalMarks)) return "Passing marks cannot exceed total marks.";
          return true;
        }
      }
    ];

    const valResult = validateSequential(fieldsToValidate);
    if (!valResult.isValid) {
      setValErrors({ [valResult.fieldId!]: valResult.error! });
      setError(valResult.error!);
      return;
    }
    setValErrors({});

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(), description: description.trim(),
        class_id: classId, subject_id: subjectId,
        test_date: testDate, start_time: startTime, end_time: endTime,
        total_marks: Number(totalMarks), passing_marks: Number(passingMarks),
        chapter: chapter.trim() || undefined,
        academic_year: academicYear,
        status: saveStatus || status,
        assessment_type: assessmentType
      };

      const url = isEditing ? `/api/assessments/${editId}` : "/api/assessments";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(isEditing ? "Test updated successfully!" : "Test created successfully!");
        setTimeout(() => router.push("/assessments"), 1200);
      } else {
        setError(data.message || "Failed to save test");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400";
  const labelClass = "block text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-6 mb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-[20px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {isEditing ? "Edit Test" : "Create New Test"}
          </h1>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            {isEditing ? "Update test details below" : "Fill in the details to schedule a new test"}
          </p>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-[13px] text-emerald-700 dark:text-emerald-400 font-medium">{success}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-[13px] text-rose-700 dark:text-rose-400 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 border-b border-border pb-3">
            Test Information
          </h2>

          {/* Assessment Type */}
          <div>
            <label className={labelClass}>Assessment Type <span className="text-rose-500">*</span></label>
            <div className="relative">
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className={fieldClass}
              >
                {ASSESSMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title with presets */}
          <div>
            <label className={labelClass}>Test Title <span className="text-rose-500">*</span></label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 1 Test"
              className={`${fieldClass} ${valErrors.title ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`}
            />
            {valErrors.title && (
              <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                ❌ {valErrors.title}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TITLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Additional instructions or notes..."
              className={`${fieldClass} resize-none`}
            />
          </div>

          {/* Class + Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Class <span className="text-rose-500">*</span></label>
              <select
                id="classId"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={`${fieldClass} cursor-pointer ${valErrors.classId ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`}
              >
                <option value="">{isLoadingClasses ? "Loading..." : "Select Class"}</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}{c.section ? ` — ${c.section}` : ""}
                  </option>
                ))}
              </select>
              {valErrors.classId && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.classId}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Subject <span className="text-rose-500">*</span></label>
              <select
                id="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!classId}
                className={`${fieldClass} cursor-pointer disabled:opacity-60 ${valErrors.subjectId ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`}
              >
                <option value="">{isLoadingSubjects ? "Loading..." : classId ? "Select Subject" : "Select class first"}</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
                ))}
              </select>
              {valErrors.subjectId && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.subjectId}
                </p>
              )}
            </div>
          </div>

          {/* Chapter */}
          <div>
            <label className={labelClass}>
              Chapter (Optional)
              {isLoadingChapters && <span className="ml-2 text-slate-400 text-[11px]">Loading...</span>}
            </label>
            {chapters.length > 0 ? (
              <select value={chapter} onChange={(e) => setChapter(e.target.value)} className={`${fieldClass} cursor-pointer`}>
                <option value="">No specific chapter</option>
                {chapters.map((ch) => (
                  <option key={ch.chapter_no} value={ch.chapter_name}>
                    Ch {ch.chapter_no}: {ch.chapter_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g., Photosynthesis or Chapter 3"
                className={fieldClass}
              />
            )}
            {classId && subjectId && !isLoadingChapters && chapters.length === 0 && (
              <p className="text-[11px] text-slate-400 mt-1">No syllabus chapters found — enter manually above.</p>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 border-b border-border pb-3">
            Schedule & Marks
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Test Date <span className="text-rose-500">*</span></label>
              <input id="testDate" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className={`${fieldClass} ${valErrors.testDate ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`} />
              {valErrors.testDate && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.testDate}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Start Time <span className="text-rose-500">*</span></label>
              <input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${fieldClass} ${valErrors.startTime ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`} />
              {valErrors.startTime && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.startTime}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>End Time <span className="text-rose-500">*</span></label>
              <input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`${fieldClass} ${valErrors.endTime ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`} />
              {valErrors.endTime && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.endTime}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Total Marks <span className="text-rose-500">*</span></label>
              <input
                id="totalMarks"
                type="number" min="1" value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g., 100"
                className={`${fieldClass} ${valErrors.totalMarks ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`}
              />
              {valErrors.totalMarks && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.totalMarks}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Passing Marks <span className="text-rose-500">*</span></label>
              <input
                id="passingMarks"
                type="number" min="0" max={totalMarks || undefined}
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g., 35"
                className={`${fieldClass} ${valErrors.passingMarks ? "border border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : ""}`}
              />
              {valErrors.passingMarks && (
                <p className="text-[11px] text-rose-500 font-bold mt-1 text-left animate-in slide-in-from-top-1">
                  ❌ {valErrors.passingMarks}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Academic Year</label>
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g., 2026-2027" className={fieldClass} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any, "draft")}
            disabled={isSaving}
            className="px-5 py-2.5 border border-border rounded-xl text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer">
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-70 shadow-sm cursor-pointer">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? "Update Test" : "Schedule Test"}
          </button>
        </div>
      </form>
    </div>
  );
}
