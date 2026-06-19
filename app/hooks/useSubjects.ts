"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";

export interface ApiSubject {
  _id: string;
  name: string;
  code?: string;
  type: "theory" | "practical" | "both";
  class_id: string;
  full_marks: number;
  pass_marks: number;
  createdAt: string;
}

export function useSubjects(classId?: string) {
  const [rawSubjects, setRawSubjects] = useState<ApiSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const { academicYear } = useAppState();

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classId) params.set("class_id", classId);
      // Only apply academic_year filter when not fetching by specific classId
      // (classId-scoped subjects are already year-scoped via their class)
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

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  // Deduplicate by name so dropdowns never show the same subject twice
  // (subjects are stored per-section so classId queries return duplicates)
  const subjects = useMemo(() => {
    const seen = new Set<string>();
    return rawSubjects.filter(s => {
      const key = s.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawSubjects]);

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

  return { subjects, loading, fetchSubjects, createSubject, updateSubject, deleteSubject };
}
