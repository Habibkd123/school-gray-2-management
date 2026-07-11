"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface ApiSchedule {
  _id: string;
  school_id: string;
  class_id: {
    _id: string;
    name: string;
    section: string;
  } | string;
  subject_id: {
    _id: string;
    name: string;
  } | string;
  teacher_id: {
    _id: string;
    name: string;
    photo_url?: string;
  } | string;
  day: string; // monday, tuesday, etc.
  start_time: string; // e.g. "09:30 AM"
  end_time: string;
  period_no?: number;
  room?: string;
  academic_year?: string;
  status?: string;
}

export function useSchedules(classId?: string, teacherId?: string, options?: { skip?: boolean }) {
  const [schedules, setSchedules] = useState<ApiSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();

  const fetchSchedules = useCallback(async (cIdOrParams?: string | {
    classId?: string;
    teacherId?: string;
    day?: string;
    academicYear?: string;
    subjectId?: string;
    room?: string;
    status?: string;
    search?: string;
  }, tId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (typeof cIdOrParams === "string") {
        if (cIdOrParams) query.set("classId", cIdOrParams);
        if (tId) query.set("teacherId", tId);
      } else if (cIdOrParams) {
        Object.entries(cIdOrParams).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            query.set(key, String(val));
          }
        });
      }

      const res = await fetch(`/api/schedules?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch schedules");
      setSchedules(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchSchedules(classId, teacherId);
  }, [fetchSchedules, classId, teacherId, options?.skip, authReady]);

  const createSchedule = async (input: {
    classId: string;
    subject: string;
    teacherId?: string;
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
    academicYear?: string;
    periodNo?: number;
    status?: string;
  }): Promise<{ success: boolean; message: string; data?: ApiSchedule }> => {
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to create schedule" };

      setSchedules((prev) => [...prev, data.data].sort((a, b) => a.day.localeCompare(b.day)));
      return { success: true, message: "Schedule created successfully", data: data.data };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const updateSchedule = async (
    id: string,
    input: Partial<{
      classId: string;
      subject: string;
      teacherId: string;
      day: string;
      startTime: string;
      endTime: string;
      room: string;
      academicYear: string;
      periodNo: number;
      status: string;
    }>
  ): Promise<{ success: boolean; message: string; data?: ApiSchedule }> => {
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to update schedule" };

      setSchedules((prev) => prev.map((s) => (s._id === id ? data.data : s)));
      return { success: true, message: "Schedule updated successfully", data: data.data };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const deleteSchedule = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to delete" };

      setSchedules((prev) => prev.filter((s) => s._id !== id));
      return { success: true, message: "Schedule deleted successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  return {
    schedules,
    isLoading,
    error,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
