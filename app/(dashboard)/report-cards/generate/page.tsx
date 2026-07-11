"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, BookOpen, Calendar, Users,
  FileText, Loader2, Search, CheckSquare, Square, Eye, LayoutTemplate, Sparkles
} from "lucide-react";
import { useExams } from "@/app/hooks/useExams";
import { useStudents } from "@/app/hooks/useStudents";
import { useClasses } from "@/app/hooks/useClasses";
import { useAuth } from "@/app/context/auth";
import { TEMPLATE_DEFINITIONS } from "@/app/components/document-builder/templates-data";
import { createDocument, saveReportCardBatch } from "@/app/components/document-builder/store";
import { getAuthHeaders } from "@/lib/utils/session";
import type { ApiStudent } from "@/app/hooks/useStudents";
import type { CanvasPage } from "@/app/components/document-builder/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACADEMIC_YEARS = ["2026-27", "2025-26", "2024-25", "2023-24", "2022-23"];
const PASS_MARK = 35;

function resolveId(field: any): string {
  if (!field) return "";
  return typeof field === "object" ? (field._id || "") : field;
}
function resolveName(field: any, fallback = ""): string {
  if (!field) return fallback;
  return typeof field === "object" ? (field.name || fallback) : fallback;
}
function getGrade(pct: number): string {
  if (pct >= 90) return "O";
  if (pct >= 80) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 60) return "B+";
  if (pct >= 50) return "B";
  if (pct >= 40) return "C+";
  if (pct >= 35) return "C";
  return "F";
}

// ─── Auto-fill: replace {{var}} placeholders in page elements ─────────────────

function applyReportCardData(
  pages: CanvasPage[],
  data: Record<string, string>,
  subjects: { name: string; maxMarks: number; marksObtained: number; grade: string; status: string }[],
  enablePracticalInternal: boolean
): CanvasPage[] {
  return pages.map((page) => ({
    ...page,
    elements: page.elements.map((el) => {
      // Replace text content variables
      if (el.content) {
        let content = el.content;
        for (const [key, value] of Object.entries(data)) {
          content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
        }
        el = { ...el, content };
      }

      // Replace table cells with actual subject data dynamically
      if (el.type === "table" && el.tableData) {
        const isMarksTable = el.tableData.cells[0]?.[0]?.toLowerCase() === "subject" ||
          el.tableData.cells[1]?.[0]?.toLowerCase()?.includes("[subject");

        if (isMarksTable && subjects.length > 0) {
          let cols = 4;
          let cells: string[][] = [];

          if (enablePracticalInternal) {
            cols = 6;
            // Header Row
            cells.push(["Subject", "Theory", "Practical", "Internal", "Total", "Grade"]);

            let totalTheoryMax = 0, totalTheoryObt = 0;
            let totalPracticalMax = 0, totalPracticalObt = 0;
            let totalInternalMax = 0, totalInternalObt = 0;
            let totalMaxMarks = 0, totalObtainedMarks = 0;

            subjects.forEach((sub) => {
              // Calculate split: Theory 70%, Practical 20%, Internal 10%
              const theoryMax = Math.round(sub.maxMarks * 0.7);
              const theoryObt = Math.round(sub.marksObtained * 0.7);

              const practicalMax = Math.round(sub.maxMarks * 0.2);
              const practicalObt = Math.round(sub.marksObtained * 0.2);

              const internalMax = sub.maxMarks - theoryMax - practicalMax;
              const internalObt = sub.marksObtained - theoryObt - practicalObt;

              totalTheoryMax += theoryMax;
              totalTheoryObt += theoryObt;
              totalPracticalMax += practicalMax;
              totalPracticalObt += practicalObt;
              totalInternalMax += internalMax;
              totalInternalObt += internalObt;
              totalMaxMarks += sub.maxMarks;
              totalObtainedMarks += sub.marksObtained;

              cells.push([
                sub.name,
                `${theoryObt}/${theoryMax}`,
                `${practicalObt}/${practicalMax}`,
                `${internalObt}/${internalMax}`,
                `${sub.marksObtained}/${sub.maxMarks}`,
                sub.grade,
              ]);
            });

            // TOTAL Row
            cells.push([
              "TOTAL",
              `${totalTheoryObt}/${totalTheoryMax}`,
              `${totalPracticalObt}/${totalPracticalMax}`,
              `${totalInternalObt}/${totalInternalMax}`,
              `${totalObtainedMarks}/${totalMaxMarks}`,
              data.overall_grade || data.rc_grade || "—",
            ]);
          } else {
            cols = 4;
            // Header Row
            cells.push(["Subject", "Max Marks", "Obtained Marks", "Grade"]);

            let totalMaxMarks = 0, totalObtainedMarks = 0;

            subjects.forEach((sub) => {
              totalMaxMarks += sub.maxMarks;
              totalObtainedMarks += sub.marksObtained;

              cells.push([
                sub.name,
                String(sub.maxMarks),
                String(sub.marksObtained),
                sub.grade,
              ]);
            });

            // TOTAL Row
            cells.push([
              "TOTAL",
              String(totalMaxMarks),
              String(totalObtainedMarks),
              data.overall_grade || data.rc_grade || "—",
            ]);
          }

          const rows = cells.length;
          // Dynamically size the table element to prevent overflow. Each row is about 32px height.
          const dynamicHeight = Math.max(80, rows * 32);

          el = {
            ...el,
            height: dynamicHeight,
            tableData: {
              ...el.tableData,
              rows,
              cols,
              cells,
            },
          };
        } else {
          // Replace other variables in table cells (e.g. Student details grid)
          const cells = el.tableData.cells.map((row) =>
            row.map((cell) => {
              let c = cell;
              for (const [key, value] of Object.entries(data)) {
                c = c.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
              }
              return c;
            })
          );
          el = { ...el, tableData: { ...el.tableData, cells } };
        }
      }

      return el;
    }),
  }));
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Academic Year" },
  { id: 2, label: "Select Exam" },
  { id: 3, label: "Select Class" },
  { id: 4, label: "Select Section" },
  { id: 5, label: "Choose Students" },
  { id: 6, label: "Choose Template" },
  { id: 7, label: "Generate" },
];

