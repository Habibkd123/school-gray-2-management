"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/utils/session";

export type Role = "admin" | "teacher" | "student";

export interface Student {
  id: string;
  name: string;
  email: string;
  classId: string; // e.g. "10a"
  rollNo: string;
  status: "Active" | "Inactive";
  joinedDate: string;
  parentName: string;
  parentContact: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  classId: string; // class teacher of this class
  joinedDate: string;
  status: "Active" | "Inactive";
}

export interface SchoolClass {
  id: string;
  name: string;
  room: string;
  teacherId: string;
  subjects: string[];
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent" | "Late";
}

export interface AttendanceStore {
  [studentId: string]: {
    [date: string]: "Present" | "Absent" | "Late";
  };
}

export interface HomeworkSubmission {
  studentId: string;
  submittedAt: string;
  content: string;
  grade?: string; // A, B, C, D, F, or score
  feedback?: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  classId: string;
  subject: string;
  assignedDate: string;
  dueDate: string;
  submissions: HomeworkSubmission[];
}

export interface Grade {
  id: string;
  studentId: string;
  subject: string;
  examName: string; // e.g. "Mid-Term", "Final"
  score: number;
  maxScore: number;
  date: string;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  title: string;
  amount: number;
  dueDate: string;
  status: "Paid" | "Unpaid" | "Overdue";
  paidDate?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  target: "All" | "Teachers" | "Students";
  date: string;
  type: "Announcement" | "Alert" | "Event";
  author: string;
}

interface AppState {
  activeRole: Role;
  students: Student[];
  teachers: Teacher[];
  classes: SchoolClass[];
  attendance: AttendanceStore;
  homework: Homework[];
  grades: Grade[];
  fees: FeeInvoice[];
  notices: Notice[];
  academicYear: string;
}

interface AppContextType extends AppState {
  setRole: (role: Role) => void;
  setAcademicYear: (year: string) => void;
  // Students
  addStudent: (student: Omit<Student, "id" | "joinedDate">) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  // Teachers
  addTeacher: (teacher: Omit<Teacher, "id" | "joinedDate">) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  // Attendance
  markAttendance: (date: string, records: { studentId: string; status: "Present" | "Absent" | "Late" }[]) => void;
  // Homework
  addHomework: (hw: Omit<Homework, "id" | "assignedDate" | "submissions">) => void;
  submitHomework: (homeworkId: string, studentId: string, content: string) => void;
  gradeHomework: (homeworkId: string, studentId: string, grade: string, feedback: string) => void;
  // Grades
  addGrade: (grade: Omit<Grade, "id" | "date">) => void;
  // Fees
  payFee: (feeId: string) => void;
  addFeeInvoice: (invoice: Omit<FeeInvoice, "id" | "status">) => void;
  // Notices
  addNotice: (notice: Omit<Notice, "id" | "date" | "author">) => void;
  deleteNotice: (id: string) => void;
}

