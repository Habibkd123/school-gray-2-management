"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface ApiSyllabusChapter {
  title: string;
  description?: string;
  hours_allocated?: number;
  status: "pending" | "in_progress" | "completed";
}

export interface ApiSyllabus {
  _id: string;
  school_id: string;
  class_id: { _id: string; name: string; section?: string } | string;
  subject_id: { _id: string; name: string; code?: string; type: string } | string;
  chapters: ApiSyllabusChapter[];
  createdAt: string;
  updatedAt: string;
}

export function useSyllabus(classId?: string, subjectId?: string, options?: { skip?: boolean }) {
  const [syllabi, setSyllabi] = useState<ApiSyllabus[]>([]);
  const [loading, setLoading] = useState(options?.skip ? false : true);
  const [error, setError] = useState<string | null>(null);

  const authReady = useAuthReady();

  const fetchSyllabi = useCallback(async (cId?: string, sId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const activeClassId = cId || classId;
      const activeSubjectId = sId || subjectId;

      const params = new URLSearchParams();
      if (activeClassId) params.set("class_id", activeClassId);
      if (activeSubjectId) params.set("subject_id", activeSubjectId);

      const res = await fetch(`/api/syllabus?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSyllabi(data.data);
      } else {
        setError(data.message || "Failed to fetch syllabus data");
      }
    } catch (e: any) {
      console.error("useSyllabus fetch error", e);
      setError(e.message || "An error occurred while fetching syllabus");
    } finally {
      setLoading(false);
    }
  }, [classId, subjectId]);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until authentication token is loaded
    fetchSyllabi();
  }, [fetchSyllabi, options?.skip, authReady]);

  const createSyllabus = useCallback(async (payload: { class_id: string; subject_id: string; chapters: ApiSyllabusChapter[] }) => {
    try {
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSyllabi();
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to create syllabus" };
    }
  }, [fetchSyllabi]);

  const updateSyllabus = useCallback(async (id: string, payload: { chapters: ApiSyllabusChapter[] }) => {
    try {
      const res = await fetch(`/api/syllabus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSyllabi();
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to update syllabus" };
    }
  }, [fetchSyllabi]);

  const deleteSyllabus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/syllabus/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSyllabi();
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to delete syllabus" };
    }
  }, [fetchSyllabi]);

  return { syllabi, loading, error, fetchSyllabi, createSyllabus, updateSyllabus, deleteSyllabus };
}
