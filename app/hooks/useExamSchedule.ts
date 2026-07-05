"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface ApiExamSchedule {
  _id: string;
  exam_id: any;
  subject_id: any;
  date: string;
  start_time: string;
  end_time: string;
  max_marks: number;
  passing_marks: number;
  room?: string;
  createdAt: string;
}

export function useExamSchedule(examId?: string) {
  const [schedules, setSchedules] = useState<ApiExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (examId) params.set("exam_id", examId);
      const res = await fetch(`/api/exams/schedule?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setSchedules(data.data);
    } catch (e) {
      console.error("useExamSchedule fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const authReady = useAuthReady();
  useEffect(() => { 
    if (!authReady) return; 
    fetchSchedules(); 
  }, [fetchSchedules, authReady]);

  const createSchedule = useCallback(async (payload: Partial<ApiExamSchedule>) => {
    const res = await fetch("/api/exams/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchSchedules();
    return data;
  }, [fetchSchedules]);

  const updateSchedule = useCallback(async (id: string, payload: Partial<ApiExamSchedule>) => {
    const res = await fetch(`/api/exams/schedule/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchSchedules();
    return data;
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    const res = await fetch(`/api/exams/schedule/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) await fetchSchedules();
    return data;
  }, [fetchSchedules]);

  return { schedules, loading, fetchSchedules, createSchedule, updateSchedule, deleteSchedule };
}