// ── Mock defaults removed — all data now served from the real API/DB ──
// Empty arrays prevent unnecessary localStorage serialization on every render.
const defaultStudents: Student[]      = [];
const defaultTeachers: Teacher[]      = [];
const defaultClasses: SchoolClass[]   = [];
const defaultAttendance: AttendanceStore = {};
const defaultHomework: Homework[]     = [];
const defaultGrades: Grade[]          = [];
const defaultFees: FeeInvoice[]       = [];
const defaultNotices: Notice[]        = [];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeRole, setActiveRole] = useState<Role>("admin");
  const [academicYear, setAcademicYearState] = useState<string>("2026-2027");
  const [students, setStudents] = useState<Student[]>(defaultStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(defaultTeachers);
  const [classes, setClasses] = useState<SchoolClass[]>(defaultClasses);
  const [attendance, setAttendance] = useState<AttendanceStore>(defaultAttendance);
  const [homework, setHomework] = useState<Homework[]>(defaultHomework);
  const [grades, setGrades] = useState<Grade[]>(defaultGrades);
  const [fees, setFees] = useState<FeeInvoice[]>(defaultFees);
  const [notices, setNotices] = useState<Notice[]>(defaultNotices);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load lightweight prefs from localStorage (role + academic year only)
  useEffect(() => {
    try {
      const storedRole = localStorage.getItem("sm_role");
      const storedYear = localStorage.getItem("sm_academic_year");

      if (storedRole) setActiveRole(storedRole as Role);
      // Restore stored year — header will auto-correct if not present in DB
      if (storedYear) setAcademicYearState(storedYear);
    } catch (e) {
      console.error("Failed to load local state", e);
    }
    setIsLoaded(true);
  }, []);

  // NOTE: Teachers are no longer fetched here.
  // useTeachers() has a module-level cache; fetching here was a duplicate request.

  // ── Persist only lightweight UI preferences to localStorage ──────
  // The bulk collections (students, teachers, etc.) are served from the
  // real API, so we only save the two prefs that the header needs.
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

  // Actions
  const setRole = useCallback((role: Role) => setActiveRole(role), []);
  const setAcademicYear = useCallback((year: string) => setAcademicYearState(year), []);

  const addStudent = useCallback((student: Omit<Student, "id" | "joinedDate">) => {
    const newStudent: Student = {
      ...student,
      id: `s${Date.now()}`,
      joinedDate: new Date().toISOString().split("T")[0]
    };
    setStudents((prev) => [...prev, newStudent]);
  }, []);

  const updateStudent = useCallback((updatedStudent: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
  }, []);

  const deleteStudent = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addTeacher = useCallback((teacher: Omit<Teacher, "id" | "joinedDate">) => {
    const newTeacher: Teacher = {
      ...teacher,
      id: `t${Date.now()}`,
      joinedDate: new Date().toISOString().split("T")[0]
    };
    setTeachers((prev) => [...prev, newTeacher]);
  }, []);

  const updateTeacher = useCallback((updatedTeacher: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t)));
  }, []);

  const deleteTeacher = useCallback((id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAttendance = useCallback((date: string, records: { studentId: string; status: "Present" | "Absent" | "Late" }[]) => {
    setAttendance((prev) => {
      const updated = { ...prev };
      records.forEach((r) => {
        if (!updated[r.studentId]) {
          updated[r.studentId] = {};
        }
        updated[r.studentId][date] = r.status;
      });
      return updated;
    });
  }, []);

  const addHomework = useCallback((hw: Omit<Homework, "id" | "assignedDate" | "submissions">) => {
    const newHw: Homework = {
      ...hw,
      id: `h${Date.now()}`,
      assignedDate: new Date().toISOString().split("T")[0],
      submissions: []
    };
    setHomework((prev) => [newHw, ...prev]);
  }, []);

  const submitHomework = useCallback((homeworkId: string, studentId: string, content: string) => {
    setHomework((prev) =>
      prev.map((hw) => {
        if (hw.id !== homeworkId) return hw;
        const existingSubIdx = hw.submissions.findIndex((s) => s.studentId === studentId);
        const newSubmission: HomeworkSubmission = {
          studentId,
          submittedAt: new Date().toISOString(),
          content
        };
        const submissions = [...hw.submissions];
        if (existingSubIdx > -1) {
          submissions[existingSubIdx] = newSubmission;
        } else {
          submissions.push(newSubmission);
        }
        return { ...hw, submissions };
      })
    );
  }, []);

  const gradeHomework = useCallback((homeworkId: string, studentId: string, grade: string, feedback: string) => {
    setHomework((prev) =>
      prev.map((hw) => {
        if (hw.id !== homeworkId) return hw;
        const submissions = hw.submissions.map((sub) => {
          if (sub.studentId === studentId) {
            return { ...sub, grade, feedback };
          }
          return sub;
        });
        return { ...hw, submissions };
      })
    );
  }, []);

  const addGrade = useCallback((grade: Omit<Grade, "id" | "date">) => {
    const newGrade: Grade = {
      ...grade,
      id: `g${Date.now()}`,
      date: new Date().toISOString().split("T")[0]
    };
    setGrades((prev) => [...prev, newGrade]);
  }, []);

  const payFee = useCallback((feeId: string) => {
    setFees((prev) =>
      prev.map((f) =>
        f.id === feeId
          ? { ...f, status: "Paid" as const, paidDate: new Date().toISOString().split("T")[0] }
          : f
      )
    );
  }, []);

  const addFeeInvoice = useCallback((invoice: Omit<FeeInvoice, "id" | "status">) => {
    const newInvoice: FeeInvoice = {
      ...invoice,
      id: `f${Date.now()}`,
      status: "Unpaid"
    };
    setFees((prev) => [newInvoice, ...prev]);
  }, []);

  const addNotice = useCallback((notice: Omit<Notice, "id" | "date" | "author">) => {
    const newNotice: Notice = {
      ...notice,
      id: `n${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      author: activeRole === "admin" ? "Administration" : "Principal Office"
    };
    setNotices((prev) => [newNotice, ...prev]);
  }, [activeRole]);

  const deleteNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const contextValue = useMemo(() => ({
    activeRole,
    academicYear,
    students,
    teachers,
    classes,
    attendance,
    homework,
    grades,
    fees,
    notices,
    setRole,
    setAcademicYear,
    addStudent,
    updateStudent,
    deleteStudent,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    markAttendance,
    addHomework,
    submitHomework,
    gradeHomework,
    addGrade,
    payFee,
    addFeeInvoice,
    addNotice,
    deleteNotice
  }), [
    activeRole,
    academicYear,
    students,
    teachers,
    classes,
    attendance,
    homework,
    grades,
    fees,
    notices,
    setRole,
    setAcademicYear,
    addStudent,
    updateStudent,
    deleteStudent,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    markAttendance,
    addHomework,
    submitHomework,
    gradeHomework,
    addGrade,
    payFee,
    addFeeInvoice,
    addNotice,
    deleteNotice
  ]);

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
