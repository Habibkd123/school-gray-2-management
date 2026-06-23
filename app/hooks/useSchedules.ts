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
  room?: string;
  academic_year?: string;
}

export function useSchedules(classId?: string, teacherId?: string, options?: { skip?: boolean }) {
  const [schedules, setSchedules] = useState<ApiSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();

  const fetchSchedules = useCallback(async (cId?: string, tId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cId) params.set("classId", cId);
      if (tId) params.set("teacherId", tId);
      // Note: do NOT filter by academic_year here — timetable records may have
      // different academic_year values and we want to show all for the class.

      const res = await fetch(`/api/schedules?${params.toString()}`, {
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
  }, []); // no academicYear dependency — avoids re-fetch race condition


  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage
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