const RC_TEMPLATES = TEMPLATE_DEFINITIONS.filter((t) => t.categoryId === "report_card");

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenerateReportCardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // Step state
  const [selectedYear, setSelectedYear] = useState(ACADEMIC_YEARS[0]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [studentMode, setStudentMode] = useState<"all" | "multiple" | "single">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("rc-classic");
  const [studentSearch, setStudentSearch] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBatchId, setGeneratedBatchId] = useState<string | null>(null);
  const [enablePracticalInternal, setEnablePracticalInternal] = useState(false);

  // Data hooks
  const { exams, loading: examsLoading } = useExams();
  const { students, fetchStudents, isLoading: studentsLoading } = useStudents({ skip: true });
  const { classes, isLoading: classesLoading } = useClasses();

  // Fetch students when class changes
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents({ classId: selectedClassId, limit: 500 });
    }
  }, [selectedClassId, fetchStudents]);

  // Filter exams by year
  const filteredExams = exams.filter((e) => !selectedYear || e.academic_year === selectedYear || e.academic_year?.startsWith(selectedYear.slice(0, 4)));

  // Get sections from students
  const sections = [...new Set(students.map((s) => {
    const cls = s.class_id;
    if (typeof cls === "object" && cls) return (cls as any).section || "";
    return "";
  }).filter(Boolean))];

  // Filter students by section
  const sectionStudents = (selectedSection && selectedSection !== "All")
    ? students.filter((s) => {
      const cls = s.class_id;
      if (typeof cls === "object" && cls) return (cls as any).section === selectedSection;
      return false;
    })
    : students;

  const filteredStudents = sectionStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.roll_no || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedTemplate = RC_TEMPLATES.find((t) => t.id === templateId) || RC_TEMPLATES[0];

  // ── Generate Report Cards ──────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const exam = exams.find((e) => e._id === selectedExamId);
      const cls = classes.find((c) => c._id === selectedClassId);
      const template = RC_TEMPLATES.find((t) => t.id === templateId)!;

      // Determine which students to generate for
      const targetStudents: ApiStudent[] = studentMode === "all"
        ? sectionStudents
        : sectionStudents.filter((s) => selectedStudentIds.includes(s._id));

      if (targetStudents.length === 0) {
        alert("No students selected.");
        setIsGenerating(false);
        return;
      }

      // Fetch results for this exam
      const params = new URLSearchParams({ exam_id: selectedExamId, limit: "1000" });
      const res = await fetch(`/api/results?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      const allResults: any[] = data.success ? data.data.results : [];

      const documentIds: string[] = [];
      const studentIds: string[] = [];

      // For each student, create a document with auto-filled data
      for (const student of targetStudents) {
        const studentResults = allResults.filter((r) => resolveId(r.student_id) === student._id);
        const subjects = studentResults.map((r) => {
          const obtained = r.marks_obtained ?? 0;
          const total = r.total_marks ?? 100;
          const pct = total > 0 ? Math.round((obtained / total) * 100) : 0;
          return {
            name: resolveName(r.subject_id, "Subject"),
            maxMarks: total,
            marksObtained: obtained,
            grade: getGrade(pct),
            status: (r.is_pass ?? obtained >= PASS_MARK) ? "Pass" : "Fail",
          };
        });

        const totalObtained = subjects.reduce((a, s) => a + s.marksObtained, 0);
        const totalMax = subjects.reduce((a, s) => a + s.maxMarks, 0);
        const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
        const failed = subjects.some((s) => s.status === "Fail");
        const grade = getGrade(pct);

        // Variable map for placeholder replacement
        const vars: Record<string, string> = {
          student_name: student.name,
          father_name: student.father_name || student.guardian_name || "",
          mother_name: student.mother_name || "",
          admission_number: student.admission_no || "",
          roll_number: student.roll_no || "",
          class: typeof student.class_id === "object" ? (student.class_id as any).name || cls?.name || "" : cls?.name || "",
          section: selectedSection,
          school_name: "MySchoolLife Academy",
          current_date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
          current_time: new Date().toLocaleTimeString(),
          teacher_name: "",
          rc_exam_name: exam?.name || exam?.title || "",
          rc_academic_year: selectedYear,
          rc_percentage: `${pct}`,
          rc_grade: grade,
          rc_rank: "—",
          rc_result_status: failed ? "Fail" : "Pass",
          rc_total_marks: String(totalMax),
          rc_obtained_marks: String(totalObtained),
          rc_teacher_remarks: "Good performance. Keep it up.",
          rc_principal_remarks: "Promoted to next class.",
          rc_principal_name: "Principal",
          rc_published_date: new Date().toLocaleDateString("en-GB"),

          // New mapped variables for full support of the requested list
          school_logo: "/logo.png",
          student_photo: student.photo_url || "/sample-student.jpg",
          exam_name: exam?.name || exam?.title || "",
          academic_year: selectedYear,
          total_marks: String(totalMax),
          obtained_marks: String(totalObtained),
          percentage: `${pct}`,
          overall_grade: grade,
          rank: "—",
          result_status: failed ? "Fail" : "Pass",
          teacher_remarks: "Good performance. Keep it up.",
          principal_remarks: "Promoted to next class.",
          generated_date: new Date().toLocaleDateString("en-GB"),
        };

        // Deep-clone template pages and auto-fill
        const templatePages: CanvasPage[] = JSON.parse(JSON.stringify(template.defaultPages));
        const filledPages = applyReportCardData(templatePages, vars, subjects, enablePracticalInternal);

        // Create document in the Document Builder store
        const doc = createDocument(
          `Report Card — ${student.name} — ${exam?.name || ""}`,
          "report_card",
          templateId,
          user?.name || "system",
          filledPages,
          template.pageSize,
          template.orientation
        );

        documentIds.push(doc.id);
        studentIds.push(student._id);
      }

      // Save the batch
      const batch = saveReportCardBatch({
        id: crypto.randomUUID(),
        examId: selectedExamId,
        examName: exam?.name || exam?.title || "",
        classId: selectedClassId,
        className: cls?.name || "",
        section: selectedSection,
        academicYear: selectedYear,
        templateId,
        templateName: template.name,
        studentIds,
        documentIds,
        status: "draft",
        createdAt: new Date().toISOString(),
        createdBy: user?.name || "system",
      });

      setGeneratedBatchId(batch.id);
      setStep(7);
    } catch (err) {
      console.error("Error generating report cards:", err);
      alert("Failed to generate report cards. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [exams, classes, sectionStudents, selectedStudentIds, studentMode, selectedExamId, selectedClassId, selectedSection, selectedYear, templateId, user, enablePracticalInternal]);

  const canProceed = (): boolean => {
    if (step === 1) return !!selectedYear;
    if (step === 2) return !!selectedExamId;
    if (step === 3) return !!selectedClassId;
    if (step === 4) return !!selectedSection;
    if (step === 5) return studentMode === "all" || selectedStudentIds.length > 0;
    if (step === 6) return !!templateId;
    return true;
  };

  const targetCount = studentMode === "all"
    ? sectionStudents.length
    : selectedStudentIds.length;

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </span>
          Generate Report Cards
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 ml-12">
          All data is automatically pulled from the Exam Module — no manual entry required
        </p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-[12px] font-semibold transition-all cursor-default ${step === s.id
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                    : step > s.id
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${step > s.id ? "bg-emerald-500 text-white" : step === s.id ? "bg-amber-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                  }`}>
                  {step > s.id ? <Check className="w-3 h-3" /> : s.id}
                </div>
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm min-h-[400px]">

        {/* Step 1: Academic Year */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Select Academic Year</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
              {ACADEMIC_YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`py-4 rounded-xl border-2 text-[14px] font-bold transition-all cursor-pointer ${selectedYear === y
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50"
                    }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Exam */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Select Exam</h2>
            {examsLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading exams…</div>
            ) : filteredExams.length === 0 ? (
              <p className="text-[13px] text-slate-400 py-8 text-center">No published exams found for {selectedYear}.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredExams.map((ex) => (
                  <button
                    key={ex._id}
                    onClick={() => setSelectedExamId(ex._id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedExamId === ex._id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 bg-white dark:bg-slate-800"
                      }`}
                  >
                    <p className="font-bold text-[14px] text-slate-800 dark:text-slate-100">{ex.name || ex.title}</p>
                    <p className="text-[12px] text-slate-400 mt-1">{ex.type?.replace(/_/g, " ")} · {ex.academic_year}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Class */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Select Class</h2>
            {classesLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading classes…</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {classes.map((cls) => (
                  <button
                    key={cls._id}
                    onClick={() => setSelectedClassId(cls._id)}
                    className={`py-4 px-3 rounded-xl border-2 text-[14px] font-bold transition-all cursor-pointer ${selectedClassId === cls._id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50"
                      }`}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Section */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Select Section</h2>
            {studentsLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading students…</div>
            ) : sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4 bg-slate-50 dark:bg-slate-800/20 border border-dashed border-border rounded-xl w-full">
                <p className="text-[13px] text-slate-400 text-center font-medium">No sections found. Students may not have sections assigned.</p>
                <button
                  type="button"
                  onClick={() => { setSelectedSection("All"); setStep(5); }}
                  className={`px-6 py-3 rounded-xl border-2 text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${selectedSection === "All"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:shadow"
                    }`}
                >
                  <Check className="w-4 h-4" /> Skip Section Filter (All Students)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {sections.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className={`py-4 rounded-xl border-2 text-[14px] font-bold transition-all cursor-pointer ${selectedSection === sec
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50"
                      }`}
                  >
                    Section {sec}
                  </button>
                ))}
                {/* If no sections, allow "All" */}
                {sections.length === 0 && (
                  <button
                    onClick={() => setSelectedSection("All")}
                    className={`py-4 rounded-xl border-2 text-[14px] font-bold transition-all cursor-pointer ${selectedSection === "All"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : "border-border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300"
                      }`}
                  >
                    All Students
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Students */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Choose Students</h2>

            <div className="flex gap-3 flex-wrap">
              {[
                { value: "all", label: `Entire Class (${sectionStudents.length})`, desc: "Generate for all students" },
                { value: "multiple", label: "Multiple Students", desc: "Select specific students" },
                { value: "single", label: "Single Student", desc: "One student only" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setStudentMode(opt.value as any); setSelectedStudentIds([]); }}
                  className={`flex-1 min-w-[150px] p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${studentMode === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-white dark:bg-slate-800 hover:border-primary/50"
                    }`}
                >
                  <div className="font-bold text-[13px] text-slate-800 dark:text-slate-100">{opt.label}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>

            {(studentMode === "multiple" || studentMode === "single") && (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search students…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full max-w-xs bg-white dark:bg-slate-800 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border border border-border rounded-xl">
                  {filteredStudents.map((s) => {
                    const isSelected = selectedStudentIds.includes(s._id);
                    return (
                      <button
                        key={s._id}
                        onClick={() => {
                          if (studentMode === "single") {
                            setSelectedStudentIds([s._id]);
                          } else {
                            setSelectedStudentIds((prev) =>
                              isSelected ? prev.filter((id) => id !== s._id) : [...prev, s._id]
                            );
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${isSelected ? "bg-amber-50 dark:bg-amber-900/20" : "bg-white dark:bg-slate-900"
                          }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-amber-600 bg-amber-600" : "border-slate-300 dark:border-slate-600"
                          }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                          <p className="text-[11px] text-slate-400">Roll: {s.roll_no || "—"} · Adm: {s.admission_no || "—"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {filteredStudents.length === 0 && (
                  <p className="text-[13px] text-slate-400 py-4 text-center">No students found</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 6: Template */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-amber-500" /> Choose Report Card Template</h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Select a template — it will be opened in the Document Builder with all data pre-filled.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {RC_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`text-left rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${templateId === t.id
                      ? "border-amber-500 shadow-lg shadow-amber-100 dark:shadow-amber-900/20"
                      : "border-border hover:border-amber-300"
                    }`}
                >
                  {/* Template thumbnail */}
                  <div className="h-28 relative flex items-center justify-center" style={{ background: t.thumbnailBg }}>
                    <div className="w-16 h-20 bg-white/10 rounded-sm border border-white/20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white/60" />
                    </div>
                    {templateId === t.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 text-[10px] text-white/60 font-medium">{t.orientation} · {t.pageSize}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900">
                    <p className="font-bold text-[13px] text-slate-800 dark:text-slate-100">{t.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Practical & Internal Assessment Toggle */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-[14px] text-slate-800 dark:text-slate-100">Practical &amp; Internal Assessment Columns</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Enable this to show separate columns for Theory, Practical, and Internal marks in the subject table.</p>
              </div>
              <button
                type="button"
                onClick={() => setEnablePracticalInternal(!enablePracticalInternal)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enablePracticalInternal ? "bg-amber-600" : "bg-slate-200 dark:bg-slate-700"
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enablePracticalInternal ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Done */}
        {step === 7 && (
          <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Report Cards Generated!</h2>
              <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-2">
                {targetCount} report card{targetCount !== 1 ? "s" : ""} have been created and are ready for review.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/report-cards/generated")}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[14px] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" /> View Generated Report Cards
              </button>
              {targetCount === 1 && generatedBatchId && (() => {
                const { getReportCardBatch, getDocument } = require("@/app/components/document-builder/store");
                const batch = getReportCardBatch(generatedBatchId);
                const docId = batch?.documentIds?.[0];
                return docId ? (
                  <button
                    onClick={() => router.push(`/documents/builder/${docId}?reportCardMode=true`)}
                    className="px-6 py-3 bg-white dark:bg-slate-800 border border-border hover:border-amber-400 text-slate-800 dark:text-slate-100 font-bold text-[14px] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Open in Document Builder
                  </button>
                ) : null;
              })()}
              <button
                onClick={() => router.push("/report-cards")}
                className="px-6 py-3 bg-white dark:bg-slate-800 border border-border text-slate-600 dark:text-slate-300 font-semibold text-[14px] rounded-xl transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {step < 7 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.push("/report-cards")}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-300 font-semibold text-[13px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            Step {step} of {STEPS.length}
          </div>

          {step < 6 ? (
            <button
              onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[13px] rounded-xl transition-colors cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canProceed() || isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[13px] rounded-xl transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate {targetCount} Report Card{targetCount !== 1 ? "s" : ""}</>
              )}
            </button>
          )}
        </div>
      )}

    </div>
  );
}
