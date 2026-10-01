"use client";

import { useState, useCallback, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

export interface PopulatedTeacherAssignment {
  _id: string;
  school_id: string;
  academic_year: string;
  teacher_id: { 
    _id: string; 
    name: string; 
    employee_id?: string; 
    photo_url?: string; 
    designation?: string; 
    is_active?: boolean;
  };
  class_id?: { _id: string; name: string; section?: string; class_code?: string } | null;
  stream_id?: { _id: string; name: string } | null;
  section_id?: { _id: string; name: string } | null;
  subject_master_id?: { _id: string; name: string; subject_code?: string; description?: string } | null;
  assignment_type: "Class Teacher" | "Subject Teacher" | "Co-Class Teacher" | "Temporary Teacher" | "Substitute Teacher";
  effective_date?: string;
  status: "Active" | "Inactive";
  remarks?: string;
  weekly_periods?: number;
  created_by?: { _id: string; name: string } | null;
  history?: Array<{
    action: string;
    changes?: string;
    updated_by: any;
    date: string;
    remarks?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Module-level Cache ─────────────────────────────────────────────
interface AssignmentCacheEntry {
  assignments: PopulatedTeacherAssignment[];
  total: number;
  totalPages: number;
  page: number;
  timestamp: number;
}
const _assignmentCache = new Map<string, AssignmentCacheEntry>();
const _inFlightPromisesTA = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 60_000;
const SS_PREFIX = "sm_ta_";

function readSessionCacheTA(key: string): AssignmentCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Date.now() - p.timestamp < CACHE_TTL_MS) return p;
  } catch {}
  return null;
}

function writeSessionCacheTA(key: string, entry: AssignmentCacheEntry) {
  try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry)); } catch {}
}

function clearSessionCacheTA() {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(SS_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

let _lastCachedAssignments: PopulatedTeacherAssignment[] = [];

export function useTeacherAssignment() {
  const [assignments, setAssignments] = useState<PopulatedTeacherAssignment[]>(() => {
    if (_lastCachedAssignments.length > 0) return _lastCachedAssignments;
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(SS_PREFIX)) {
            const raw = sessionStorage.getItem(k);
            if (raw) {
              const p = JSON.parse(raw);
              if (Date.now() - p.timestamp < CACHE_TTL_MS && p.assignments && p.assignments.length > 0) {
                _lastCachedAssignments = p.assignments;
                return p.assignments;
              }
            }
          }
        }
      } catch {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(() => _lastCachedAssignments.length);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAssignments = useCallback(async (params: {
    class_id?: string;
    stream_id?: string;
    section_id?: string;
    teacher_id?: string;
    subject_id?: string;
    status?: string;
    assignment_type?: string;
    search?: string;
    sort?: string;
    academic_year?: string;
    page?: number;
    limit?: number | string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.class_id) qs.set("class_id", params.class_id);
    if (params.stream_id) qs.set("stream_id", params.stream_id);
    if (params.section_id) qs.set("section_id", params.section_id);
    if (params.teacher_id) qs.set("teacher_id", params.teacher_id);
    if (params.subject_id) qs.set("subject_id", params.subject_id);
    if (params.status) qs.set("status", params.status);
    if (params.assignment_type) qs.set("assignment_type", params.assignment_type);
    if (params.search) qs.set("search", params.search);
    if (params.sort) qs.set("sort", params.sort);
    if (params.academic_year) qs.set("academic_year", params.academic_year);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));

    const cacheKey = qs.toString();
    const cached = _assignmentCache.get(cacheKey) ?? readSessionCacheTA(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      _lastCachedAssignments = cached.assignments;
      setAssignments(cached.assignments);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      setCurrentPage(cached.page);
      setIsLoading(false);
      // Return early if within fresh window (30s)
      if (now - cached.timestamp < 30_000) return;
    } else {
      setIsLoading(true);
    }

    if (_inFlightPromisesTA.has(cacheKey)) {
      try {
        const cachedData = await _inFlightPromisesTA.get(cacheKey)!;
        setAssignments(cachedData.assignments);
        setTotal(cachedData.total);
        setTotalPages(cachedData.totalPages);
        setCurrentPage(cachedData.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load teacher assignments");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setError(null);
    const promise = (async () => {
      const res = await fetch(`/api/teacher-assignment?${qs}`, { headers: getAuthHeaders() });
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
      _assignmentCache.set(cacheKey, entry);
      writeSessionCacheTA(cacheKey, entry);
      _lastCachedAssignments = fetchedAssignments;

      setAssignments(fetchedAssignments);
      setTotal(fetchedTotal);
      setTotalPages(fetchedTotalPages);
      setCurrentPage(fetchedPage);
      return entry;
    })();

    _inFlightPromisesTA.set(cacheKey, promise);
    try {
      await promise;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teacher assignments");
    } finally {
      _inFlightPromisesTA.delete(cacheKey);
      setIsLoading(false);
    }
  }, []);

  // Synchronize across tabs and components
  useEffect(() => {
    return cacheSync.subscribe("teacher-assignment", () => {
      _assignmentCache.clear();
      clearSessionCacheTA();
      fetchAssignments();
    });
  }, [fetchAssignments]);

  const createAssignment = async (input: {
    academic_year: string;
    teacher_id: string;
    class_id?: string;
    stream_id?: string;
    section_id?: string;
    subject_master_id?: string;
    subject_master_ids?: string[];
    assignment_type?: string;
    effective_date?: string;
    status?: string;
    remarks?: string;
  }) => {
    try {
      const res = await fetch("/api/teacher-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      _assignmentCache.clear();
      clearSessionCacheTA();
      invalidateCache("teacher-assignment");
      return { success: true, message: "Teacher assigned", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const updateAssignment = async (id: string, input: {
    academic_year?: string;
    teacher_id?: string;
    class_id?: string;
    stream_id?: string;
    section_id?: string;
    subject_master_id?: string;
    assignment_type?: string;
    effective_date?: string;
    status?: string;
    remarks?: string;
  }) => {
    try {
      const res = await fetch(`/api/teacher-assignment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to update" };
      _assignmentCache.clear();
      clearSessionCacheTA();
      invalidateCache("teacher-assignment");
      return { success: true, message: "Assignment updated", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const res = await fetch(`/api/teacher-assignment/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      _assignmentCache.clear();
      clearSessionCacheTA();
      invalidateCache("teacher-assignment");
      setAssignments(prev => prev.filter(a => a._id !== id));
      return { success: true, message: "Assignment removed" };
    } catch { return { success: false, message: "Network error" }; }
  };

  return { assignments, isLoading, error, total, totalPages, currentPage, fetchAssignments, createAssignment, updateAssignment, deleteAssignment };
}
