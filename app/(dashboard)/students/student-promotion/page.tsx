"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, ArrowRightLeft, ChevronDown, Search, ArrowRight, Check, X, RefreshCcw, Printer, Download, Calendar, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { useClasses, ApiClass } from "../../../hooks/useClasses";
import { useStudents, ApiStudent } from "../../../hooks/useStudents";
import { getAuthHeaders } from "@/lib/utils/session";

function StudentPromotionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");

  const { classes, isLoading: classesLoading } = useClasses();
  const { fetchStudents } = useStudents({ skip: true });

  // UI state
  const [isManaging, setIsManaging] = useState(false);
  const [loadingStudentParam, setLoadingStudentParam] = useState(false);
  const [loadingStudentsList, setLoadingStudentsList] = useState(false);
  const [submittingPromotions, setSubmittingPromotions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core configuration states
  const [fromSession, setFromSession] = useState("");
  const [selectedFromClassName, setSelectedFromClassName] = useState("");
  const [selectedFromSectionName, setSelectedFromSectionName] = useState("");
  
  const [promoteToSession, setPromoteToSession] = useState("");
  const [selectedToClassName, setSelectedToClassName] = useState("");
  const [selectedToSectionName, setSelectedToSectionName] = useState("");

  // Data states
  const [studentsList, setStudentsList] = useState<ApiStudent[]>([]);
  const [studentResults, setStudentResults] = useState<Record<string, "Pass" | "Fail" | "N/A">>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [promotionResults, setPromotionResults] = useState<Record<string, "promote" | "no_promote">>({});

  // Unique session list
  const sessions = React.useMemo(() => {
    const years = Array.from(new Set(classes.map(c => c.academic_year))).filter(Boolean).sort();
    return years.length > 0 ? years : ["2024 - 2025", "2025 - 2026"];
  }, [classes]);

  // Suggested academic year increment helper
  const getNextAcademicYear = (yearStr: string) => {
    if (!yearStr) return "2025 - 2026";
    const parts = yearStr.split("-").map(p => p.trim());
    if (parts.length === 2) {
      const y1 = parseInt(parts[0]);
      const y2 = parseInt(parts[1]);
      if (!isNaN(y1) && !isNaN(y2)) {
        return `${y1 + 1} - ${y2 + 1}`;
      }
    }
    return "2025 - 2026";
  };

  // Standard class sequences
  const nextClassMap: Record<string, string> = {
    "I": "II", "II": "III", "III": "IV", "IV": "V", "V": "VI",
    "VI": "VII", "VII": "VIII", "VIII": "IX", "IX": "X",
    "X": "XI", "XI": "XII", "Nursery": "LKG", "LKG": "UKG", "UKG": "I"
  };

  // 1. Initial setup of defaults
  useEffect(() => {
    if (sessions.length > 0 && !fromSession) {
      setFromSession(sessions[0]);
    }
  }, [sessions, fromSession]);

  useEffect(() => {
    if (fromSession && !promoteToSession) {
      setPromoteToSession(getNextAcademicYear(fromSession));
    }
  }, [fromSession, promoteToSession]);

  // Helper to fetch results for a set of students to populate Pass/Fail
  const fetchResultsForStudents = async (students: ApiStudent[]) => {
    const resultsMap: Record<string, "Pass" | "Fail" | "N/A"> = {};
    try {
      await Promise.all(students.map(async (s) => {
        const res = await fetch(`/api/results?student_id=${s._id}`, {
          headers: getAuthHeaders()
        });
        const json = await res.json();
        if (json.success && json.data?.results) {
          const resList = json.data.results;
          if (resList.length === 0) {
            resultsMap[s._id] = "Pass"; // Default to Pass if no results are recorded
          } else {
            const hasFailed = resList.some((r: any) => r.is_pass === false || (r.passing_marks && r.marks_obtained < r.passing_marks));
            resultsMap[s._id] = hasFailed ? "Fail" : "Pass";
          }
        } else {
          resultsMap[s._id] = "Pass";
        }
      }));
      setStudentResults(resultsMap);

      // Default promotion mappings
      const initialPromotions: Record<string, "promote" | "no_promote"> = {};
      students.forEach(s => {
        initialPromotions[s._id] = resultsMap[s._id] === "Fail" ? "no_promote" : "promote";
      });
      setPromotionResults(initialPromotions);
    } catch (err) {
      console.error("Error fetching student results", err);
    }
  };

  // 2. Individual student load from URL param ?studentId=...
  useEffect(() => {
    async function loadIndividualStudent() {
      if (!studentIdParam || classes.length === 0) return;
      setLoadingStudentParam(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/students/${studentIdParam}`, {
          headers: getAuthHeaders()
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to fetch student details");
        }

        const student = json.data as ApiStudent;
        setStudentsList([student]);
        setSelectedStudentIds([student._id]);

        // Extract student's current class details
        if (student.class_id && typeof student.class_id === "object") {
          const currentClass = student.class_id as { _id: string; name: string; section: string };
          setSelectedFromClassName(currentClass.name);
          setSelectedFromSectionName(currentClass.section);

          // Suggest next class and session
          const nextName = nextClassMap[currentClass.name] || currentClass.name;
          setSelectedToClassName(nextName);
          setSelectedToSectionName(currentClass.section);
        }

        if (student.academic_year) {
          setFromSession(student.academic_year);
          setPromoteToSession(getNextAcademicYear(student.academic_year));
        }

        // Fetch their results
        await fetchResultsForStudents([student]);
        setIsManaging(true);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load individual student for promotion.");
      } finally {
        setLoadingStudentParam(false);
      }
    }
    loadIndividualStudent();
  }, [studentIdParam, classes]);

  // Derived filter options for From selection
  const classesInFromSession = React.useMemo(() => {
    return classes.filter(c => c.academic_year === fromSession);
  }, [classes, fromSession]);

  const uniqueClassNamesFrom = React.useMemo(() => {
    return Array.from(new Set(classesInFromSession.map(c => c.name))).sort();
  }, [classesInFromSession]);

  const sectionsInFromClass = React.useMemo(() => {
    return classesInFromSession
      .filter(c => c.name === selectedFromClassName)
      .map(c => c.section)
      .sort();
  }, [classesInFromSession, selectedFromClassName]);

  // Initialize class name and section defaults for From select when session changes
  useEffect(() => {
    if (studentIdParam) return; // Locked when individual student is passed
    if (uniqueClassNamesFrom.length > 0 && !uniqueClassNamesFrom.includes(selectedFromClassName)) {
      setSelectedFromClassName(uniqueClassNamesFrom[0]);
    }
  }, [uniqueClassNamesFrom, selectedFromClassName, studentIdParam]);

  useEffect(() => {
    if (studentIdParam) return;
    if (sectionsInFromClass.length > 0 && !sectionsInFromClass.includes(selectedFromSectionName)) {
      setSelectedFromSectionName(sectionsInFromClass[0]);
    }
  }, [sectionsInFromClass, selectedFromSectionName, studentIdParam]);

  // Derived filter options for To selection
  const uniqueClassNamesTo = React.useMemo(() => {
    const yearsClasses = classes.filter(c => c.academic_year === promoteToSession);
    const names = Array.from(new Set(yearsClasses.map(c => c.name))).sort();
    return names.length > 0 ? names : Array.from(new Set(classes.map(c => c.name))).sort();
  }, [classes, promoteToSession]);

  const sectionsInToClass = React.useMemo(() => {
    const yearsClasses = classes.filter(c => c.academic_year === promoteToSession);
    const filterClasses = yearsClasses.length > 0 ? yearsClasses : classes;
    return filterClasses
      .filter(c => c.name === selectedToClassName)
      .map(c => c.section)
      .sort();
  }, [classes, promoteToSession, selectedToClassName]);

  // Initialize To selections when target changes or From selections change
  useEffect(() => {
    if (studentIdParam) return;
    if (selectedFromClassName && !selectedToClassName) {
      const nextName = nextClassMap[selectedFromClassName] || selectedFromClassName;
      setSelectedToClassName(nextName);
    }
  }, [selectedFromClassName, selectedToClassName, studentIdParam]);

  useEffect(() => {
    if (studentIdParam) return;
    if (uniqueClassNamesTo.length > 0 && !uniqueClassNamesTo.includes(selectedToClassName)) {
      setSelectedToClassName(uniqueClassNamesTo[0]);
    }
  }, [uniqueClassNamesTo, selectedToClassName, studentIdParam]);

  useEffect(() => {
    if (studentIdParam) return;
    if (sectionsInToClass.length > 0 && !sectionsInToClass.includes(selectedToSectionName)) {
      setSelectedToSectionName(sectionsInToClass[0]);
    }
  }, [sectionsInToClass, selectedToSectionName, studentIdParam]);

  // Handle Manage Promotion - loads students in selected class/section
  const handleManagePromotion = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Find current class document ID
    const fromClass = classes.find(c => c.name === selectedFromClassName && c.section === selectedFromSectionName && c.academic_year === fromSession);
    if (!fromClass) {
      setErrorMessage("The selected source class and section was not found in the database. Please verify your selections.");
      return;
    }

    setLoadingStudentsList(true);
    try {
      const res = await fetchStudents({ classId: fromClass._id, limit: 500 });
      if (res && res.students) {
        setStudentsList(res.students);
        setSelectedStudentIds((res.students as ApiStudent[]).map((s: ApiStudent) => s._id)); // check all by default
        await fetchResultsForStudents(res.students);
        setIsManaging(true);
      } else {
        setStudentsList([]);
        setErrorMessage("No students found in this class.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch students list.");
    } finally {
      setLoadingStudentsList(false);
    }
  };

  // Reset promotions configuration
  const handleResetPromotion = () => {
    if (studentIdParam) {
      router.push("/students/student-promotion");
    } else {
      setIsManaging(false);
      setStudentsList([]);
      setSelectedStudentIds([]);
      setPromotionResults({});
      setStudentResults({});
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  // Handle Promoting Checked Students
  const handlePromoteStudents = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedStudentIds.length === 0) {
      setErrorMessage("Please select at least one student to promote.");
      return;
    }

    // Resolve target classes
    const targetClass = classes.find(c => c.name === selectedToClassName && c.section === selectedToSectionName && c.academic_year === promoteToSession);
    const repeatClasses: Record<string, ApiClass | undefined> = {};

    // Build the promotions payload
    const promotionsPayload: Array<{ studentId: string; classId: string; academicYear: string }> = [];

    for (const studentId of selectedStudentIds) {
      const action = promotionResults[studentId] || "promote";
      const student = studentsList.find(s => s._id === studentId);
      if (!student) continue;

      if (action === "promote") {
        if (!targetClass) {
          setErrorMessage(`The target class '${selectedToClassName} - ${selectedToSectionName}' does not exist for session '${promoteToSession}'. Please go to Classes settings to create it first.`);
          return;
        }
        promotionsPayload.push({
          studentId,
          classId: targetClass._id,
          academicYear: promoteToSession
        });
      } else {
        // "no_promote" (repeats). Find class matching current name and section for the NEW session
        const currentClassName = typeof student.class_id === "object" ? student.class_id.name : selectedFromClassName;
        const currentSectionName = typeof student.class_id === "object" ? student.class_id.section : selectedFromSectionName;

        let repeatClass = classes.find(c => c.name === currentClassName && c.section === currentSectionName && c.academic_year === promoteToSession);

        if (!repeatClass) {
          // Fallback to same class document if next year's repeating class is not created (to avoid errors)
          const fallbackId = typeof student.class_id === "object" ? student.class_id._id : student.class_id;
          promotionsPayload.push({
            studentId,
            classId: typeof fallbackId === "string" ? fallbackId : (fallbackId as any)._id,
            academicYear: promoteToSession
          });
        } else {
          promotionsPayload.push({
            studentId,
            classId: repeatClass._id,
            academicYear: promoteToSession
          });
        }
      }
    }

    setSubmittingPromotions(true);
    try {
      const res = await fetch("/api/students/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ promotions: promotionsPayload })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to promote students");
      }

      setSuccessMessage(data.message || "Students promoted successfully!");
      
      // If we came from an individual student view, let's redirect them back to the student details after 2 seconds
      if (studentIdParam) {
        setTimeout(() => {
          router.push(`/students/${studentIdParam}`);
        }, 1500);
      } else {
        // Refresh table by running manage promotion again
        setTimeout(() => {
          handleManagePromotion();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to promote students.");
    } finally {
      setSubmittingPromotions(false);
    }
  };

  const handleCheckboxAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(studentsList.map(s => s._id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleCheckboxSingle = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(prev => [...prev, id]);
    } else {
      setSelectedStudentIds(prev => prev.filter(item => item !== id));
    }
  };

  const getStudentClassDetails = (student: ApiStudent) => {
    if (typeof student.class_id === "object" && student.class_id) {
      return `${student.class_id.name} - ${student.class_id.section}`;
    }
    // Fallback search
    const found = classes.find(c => c._id === student.class_id);
    return found ? `${found.name} - ${found.section}` : "N/A";
  };

  const getStudentAvatar = (student: ApiStudent) => {
    if (student.photo_url) return student.photo_url;
    return student.gender === "female" ? "/asset 12.webp" : "/asset 14.webp";
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Promotion</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/students" className="hover:text-primary transition-colors">Students</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Student Promotion</span>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3.5 text-[13px] text-amber-800 dark:text-amber-300">
        <Info className="w-4.5 h-4.5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p>
          <span className="font-bold">Note: </span>
          Promoting a student from their current class to the next class will create an enrollment in the selected target session. 
          If a student repeats the class, they will remain in the same class level but get registered for the target session.
        </p>
      </div>

      {/* Loading states / Errors */}
      {loadingStudentParam && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-8 flex items-center justify-center gap-3 text-slate-500 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Fetching student details...</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg p-4 text-[13px] text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="font-semibold text-left">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4 text-[13px] text-emerald-800 dark:text-emerald-300">
          <Check className="w-4.5 h-4.5 mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="font-semibold text-left">{successMessage}</div>
        </div>
      )}

      {(!studentIdParam || !loadingStudentParam) && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Promotion Configuration</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">Define academic sessions and classes for promotion mapping</p>
          </div>

          <div className="p-5">
            <div className="flex flex-col lg:flex-row items-center gap-8 relative">

              {/* Left Side (Source Class) */}
              <div className="flex-1 w-full border border-slate-100 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/20 text-left">
                <div className="mb-5">
                  <label className="text-[13px] font-bold text-slate-900 dark:text-white block mb-1">
                    Current Session <span className="text-red-500">*</span>
                  </label>
                  {studentIdParam ? (
                    <p className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-2 border border-border rounded-lg max-w-xs">{fromSession}</p>
                  ) : (
                    <select
                      value={fromSession}
                      onChange={(e) => {
                        setFromSession(e.target.value);
                        setPromoteToSession(getNextAcademicYear(e.target.value));
                      }}
                      className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer w-full max-w-xs"
                    >
                      {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">Promotion From <span className="text-red-500">*</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-slate-600 dark:text-slate-400">Class</label>
                      {studentIdParam ? (
                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3.5 py-2.5 border border-border rounded-lg">{selectedFromClassName}</p>
                      ) : (
                        <select
                          value={selectedFromClassName}
                          onChange={(e) => setSelectedFromClassName(e.target.value)}
                          className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                        >
                          {uniqueClassNamesFrom.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-slate-600 dark:text-slate-400">Section</label>
                      {studentIdParam ? (
                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3.5 py-2.5 border border-border rounded-lg">{selectedFromSectionName}</p>
                      ) : (
                        <select
                          value={selectedFromSectionName}
                          onChange={(e) => setSelectedFromSectionName(e.target.value)}
                          className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                        >
                          {sectionsInFromClass.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Swap/Transfer Visual Icon */}
              <div className="hidden lg:flex shrink-0 w-12 h-12 rounded-xl bg-primary text-white items-center justify-center shadow-lg transform -mx-4 z-10">
                <ArrowRightLeft className="w-5 h-5" />
              </div>

              {/* Right Side (Target Class) */}
              <div className="flex-1 w-full border border-slate-100 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/20 text-left">
                <div className="mb-5">
                  <label className="text-[13px] font-bold text-slate-900 dark:text-white block mb-1">
                    Promote to Session <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={promoteToSession}
                    onChange={(e) => setPromoteToSession(e.target.value)}
                    className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer w-full max-w-xs"
                  >
                    <option value={getNextAcademicYear(fromSession)}>{getNextAcademicYear(fromSession)} (Suggested)</option>
                    {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">Promotion To <span className="text-red-500">*</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-slate-600 dark:text-slate-400">Class</label>
                      <select
                        value={selectedToClassName}
                        onChange={(e) => setSelectedToClassName(e.target.value)}
                        className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                      >
                        {uniqueClassNamesTo.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-slate-600 dark:text-slate-400">Section</label>
                      <select
                        value={selectedToSectionName}
                        onChange={(e) => setSelectedToSectionName(e.target.value)}
                        className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                      >
                        {sectionsInToClass.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Warning for Target Class */}
            {promoteToSession && selectedToClassName && selectedToSectionName && (
              <div className="mt-4">
                {!classes.some(c => c.name === selectedToClassName && c.section === selectedToSectionName && c.academic_year === promoteToSession) && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-amber-700 dark:text-amber-300 text-[12.5px]">
                    <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Target Class <strong>{selectedToClassName} - {selectedToSectionName}</strong> does not exist in database for session <strong>{promoteToSession}</strong> yet. You will need to create it before finalizing promotion.
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={handleResetPromotion}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {studentIdParam ? "Cancel & Exit" : "Reset Promotion"}
              </button>
              {!studentIdParam && (
                <button
                  onClick={handleManagePromotion}
                  disabled={loadingStudentsList || classesLoading}
                  className="px-6 py-2.5 rounded-lg text-[13px] font-bold text-white bg-primary hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingStudentsList && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Manage Promotion</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isManaging && studentsList.length > 0 && (
        <>
          {/* Map Class Sections Card */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Map Class Sections Summary</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">Verify old class vs new target class mapping</p>
            </div>
            <div className="p-5">
              <div className="flex flex-col lg:flex-row items-center gap-8 relative">
                {/* Left */}
                <div className="flex-1 w-full border border-slate-100 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="mb-4">
                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400">From Class & Session</h4>
                    <p className="text-[15px] text-slate-700 dark:text-slate-200 mt-1 font-semibold">{selectedFromClassName} - {selectedFromSectionName} ({fromSession})</p>
                  </div>
                </div>

                {/* Swap Icon */}
                <div className="hidden lg:flex shrink-0 w-10 h-10 rounded-full bg-primary text-white items-center justify-center shadow-md transform -mx-4 z-10">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>

                {/* Right */}
                <div className="flex-1 w-full border border-slate-100 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/20">
                  <div>
                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Promote To Class & Session</h4>
                    <p className="text-[15px] text-primary mt-1 font-semibold">{selectedToClassName} - {selectedToSectionName} ({promoteToSession})</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Students List Table */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Active Students List</h3>
                <p className="text-[12.5px] text-slate-500 mt-0.5">Showing {studentsList.length} students</p>
              </div>
            </div>

            <div className="overflow-x-auto min-h-[250px]">
              <table className="w-full border-collapse text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border text-[12px] font-bold text-slate-700 dark:text-slate-200">
                    <th className="px-5 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.length === studentsList.length && studentsList.length > 0}
                        onChange={(e) => handleCheckboxAll(e.target.checked)}
                        className="rounded border-slate-300 w-4 h-4 accent-primary cursor-pointer"
                      />
                    </th>
                    <th className="px-5 py-4">Admission No</th>
                    <th className="px-5 py-4">Roll No</th>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Current Class</th>
                    <th className="px-5 py-4">Exam Result</th>
                    <th className="px-5 py-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-[13px]">
                  {studentsList.map(s => (
                    <tr key={s._id} className="hover:bg-slate-50/50 dark:bg-slate-800/50 transition-colors group">
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s._id)}
                          onChange={(e) => handleCheckboxSingle(s._id, e.target.checked)}
                          className="rounded border-slate-300 w-4 h-4 accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-3 font-semibold text-primary">
                        {s.admission_no || `AD${s._id.slice(-6).toUpperCase()}`}
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{s.roll_no || "-"}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <img src={getStudentAvatar(s)} className="w-8 h-8 rounded-full object-cover shadow-sm border border-border" alt="Avatar" />
                          <span className="font-semibold text-slate-900 dark:text-white">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{getStudentClassDetails(s)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          (studentResults[s._id] || "Pass") === 'Pass'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                        } flex items-center gap-1.5 w-max`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            (studentResults[s._id] || "Pass") === 'Pass' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span> {studentResults[s._id] || "Pass"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={promotionResults[s._id] || "promote"}
                            onChange={(e) => setPromotionResults(prev => ({ ...prev, [s._id]: e.target.value as "promote" | "no_promote" }))}
                            className="border border-border rounded px-2.5 py-1 text-[12px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none w-full sm:w-[170px] cursor-pointer focus:border-primary/50"
                          >
                            <option value="promote">Promote to {selectedToClassName}</option>
                            <option value="no_promote">No Promotion (Repeat)</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-border flex flex-col items-center justify-center gap-4 bg-slate-50/30 dark:bg-slate-800/10">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
                Selected {selectedStudentIds.length} student(s) will be processed for the <strong>{promoteToSession}</strong> academic session
              </p>
              <button
                onClick={handlePromoteStudents}
                disabled={submittingPromotions}
                className="px-8 py-2.5 rounded-lg text-[14px] font-bold text-white bg-primary hover:bg-amber-600 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {submittingPromotions && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Promote Students</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function StudentPromotionPage() {
  return (
    <Suspense fallback={
      <div className="p-6 text-slate-500 flex items-center gap-2 justify-center min-h-[400px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Loading promotion workspace...</span>
      </div>
    }>
      <StudentPromotionContent />
    </Suspense>
  );
}
