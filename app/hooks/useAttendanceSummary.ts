"use client";

import { useState, useCallback } from "react";
import { getAuthHeaders } from "@/lib/utils/session";

export interface AttendanceSummaryRecord {
  present: number;
  absent: number;
  late: number;
  holiday: number;
  half_day: number;
  leave?: number;
}

export function useAttendanceSummary() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (
    startDate: string,
    endDate: string,
    type: "student" | "teacher",
    classId?: string,
    recordId?: string
  ): Promise<Record<string, AttendanceSummaryRecord> | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate, type });
      if (classId) params.append("classId", classId);
      if (recordId) params.append("recordId", recordId);

      const res = await fetch(`/api/attendance/summary?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch attendance summary");
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (
    startDate: string,
    endDate: string,
    type: "student" | "teacher",
    recordId: string,
    classId?: string
  ): Promise<Array<{ date: string; status: string; note?: string }> | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate, type, detail: "true", recordId });
      if (classId) params.append("classId", classId);

      const res = await fetch(`/api/attendance/summary?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch attendance details");
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    fetchSummary,
    fetchDetail,
  };
}
