"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

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

// Module-level client cache & in-flight deduplication
const _schedulesClientCache = new Map<string, { data: ApiSchedule[]; timestamp: number }>();
const _schedulesInFlightClient = new Map<string, Promise<ApiSchedule[]>>();
const SCHEDULES_CLIENT_TTL = 30_000; // 30s freshness window

function getSchedulesCacheKey(cId?: string, tId?: string): string {
  return `schedules_${cId || "all"}_${tId || "all"}`;
}

function getStoredSchedules(cacheKey: string): ApiSchedule[] | null {
  const mem = _schedulesClientCache.get(cacheKey);
  if (mem) return mem.data;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`cache_${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _schedulesClientCache.set(cacheKey, { data: parsed, timestamp: Date.now() - 10_000 });
        return parsed;
      }
    }
  } catch {}
  return null;
}

function setStoredSchedules(cacheKey: string, data: ApiSchedule[]) {
  _schedulesClientCache.set(cacheKey, { data, timestamp: Date.now() });
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`cache_${cacheKey}`, JSON.stringify(data));
    } catch {}
  }
}

export function useSchedules(classId?: string, teacherId?: string, options?: { skip?: boolean }) {
  const cacheKey = getSchedulesCacheKey(classId, teacherId);
  const initialCached = options?.skip ? null : getStoredSchedules(cacheKey);

  const [schedules, setSchedules] = useState<ApiSchedule[]>(initialCached || []);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : initialCached ? false : true);
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
  }, tId?: string, forceRefresh = false) => {
    let key = cacheKey;
    const query = new URLSearchParams();
    if (typeof cIdOrParams === "string") {
      if (cIdOrParams) query.set("classId", cIdOrParams);
      if (tId) query.set("teacherId", tId);
      key = getSchedulesCacheKey(cIdOrParams, tId);
    } else if (cIdOrParams) {
      Object.entries(cIdOrParams).forEach(([k, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.set(k, String(val));
        }
      });
      key = `schedules_${query.toString()}`;
    }

    // Check freshness
    if (!forceRefresh) {
      const cached = _schedulesClientCache.get(key);
      if (cached && Date.now() - cached.timestamp < SCHEDULES_CLIENT_TTL) {
        setSchedules(cached.data);
        setIsLoading(false);
        return;
      }
    }

    // Reuse in-flight fetch
    const existingPromise = _schedulesInFlightClient.get(key);
    if (existingPromise) {
      try {
        const data = await existingPromise;
        setSchedules(data);
      } catch (err: any) {
        setError(err.message || "Failed to load schedules");
      }
      return;
    }

    // Only show loading indicator if we don't already have data
    if (!schedules || schedules.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    const promise = (async () => {
      const res = await fetch(`/api/schedules?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch schedules");
      const list: ApiSchedule[] = data.data || [];
      setStoredSchedules(key, list);
      return list;
    })();

    _schedulesInFlightClient.set(key, promise);

    try {
      const data = await promise;
      setSchedules(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Failed to load schedules");
    } finally {
      _schedulesInFlightClient.delete(key);
      setIsLoading(false);
    }
  }, [cacheKey, schedules]);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchSchedules(classId, teacherId);
  }, [fetchSchedules, classId, teacherId, options?.skip, authReady]);

  // Synchronize schedules across tabs & components
  useEffect(() => {
    return cacheSync.subscribe("schedules", () => {
      fetchSchedules(classId, teacherId, true);
    });
  }, [fetchSchedules, classId, teacherId]);

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

      _schedulesClientCache.clear();
      invalidateCache("schedules");
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

      _schedulesClientCache.clear();
      invalidateCache("schedules");
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

      _schedulesClientCache.clear();
      invalidateCache("schedules");
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
