"use client";

import { useState, useCallback } from "react";
import { getAuthHeaders } from "@/lib/utils/session";

export interface TeacherAttendanceRecord {
  teacher_id: { _id: string; name: string; employee_id?: string };
  status: "present" | "absent" | "leave" | "late" | "half_day" | "holiday";
  note?: string;
}

export interface TeacherAttendanceData {
  _id: string;
  school_id: string;
  academic_year: string;
  date: string;
  records: TeacherAttendanceRecord[];
}

export function useTeacherAttendance() {
  const [attendance, setAttendance] = useState<TeacherAttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async (params: {
    academic_year: string;
    date: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setAttendance(null);
    try {
      const qs = new URLSearchParams();
      qs.set("academic_year", params.academic_year);
      qs.set("date", params.date);

      const res = await fetch(`/api/attendance/teacher?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch");

      if (data.success && data.data) {
        setAttendance(data.data);
      } else {
        setAttendance(null);
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveAttendance = async (input: {
    academic_year: string;
    date: string;
    records: { teacher_id: string; status: string; note?: string }[];
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save attendance");
      }
      setAttendance(data.data);
      return { success: true, message: "Attendance saved successfully" };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  return { attendance, isLoading, error, fetchAttendance, saveAttendance };
}
