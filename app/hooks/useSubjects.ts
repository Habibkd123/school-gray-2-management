"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";

export interface ApiSubject {
  _id: string;
  name: string;
  code?: string;
  type: "theory" | "practical" | "both";
  class_id: { _id: string; name: string; section?: string } | string;
  full_marks: number;
  pass_marks: number;
  createdAt: string;
}

export function useSubjects(classId?: string, options?: { skip?: boolean; all?: boolean }) {
  const [rawSubjects, setRawSubjects] = useState<ApiSubject[]>([]);
  const [loading, setLoading] = useState(options?.skip ? false : true);

  const { academicYear } = useAppState();
  const authReady = useAuthReady();

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classId) params.set("class_id", classId);
      if (!classId && academicYear) params.set("academic_year", academicYear);
      const res = await fetch(`/api/subjects?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setRawSubjects(data.data.subjects);
    } catch (e) {
      console.error("useSubjects fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [classId, academicYear]);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage
    fetchSubjects();
  }, [fetchSubjects, options?.skip, authReady]);

  // Deduplicate by name so dropdowns never show the same subject twice
  // (subjects are stored per-section so classId queries return duplicates)
  const subjects = useMemo(() => {
    if (options?.all) return rawSubjects;
    const seen = new Set<string>();
    return rawSubjects.filter(s => {
      const key = s.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawSubjects, options?.all]);

  const createSubject = useCallback(async (payload: Partial<ApiSubject> & { type?: string }) => {
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchSubjects();
    return data;
  }, [fetchSubjects]);

  const updateSubject = useCallback(async (id: string, payload: Partial<ApiSubject> & { type?: string }) => {
    const res = await fetch(`/api/subjects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchSubjects();
    return data;
  }, [fetchSubjects]);

  const deleteSubject = useCallback(async (id: string) => {
    const res = await fetch(`/api/subjects/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) await fetchSubjects();
    return data;
  }, [fetchSubjects]);

  return { subjects, rawSubjects, loading, fetchSubjects, createSubject, updateSubject, deleteSubject };
}
