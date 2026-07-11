"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import { ClassService } from "@/app/services/ClassService";

// ─── Types ────────────────────────────────────────────────────────
export interface ApiClass {
  _id: string;
  school_id?: string;
  name: string;
  section: string;
  class_code?: string;
  academic_year: string;
  status: "Active" | "Inactive" | "Archived";
  class_teacher_id?: { _id: string; name: string; employee_id?: string } | null;
  capacity: number;
  createdAt?: string;
}

export interface CreateClassInput {
  name: string;
  section?: string;
  class_code?: string;
  academic_year: string;
  class_teacher_id?: string;
  capacity?: number;
  status?: "Active" | "Inactive" | "Archived";
}

export interface FetchClassesParams {
  search?: string;
  academic_year?: string;
  section?: string;
  sort?: "asc" | "desc";
  page?: number;
  limit?: number | "all";
}

// ─── Module-level cache (shared across all useClasses() instances) ──
let _classesCache: ApiClass[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds
const _listeners = new Set<(classes: ApiClass[]) => void>();
const _classesFetchPromises = new Map<string, Promise<{ classes: ApiClass[]; total: number; totalPages: number; currentPage: number }>>();

function invalidateCache() {
  _classesCache = null;
  _cacheTimestamp = 0;
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useClasses(options?: { skip?: boolean; filterByYear?: boolean }) {
  const [classes, setClasses] = useState<ApiClass[]>(_classesCache ?? []);
  const [isLoading, setIsLoading] = useState(_classesCache === null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Subscribe to cache broadcasts
  useEffect(() => {
    const listener = (data: ApiClass[]) => setClasses(data);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  // ─── Fetch all classes ──────────────────────────────────────────
  const fetchClasses = useCallback(async (params: FetchClassesParams = {}) => {
    const isFiltered = !!(params.search || params.section || params.sort || params.page);
    const isAll = params.limit === "all" || !params.limit;

    if (isAll && !isFiltered) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await ClassService.getAllClasses({
          academic_year: params.academic_year
        });
        _classesCache = data;
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(data));
        setClasses(data);
        setTotal(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const isFresh = _classesCache !== null && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS;

    // Serve from cache for unfiltered requests requesting all classes
    if (isFresh && isAll && !isFiltered) {
      setClasses(_classesCache!);
      setTotal(_classesCache!.length);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Build unique query string as the cache key
    const qs = new URLSearchParams();
    if (params.search)        qs.set("search", params.search);
    if (params.academic_year) qs.set("academic_year", params.academic_year);
    if (params.section)       qs.set("section", params.section);
    if (params.sort)          qs.set("sort", params.sort);
    if (params.page)          qs.set("page", String(params.page));
    if (params.limit)         qs.set("limit", String(params.limit));

    const cacheKey = qs.toString();

    if (_classesFetchPromises.has(cacheKey)) {
      try {
        const cachedData = await _classesFetchPromises.get(cacheKey)!;
        setClasses(cachedData.classes);
        setTotal(cachedData.total);
        setTotalPages(cachedData.totalPages);
        setCurrentPage(cachedData.currentPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const promise = (async () => {
      const res = await fetch(`/api/classes?${cacheKey}`, {
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

      return {
        classes: data.data.classes,
        total: data.data.total ?? data.data.classes.length,
        totalPages: data.data.totalPages ?? 1,
        currentPage: data.data.page ?? 1,
      };
    })();

    _classesFetchPromises.set(cacheKey, promise);

    try {
      const data = await promise;
      // Only cache unfiltered ALL results
      if (isAll && !isFiltered) {
        _classesCache = data.classes;
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(data.classes));
      }

      setClasses(data.classes);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes");
    } finally {
      _classesFetchPromises.delete(cacheKey);
      setIsLoading(false);
    }
  }, []);

  const { academicYear } = useAppState();
  const authReady = useAuthReady();

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage
    const params: FetchClassesParams = { limit: "all" as any };
    if (options?.filterByYear) params.academic_year = academicYear;
    fetchClasses(params);
  }, [fetchClasses, academicYear, options?.skip, options?.filterByYear, authReady]);

  // ─── Create class ───────────────────────────────────────────────
  const createClass = async (
    input: CreateClassInput
  ): Promise<{ success: boolean; message: string; data?: ApiClass }> => {
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to create" };

      ClassService.invalidateCache();
      const sorted = [...(_classesCache ?? []), data.data].sort((a, b) =>
        a.name.localeCompare(b.name) || a.section.localeCompare(b.section)
      );
      _classesCache = sorted;
      _cacheTimestamp = Date.now();
      _listeners.forEach(fn => fn(sorted));

      setClasses(sorted);
      return { success: true, message: "Class created successfully", data: data.data };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Update class ───────────────────────────────────────────────
  const updateClass = async (
    id: string,
    input: Partial<CreateClassInput>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to update" };

      ClassService.invalidateCache();
      if (_classesCache) {
        _classesCache = _classesCache.map(c => c._id === id ? data.data : c);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_classesCache!));
      } else {
        invalidateCache();
      }

      setClasses((prev) => prev.map((c) => (c._id === id ? data.data : c)));
      return { success: true, message: "Class updated successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Delete class ───────────────────────────────────────────────
  const deleteClass = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to delete" };

      ClassService.invalidateCache();
      if (_classesCache) {
        _classesCache = _classesCache.filter(c => c._id !== id);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_classesCache!));
      } else {
        invalidateCache();
      }

      setClasses((prev) => prev.filter((c) => c._id !== id));
      return { success: true, message: "Class deleted successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Get single class ───────────────────────────────────────────
  const getClass = async (id: string): Promise<ApiClass | null> => {
    try {
      const res = await fetch(`/api/classes/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) return null;
      return data.data;
    } catch {
      return null;
    }
  };

  return {
    classes,
    isLoading,
    error,
    total,
    totalPages,
    currentPage,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    getClass,
  };
}
