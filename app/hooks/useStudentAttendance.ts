"use client";

import { useState, useCallback, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

export interface StudentAttendanceRecord {
  student_id: { _id: string; name: string; roll_no?: string };
  status: "present" | "absent" | "leave" | "late" | "half_day" | "holiday";
  note?: string;
}

export interface StudentAttendanceData {
  _id: string;
  school_id: string;
  academic_year: string;
  class_id: string;
  stream_id?: string;
  section_id?: string;
  date: string;
  records: StudentAttendanceRecord[];
  createdAt?: string;
  updatedAt?: string;
}

const _studentAttClientCache = new Map<string, { data: StudentAttendanceData | null; timestamp: number }>();
const CLIENT_CACHE_TTL = 45_000;
const SS_PREFIX = "cache_sa_";

export function useStudentAttendance() {
  const [attendance, setAttendance] = useState<StudentAttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cross-tab and module cache sync
  useEffect(() => {
    return cacheSync.subscribe("attendance", () => {
      _studentAttClientCache.clear();
      if (typeof window !== "undefined") {
        try {
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith(SS_PREFIX))
            .forEach((k) => sessionStorage.removeItem(k));
        } catch {}
      }
    });
  }, []);

  const fetchAttendance = useCallback(async (params: {
    academic_year: string;
    date: string;
    classId: string;
    streamId?: string;
    sectionId?: string;
  }, background = false) => {
    const cacheKey = `${params.academic_year}_${params.date}_${params.classId}_${params.streamId || ""}_${params.sectionId || ""}`;
    const mem = _studentAttClientCache.get(cacheKey);
    const now = Date.now();

    if (mem && (now - mem.timestamp < CLIENT_CACHE_TTL)) {
      setAttendance(mem.data);
      if (now - mem.timestamp < 15_000) return; // Super fresh
      background = true;
    } else if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(SS_PREFIX + cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (now - parsed.timestamp < CLIENT_CACHE_TTL) {
            setAttendance(parsed.data);
            _studentAttClientCache.set(cacheKey, parsed);
            background = true;
          }
        }
      } catch {}
    }

    if (!background) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const qs = new URLSearchParams();
      qs.set("academic_year", params.academic_year);
      qs.set("date", params.date);
      qs.set("classId", params.classId);
      if (params.streamId) qs.set("streamId", params.streamId);
      if (params.sectionId) qs.set("sectionId", params.sectionId);

      const res = await fetch(`/api/attendance/student?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch");

      const finalData = data.success && data.data ? data.data : null;
      setAttendance(finalData);

      const entry = { data: finalData, timestamp: Date.now() };
      _studentAttClientCache.set(cacheKey, entry);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(SS_PREFIX + cacheKey, JSON.stringify(entry));
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  const saveAttendance = async (input: {
    academic_year: string;
    date: string;
    classId: string;
    streamId?: string;
    sectionId?: string;
    records: { student_id: string; status: string; note?: string }[];
    reason?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/student", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save attendance");
      }
      setAttendance(data.data);

      _studentAttClientCache.clear();
      invalidateCache("attendance");

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
