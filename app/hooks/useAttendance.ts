"use client";

import { useState, useCallback } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { invalidateCache } from "@/lib/utils/cache-sync";

export interface ApiAttendanceRecord {
  student_id: {
    _id: string;
    name: string;
    roll_no?: string;
  } | string;
  status: "present" | "absent" | "late" | "half_day" | "holiday";
  note?: string;
}

export interface ApiAttendance {
  _id: string;
  school_id: string;
  class_id: string;
  marked_by: string;
  date: string;
  type: "student" | "teacher";
  records: ApiAttendanceRecord[];
}

export function useAttendance() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async (classId: string, date: string): Promise<ApiAttendance | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance?classId=${classId}&date=${date}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch attendance");
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveAttendance = async (
    classId: string,
    date: string,
    records: { studentId: string; status: string; note?: string }[]
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ classId, date, records }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save attendance");
      invalidateCache("attendance");
      return { success: true, message: data.message || "Saved successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save attendance";
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    fetchAttendance,
    saveAttendance,
  };
}
