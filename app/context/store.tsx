"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/utils/session";

export type Role = "admin" | "teacher" | "student";

// ── Stable empty arrays — never change reference, preventing useMemo churn ──
// Legacy consumers that still destructure these from context get a stable []
// instead of a new array on every render.
const EMPTY_ARR: never[] = [];
const EMPTY_OBJ = {} as Record<string, never>;

// ── Legacy type exports (kept for backward-compat with any stale import) ──
export interface Student { id: string; name: string; email: string; classId: string; rollNo: string; status: "Active" | "Inactive"; joinedDate: string; parentName: string; parentContact: string; }
export interface Teacher { id: string; name: string; email: string; subject: string; classId: string; joinedDate: string; status: "Active" | "Inactive"; }
export interface SchoolClass { id: string; name: string; room: string; teacherId: string; subjects: string[]; }
export interface AttendanceRecord { date: string; status: "Present" | "Absent" | "Late"; }
export interface AttendanceStore { [studentId: string]: { [date: string]: "Present" | "Absent" | "Late"; }; }
export interface HomeworkSubmission { studentId: string; submittedAt: string; content: string; grade?: string; feedback?: string; }
export interface Homework { id: string; title: string; description: string; classId: string; subject: string; assignedDate: string; dueDate: string; submissions: HomeworkSubmission[]; }
export interface Grade { id: string; studentId: string; subject: string; examName: string; score: number; maxScore: number; date: string; }
export interface FeeInvoice { id: string; studentId: string; title: string; amount: number; dueDate: string; status: "Paid" | "Unpaid" | "Overdue"; paidDate?: string; }
export interface Notice { id: string; title: string; content: string; target: "All" | "Teachers" | "Students"; date: string; type: "Announcement" | "Alert" | "Event"; author: string; }

// ── The real context — only the fields that are actually read by consumers ──
interface AppContextType {
  activeRole: Role;
  setRole: (role: Role) => void;
  academicYear: string;
  setAcademicYear: (year: string) => void;

  // ── Legacy stubs — kept for backward-compat; always return stable empty arrays ──
  // All real data now comes from the specialized API hooks (useStudents, useTeachers, etc.)
  students: Student[];
  teachers: Teacher[];
  classes: SchoolClass[];
  attendance: AttendanceStore;
  homework: Homework[];
  grades: Grade[];
  fees: FeeInvoice[];
  notices: Notice[];
  addStudent: (student: Omit<Student, "id" | "joinedDate">) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  addTeacher: (teacher: Omit<Teacher, "id" | "joinedDate">) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  markAttendance: (date: string, records: { studentId: string; status: "Present" | "Absent" | "Late" }[]) => void;
  addHomework: (hw: Omit<Homework, "id" | "assignedDate" | "submissions">) => void;
  submitHomework: (homeworkId: string, studentId: string, content: string) => void;
  gradeHomework: (homeworkId: string, studentId: string, grade: string, feedback: string) => void;
  addGrade: (grade: Omit<Grade, "id" | "date">) => void;
  payFee: (feeId: string) => void;
  addFeeInvoice: (invoice: Omit<FeeInvoice, "id" | "status">) => void;
  addNotice: (notice: Omit<Notice, "id" | "date" | "author">) => void;
  deleteNotice: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Stable no-op stubs — defined once at module level, never recreated ──
const noop = () => {};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeRole, setActiveRole] = useState<Role>("admin");
  const [academicYear, setAcademicYearState] = useState<string>("2026-2027");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load lightweight prefs from localStorage (role + academic year only)
  useEffect(() => {
    try {
      const storedRole = localStorage.getItem("sm_role");
      const storedYear = localStorage.getItem("sm_academic_year");
      if (storedRole) setActiveRole(storedRole as Role);
      if (storedYear) setAcademicYearState(storedYear);
    } catch (e) {
      console.error("Failed to load local state", e);
    }
    setIsLoaded(true);
  }, []);

  // ── Persist only lightweight UI preferences to localStorage ──
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("sm_role", activeRole);
        localStorage.setItem("sm_academic_year", academicYear);
      } catch (e) {
        console.error("Failed to persist local state", e);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isLoaded, activeRole, academicYear]);

  const setRole = useCallback((role: Role) => setActiveRole(role), []);
  const setAcademicYear = useCallback((year: string) => setAcademicYearState(year), []);

  // ── Context value — only re-creates when role or year actually changes ──
  // All 8 legacy entity arrays are stable module-level constants — they
  // never change reference, so the memo only fires for real state changes.
  const contextValue = useMemo<AppContextType>(() => ({
    activeRole,
    setRole,
    academicYear,
    setAcademicYear,
    // Legacy stubs — stable references, no re-renders
    students: EMPTY_ARR as unknown as Student[],
    teachers: EMPTY_ARR as unknown as Teacher[],
    classes: EMPTY_ARR as unknown as SchoolClass[],
    attendance: EMPTY_OBJ as unknown as AttendanceStore,
    homework: EMPTY_ARR as unknown as Homework[],
    grades: EMPTY_ARR as unknown as Grade[],
    fees: EMPTY_ARR as unknown as FeeInvoice[],
    notices: EMPTY_ARR as unknown as Notice[],
    addStudent: noop,
    updateStudent: noop,
    deleteStudent: noop,
    addTeacher: noop,
    updateTeacher: noop,
    deleteTeacher: noop,
    markAttendance: noop,
    addHomework: noop,
    submitHomework: noop,
    gradeHomework: noop,
    addGrade: noop,
    payFee: noop,
    addFeeInvoice: noop,
    addNotice: noop,
    deleteNotice: noop,
  }), [activeRole, academicYear, setRole, setAcademicYear]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context;
}
