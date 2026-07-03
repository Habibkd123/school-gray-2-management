"use client";

import { useState, useCallback } from "react";
import { getAuthHeaders } from "@/lib/utils/session";

export interface SyllabusChapter {
  chapter_no: number;
  chapter_name: string;
  description?: string;
  start_date: string;
  target_date: string;
  status: "Not Started" | "In Progress" | "Completed";
  _id?: string;
}

export interface SyllabusData {
  _id?: string;
  school_id?: string;
  teacher_assignment_id: string;
  chapters: SyllabusChapter[];
  createdAt?: string;
  updatedAt?: string;
}

export function useSyllabus() {
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSyllabus = useCallback(async (teacher_assignment_id: string) => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`/api/syllabus?teacher_assignment_id=${teacher_assignment_id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

      setSyllabus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSyllabus = async (teacher_assignment_id: string, chapters: SyllabusChapter[]) => {
    try {
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ teacher_assignment_id, chapters }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      setSyllabus(data.data);
      return { success: true, message: "Syllabus saved successfully", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const deleteSyllabus = async (id: string) => {
    try {
      const res = await fetch(`/api/syllabus/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      setSyllabus(null);
      return { success: true, message: "Syllabus deleted successfully" };
    } catch { return { success: false, message: "Network error" }; }
  };

  return { syllabus, isLoading, error, fetchSyllabus, saveSyllabus, deleteSyllabus };
}
