"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

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
  description?: string;
  status?: "upcoming" | "ongoing" | "completed";
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
  attendance_status?: string;
}

// ─── Module-level cache for exams (keyed by "classId|academicYear") ─
const _examsQueryCache = new Map<string, { exams: ApiExam[]; timestamp: number }>();
const _examsInFlight = new Map<string, Promise<ApiExam[]>>();
const EXAMS_CACHE_TTL_MS = 30_000;

function getExamsCacheKey(classId: string | undefined, academicYear: string) {
  return `${classId || ""}|${academicYear}`;
}

function getStoredExams(key: string): ApiExam[] | null {
  const mem = _examsQueryCache.get(key);
  if (mem) return mem.exams;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`cache_exams_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _examsQueryCache.set(key, { exams: parsed, timestamp: Date.now() - 10_000 });
        return parsed;
      }
    }
  } catch {}
  return null;
}

function setStoredExams(key: string, exams: ApiExam[]) {
  _examsQueryCache.set(key, { exams, timestamp: Date.now() });
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`cache_exams_${key}`, JSON.stringify(exams));
    } catch {}
  }
}

export function useExams(classId?: string, options?: { skip?: boolean }) {
  const { academicYear } = useAppState();
  const cacheKey = getExamsCacheKey(classId, academicYear);
  const initialExams = options?.skip ? null : getStoredExams(cacheKey);

  const [exams, setExams] = useState<ApiExam[]>(initialExams || []);
  const [loading, setLoading] = useState(options?.skip ? false : initialExams ? false : true);

  const fetchExams = useCallback(async (forceRefresh = false) => {
    const key = getExamsCacheKey(classId, academicYear);
    if (!forceRefresh) {
      const hit = _examsQueryCache.get(key);
      if (hit && (Date.now() - hit.timestamp) < EXAMS_CACHE_TTL_MS) {
        setExams(hit.exams);
        setLoading(false);
        return;
      }
    }

    // Dedup concurrent fetches for the same key
    if (_examsInFlight.has(key)) {
      try {
        const data = await _examsInFlight.get(key)!;
        setExams(data);
      } catch (e) {
        console.error("useExams fetch error", e);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!exams || exams.length === 0) {
      setLoading(true);
    }
    const promise = (async (): Promise<ApiExam[]> => {
      const params = new URLSearchParams();
      if (classId) params.set("class_id", classId);
      params.set("academic_year", academicYear);
      const res = await fetch(`/api/exams?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      const list: ApiExam[] = data.success ? (data.data.exams || []) : [];
      setStoredExams(key, list);
      return list;
    })();

    _examsInFlight.set(key, promise);

    try {
      const list = await promise;
      setExams(list);
    } catch (e) {
      console.error("useExams fetch error", e);
    } finally {
      _examsInFlight.delete(key);
      setLoading(false);
    }
  }, [classId, academicYear, exams]);

  const authReady = useAuthReady();
  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchExams();
  }, [fetchExams, authReady, options?.skip]);

  // Synchronize exams across tabs & components
  useEffect(() => {
    return cacheSync.subscribe("exams", () => {
      _examsQueryCache.clear();
      fetchExams(true);
    });
  }, [fetchExams]);

  const createExam = useCallback(async (payload: Partial<ApiExam>) => {
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      _examsQueryCache.clear();
      invalidateCache("exams");
      await fetchExams(true);
    }
    return data;
  }, [fetchExams]);

  const updateExam = useCallback(async (id: string, payload: Partial<ApiExam>) => {
    const res = await fetch(`/api/exams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      _examsQueryCache.clear();
      invalidateCache("exams");
      await fetchExams(true);
    }
    return data;
  }, [fetchExams]);

  const deleteExam = useCallback(async (id: string) => {
    const res = await fetch(`/api/exams/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      _examsQueryCache.clear();
      invalidateCache("exams");
      setExams((prev) => prev.filter((e) => e._id !== id));
    }
    return data;
  }, []);

  return { exams, loading, fetchExams, createExam, updateExam, deleteExam };
}

// ─── Module-level cache for results ─
const _resultsQueryCache = new Map<string, { results: ApiResult[]; timestamp: number }>();
const _resultsInFlight = new Map<string, Promise<ApiResult[]>>();
const RESULTS_CACHE_TTL_MS = 30_000;

function getResultsCacheKey(examId?: string, studentId?: string, academicYear?: string) {
  return `${examId || ""}|${studentId || ""}|${academicYear || ""}`;
}

export function useResults(examId?: string, studentId?: string, options?: { skip?: boolean }) {
  const { academicYear } = useAppState();
  const cacheKey = getResultsCacheKey(examId, studentId, academicYear);
  const mem = _resultsQueryCache.get(cacheKey);

  const [results, setResults] = useState<ApiResult[]>(mem?.results || []);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : mem ? false : true);

  const fetchResults = useCallback(async (forceRefresh = false) => {
    const key = getResultsCacheKey(examId, studentId, academicYear);
    if (!forceRefresh) {
      const hit = _resultsQueryCache.get(key);
      if (hit && (Date.now() - hit.timestamp) < RESULTS_CACHE_TTL_MS) {
        setResults(hit.results);
        setIsLoading(false);
        return;
      }
    }

    if (_resultsInFlight.has(key)) {
      try {
        const data = await _resultsInFlight.get(key)!;
        setResults(data);
      } catch (e) {
        console.error("useResults fetch error", e);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!results || results.length === 0) {
      setIsLoading(true);
    }

    const promise = (async (): Promise<ApiResult[]> => {
      const params = new URLSearchParams();
      if (examId) params.set("exam_id", examId);
      if (studentId) params.set("student_id", studentId);
      if (academicYear) params.set("academic_year", academicYear);
      const res = await fetch(`/api/results?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json();
      const list = data.success ? (data.data.results || []) : [];
      _resultsQueryCache.set(key, { results: list, timestamp: Date.now() });
      return list;
    })();

    _resultsInFlight.set(key, promise);

    try {
      const list = await promise;
      setResults(list);
    } catch (e) {
      console.error("useResults fetch error", e);
    } finally {
      _resultsInFlight.delete(key);
      setIsLoading(false);
    }
  }, [examId, studentId, academicYear, results]);

  const authReady = useAuthReady();
  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchResults();
  }, [fetchResults, authReady, options?.skip]);

  // Synchronize results across tabs & components
  useEffect(() => {
    return cacheSync.subscribe("results", () => {
      _resultsQueryCache.clear();
      fetchResults(true);
    });
  }, [fetchResults]);

  const createResults = useCallback(async (entries: Partial<ApiResult>[]) => {
    const res = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(entries),
    });
    const data = await res.json();
    if (data.success) {
      _resultsQueryCache.clear();
      invalidateCache("results");
      await fetchResults(true);
    }
    return data;
  }, [fetchResults]);

  return { results, loading: isLoading, isLoading, fetchResults, createResults };
}
