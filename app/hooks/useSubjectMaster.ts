"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface ApiSubjectMaster {
  _id: string;
  school_id: string;
  name: string;
  subject_code?: string;
  description?: string;
  status: "Active" | "Inactive" | "Archived";
  allowed_streams?: string[];
  createdAt?: string;
}

let _subjectsCache: ApiSubjectMaster[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;
const _listeners = new Set<(s: ApiSubjectMaster[]) => void>();

function invalidateCache() { _subjectsCache = null; _cacheTimestamp = 0; }

export function useSubjectMaster(options?: { skip?: boolean; limit?: number }) {
  const [subjects, setSubjects] = useState<ApiSubjectMaster[]>(_subjectsCache ?? []);
  const [isLoading, setIsLoading] = useState(_subjectsCache === null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const authReady = useAuthReady();

  useEffect(() => {
    const listener = (data: ApiSubjectMaster[]) => setSubjects(data);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  const fetchSubjects = useCallback(async (params: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
    setIsLoading(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.status) qs.set("status", params.status);
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));

      const res = await fetch(`/api/subject-master?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch subjects");

      const isFiltered = !!(params.search || params.page);
      const isAll = (params.limit ?? 0) >= 100;
      if (isAll && !isFiltered) {
        _subjectsCache = data.data.subjects;
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(data.data.subjects));
      }
      setSubjects(data.data.subjects);
      setTotal(data.data.total ?? 0);
      setTotalPages(data.data.totalPages ?? 1);
      setCurrentPage(data.data.page ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subjects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip || !authReady) return;
    const isFresh = _subjectsCache !== null && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS;
    if (isFresh) return;
    fetchSubjects({ limit: options?.limit ?? 1000 });
  }, [fetchSubjects, options?.skip, options?.limit, authReady]);

  const createSubject = async (input: { name: string; subject_code?: string; description?: string; status?: string; allowed_streams?: string[] }) => {
    try {
      const res = await fetch("/api/subject-master", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      invalidateCache(); fetchSubjects({ limit: 100 });
      return { success: true, message: "Subject created", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const updateSubject = async (id: string, input: Partial<ApiSubjectMaster>) => {
    try {
      const res = await fetch(`/api/subject-master/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      if (_subjectsCache) {
        _subjectsCache = _subjectsCache.map(s => s._id === id ? data.data : s);
        _listeners.forEach(fn => fn(_subjectsCache!));
      }
      setSubjects(prev => prev.map(s => s._id === id ? data.data : s));
      return { success: true, message: "Subject updated" };
    } catch { return { success: false, message: "Network error" }; }
  };

  const deleteSubject = async (id: string) => {
    try {
      const res = await fetch(`/api/subject-master/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      if (_subjectsCache) {
        _subjectsCache = _subjectsCache.filter(s => s._id !== id);
        _listeners.forEach(fn => fn(_subjectsCache!));
      }
      setSubjects(prev => prev.filter(s => s._id !== id));
      return { success: true, message: "Subject deleted" };
    } catch { return { success: false, message: "Network error" }; }
  };

  return { subjects, isLoading, error, total, totalPages, currentPage, fetchSubjects, createSubject, updateSubject, deleteSubject };
}
