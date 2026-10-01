"use client";

import { useState, useCallback, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

export interface PopulatedAssignment {
  _id: string;
  school_id: string;
  academic_year: string;
  class_id?: { _id: string; name: string; class_code?: string; section?: string } | null;
  stream_id?: { _id: string; name: string } | null;
  subject_master_id: { _id: string; name: string; subject_code?: string; description?: string };
  teacher_id?: { _id: string; name: string; employee_id?: string; photo_url?: string; designation?: string; is_active?: boolean; } | null;
  weekly_periods?: number;
  description?: string;
  status?: "Active" | "Inactive";
  created_by?: { _id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Module-level Cache & sessionStorage Backup ─────────────────────
interface AssignmentCacheEntry {
  assignments: PopulatedAssignment[];
  total: number;
  totalPages: number;
  page: number;
  timestamp: number;
}
const _subjectAssignmentCache = new Map<string, AssignmentCacheEntry>();
const CACHE_TTL_MS = 60_000;
const SS_PREFIX = "sm_sa_";

function readSessionCacheSA(key: string): AssignmentCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Date.now() - p.timestamp < CACHE_TTL_MS) return p;
  } catch {}
  return null;
}

function writeSessionCacheSA(key: string, entry: AssignmentCacheEntry) {
  try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry)); } catch {}
}

function clearSessionCacheSA() {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(SS_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

export function useSubjectAssignment() {
  const [assignments, setAssignments] = useState<PopulatedAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAssignments = useCallback(async (params: {
    class_id?: string;
    stream_id?: string;
    academic_year?: string;
    subject_id?: string;
    teacher_id?: string;
    status?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number | string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.class_id) qs.set("class_id", params.class_id);
    if (params.stream_id) qs.set("stream_id", params.stream_id);
    if (params.academic_year) qs.set("academic_year", params.academic_year);
    if (params.subject_id) qs.set("subject_id", params.subject_id);
    if (params.teacher_id) qs.set("teacher_id", params.teacher_id);
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);
    if (params.sort) qs.set("sort", params.sort);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));

    const cacheKey = qs.toString();
    const cached = _subjectAssignmentCache.get(cacheKey) ?? readSessionCacheSA(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setAssignments(cached.assignments);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      setCurrentPage(cached.page);
      setIsLoading(false);
      // Return early if within fresh window (15s)
      if (now - cached.timestamp < 15_000) return;
    } else {
      setIsLoading(true);
    }

    setError(null);
    try {
      const res = await fetch(`/api/subject-assignment?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

      const fetchedAssignments = data.data.assignments || [];
      const fetchedTotal = data.data.total ?? 0;
      const fetchedTotalPages = data.data.totalPages ?? 1;
      const fetchedPage = data.data.page ?? 1;

      const entry: AssignmentCacheEntry = {
        assignments: fetchedAssignments,
        total: fetchedTotal,
        totalPages: fetchedTotalPages,
        page: fetchedPage,
        timestamp: Date.now()
      };
      _subjectAssignmentCache.set(cacheKey, entry);
      writeSessionCacheSA(cacheKey, entry);

      setAssignments(fetchedAssignments);
      setTotal(fetchedTotal);
      setTotalPages(fetchedTotalPages);
      setCurrentPage(fetchedPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchronize across tabs and components
  useEffect(() => {
    return cacheSync.subscribe("subject-assignment", () => {
      _subjectAssignmentCache.clear();
      clearSessionCacheSA();
      fetchAssignments();
    });
  }, [fetchAssignments]);

  const createAssignment = async (input: {
    academic_year: string;
    class_id?: string;
    stream_id?: string;
    subject_master_id?: string;
    subject_master_ids?: string[];
    teacher_id?: string;
    weekly_periods?: number;
    description?: string;
    status?: "Active" | "Inactive";
  }) => {
    try {
      const res = await fetch("/api/subject-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      _subjectAssignmentCache.clear();
      clearSessionCacheSA();
      invalidateCache("subject-assignment");
      return { success: true, message: "Subject assigned", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const updateAssignment = async (id: string, input: {
    academic_year?: string;
    class_id?: string;
    stream_id?: string;
    subject_master_id?: string;
    teacher_id?: string | null;
    weekly_periods?: number;
    description?: string;
    status?: "Active" | "Inactive";
  }) => {
    try {
      const res = await fetch(`/api/subject-assignment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to update" };
      _subjectAssignmentCache.clear();
      clearSessionCacheSA();
      invalidateCache("subject-assignment");
      return { success: true, message: "Assignment updated", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const res = await fetch(`/api/subject-assignment/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      _subjectAssignmentCache.clear();
      clearSessionCacheSA();
      invalidateCache("subject-assignment");
      setAssignments(prev => prev.filter(a => a._id !== id));
      return { success: true, message: "Assignment removed" };
    } catch { return { success: false, message: "Network error" }; }
  };

  return { assignments, isLoading, error, total, totalPages, currentPage, fetchAssignments, createAssignment, updateAssignment, deleteAssignment };
}
