"use client";

import { useState, useCallback, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

export interface TeacherAttendanceRecord {
  teacher_id: { _id: string; name: string; employee_id?: string; photo_url?: string; designation?: string; department?: string };
  status: "present" | "absent" | "leave" | "late" | "half_day" | "holiday";
  note?: string;
  check_in?: string | null;
  check_out?: string | null;
  working_hours?: number | null;
  late_minutes?: number | null;
}

export interface TeacherAttendanceData {
  _id: string | null;
  date: string | Date;
  records: TeacherAttendanceRecord[];
}

const _teacherAttClientCache = new Map<string, { data: TeacherAttendanceData | null; timestamp: number }>();
const CLIENT_CACHE_TTL = 45_000;
const SS_PREFIX = "cache_ta_";

export function useTeacherAttendance() {
  const [attendance, setAttendance] = useState<TeacherAttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return cacheSync.subscribe("attendance", () => {
      _teacherAttClientCache.clear();
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
  }, background = false) => {
    const cacheKey = `${params.academic_year}_${params.date}`;
    const mem = _teacherAttClientCache.get(cacheKey);
    const now = Date.now();

    if (mem && (now - mem.timestamp < CLIENT_CACHE_TTL)) {
      setAttendance(mem.data);
      if (now - mem.timestamp < 15_000) return;
      background = true;
    } else if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(SS_PREFIX + cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (now - parsed.timestamp < CLIENT_CACHE_TTL) {
            setAttendance(parsed.data);
            _teacherAttClientCache.set(cacheKey, parsed);
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

      const res = await fetch(`/api/attendance/teacher?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch");

      const finalData = data.success && data.data ? data.data : null;
      setAttendance(finalData);

      const entry = { data: finalData, timestamp: Date.now() };
      _teacherAttClientCache.set(cacheKey, entry);
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
    records: { teacher_id: string; status: string; note?: string; check_in?: string | null; check_out?: string | null; working_hours?: number | null; late_minutes?: number | null }[];
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

      _teacherAttClientCache.clear();
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
