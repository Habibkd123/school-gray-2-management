"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";

export interface ApiExam {
  _id: string;
  title: string;
  name?: string;
  type: "unit_test" | "mid_term" | "pre_board" | "annual" | "other";
  class_id: any;
  academic_year: string;
  start_date?: string;
  end_date?: string;
  is_published: boolean;
  createdAt: string;
}

export interface ApiResult {
  _id: string;
  exam_id: any;
  student_id: any;
  subject_id: any;
  class_id?: any;
  marks_obtained?: number;
  obtained_marks?: number;
  total_marks: number;
  passing_marks?: number;
  grade?: string;
  is_pass?: boolean;
  remarks?: string;
}

export function useExams(classId?: string) {
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [loading, setLoading] = useState(true);

  const { academicYear } = useAppState();

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classId) params.set("class_id", classId);
      params.set("academic_year", academicYear);
      const res = await fetch(`/api/exams?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setExams(data.data.exams);
    } catch (e) {
      console.error("useExams fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [classId, academicYear]);

  const authReady = useAuthReady();
  useEffect(() => { if (!authReady) return; fetchExams(); }, [fetchExams, authReady]);

  const createExam = useCallback(async (payload: Partial<ApiExam>) => {
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchExams();
    return data;
  }, [fetchExams]);

  const updateExam = useCallback(async (id: string, payload: Partial<ApiExam>) => {
    const res = await fetch(`/api/exams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchExams();
    return data;
  }, [fetchExams]);

  const deleteExam = useCallback(async (id: string) => {
    const res = await fetch(`/api/exams/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) await fetchExams();
    return data;
  }, [fetchExams]);

  return { exams, loading, fetchExams, createExam, updateExam, deleteExam };
}

export function useResults(examId?: string, studentId?: string) {
  const [results, setResults] = useState<ApiResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const { academicYear } = useAppState();

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (examId) params.set("exam_id", examId);
      if (studentId) params.set("student_id", studentId);
      if (academicYear) params.set("academic_year", academicYear);
      const res = await fetch(`/api/results?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setResults(data.data.results);
    } catch (e) {
      console.error("useResults fetch error", e);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [examId, studentId, academicYear]);

  const authReady = useAuthReady();
  useEffect(() => { if (!authReady) return; fetchResults(); }, [fetchResults, authReady]);

  const createResults = useCallback(async (entries: Partial<ApiResult>[]) => {
    const res = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(entries),
    });
    const data = await res.json();
    if (data.success) await fetchResults();
    return data;
  }, [fetchResults]);

  return { results, loading, isLoading, fetchResults, createResults };
}
