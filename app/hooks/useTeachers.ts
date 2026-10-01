"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { TeacherService } from "@/app/services/TeacherService";
import { cacheSync, invalidateCache as syncInvalidateCache } from "@/lib/utils/cache-sync";

// ─── Types ────────────────────────────────────────────────────────
export interface ApiTeacher {
  _id: string;
  /** @deprecated use _id */
  id?: string;
  school_id: string;
  user_id?: string | { _id: string; name: string; email: string; role: string; is_active: boolean } | null;
  name: string;
  employee_id?: string;
  gender?: "male" | "female" | "other";
  dob?: string;
  phone?: string;
  email?: string;
  address?: string;
  photo_url?: string;
  blood_group?: string;
  qualification?: string;
  subject_specialization?: string;
  expertise?: string[];            // multi-select specializations
  /** alias for subject_specialization */
  subject?: string;
  experience_years: number;
  join_date: string;
  languages?: string[];
  training_details?: string[];
  aadhaar_front_url?: string;
  aadhaar_back_url?: string;
  is_active: boolean;
  class_id?: { _id: string; name: string; section: string } | string;
  class_ids?: Array<{ _id: string; name: string; section: string } | string>;
  /** alias for class_id */
  classId?: string;
  department?: string;
  designation?: string;
  createdAt?: string;

  // Family Info
  father_name?: string;
  mother_name?: string;
  marital_status?: string;

  // Previous Experience Info
  previous_school_name?: string;
  previous_school_address?: string;
  previous_school_phone?: string;

  // Additional Address
  permanent_address?: string;

  // Custom IDs
  pan_number?: string;
  notes?: string;

  // Payroll / Work Details
  epf_no?: string;
  basic_salary?: number;
  contract_type?: string;
  work_shift?: string;
  work_location?: string;
  date_of_leaving?: string;

  // Leave Entitlements
  medical_leaves?: number;
  casual_leaves?: number;
  maternity_leaves?: number;
  sick_leaves?: number;

  // Bank Info
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  branch_name?: string;

  // Transport Info
  transport_route?: string;
  transport_vehicle?: string;
  transport_pickup_point?: string;

  // Hostel Info
  hostel_name?: string;
  hostel_room_no?: string;

  // Social Links
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  twitter_url?: string;

  // File Uploads
  resume_url?: string;
  joining_letter_url?: string;
}

export interface CreateTeacherInput {
  name: string;
  employee_id?: string;
  gender?: string;
  dob?: string;
  phone?: string;
  email?: string;
  address?: string;
  photo_url?: string;
  blood_group?: string;
  qualification?: string;
  subject_specialization?: string;
  expertise?: string[];
  experience_years?: number;
  join_date?: string;
  languages?: string[];
  password?: string;
  class_id?: string;
  class_ids?: string[];

  // Family Info
  father_name?: string;
  mother_name?: string;
  marital_status?: string;

  // Previous Experience Info
  previous_school_name?: string;
  previous_school_address?: string;
  previous_school_phone?: string;

  // Additional Address
  permanent_address?: string;

  // Custom IDs
  pan_number?: string;
  notes?: string;

  // Payroll / Work Details
  epf_no?: string;
  basic_salary?: number;
  contract_type?: string;
  work_shift?: string;
  work_location?: string;
  date_of_leaving?: string;

  // Leave Entitlements
  medical_leaves?: number;
  casual_leaves?: number;
  maternity_leaves?: number;
  sick_leaves?: number;

  // Bank Info
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  branch_name?: string;

  // Transport Info
  transport_route?: string;
  transport_vehicle?: string;
  transport_pickup_point?: string;

  // Hostel Info
  hostel_name?: string;
  hostel_room_no?: string;

  // Social Links
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  twitter_url?: string;

  // File Uploads
  resume_url?: string;
  joining_letter_url?: string;
}

// ─── Module-level cache (shared across all useTeachers() instances) ─
const SESSION_TEACHERS_PREFIX = "sm_paged_teachers_";
const SESSION_TEACHER_DETAIL_PREFIX = "sm_teacher_detail_";

let _teachersCache: ApiTeacher[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds
const _pagedTeacherQueryCache = new Map<string, { teachers: ApiTeacher[]; total: number; timestamp: number }>();
const _teachersInFlight = new Map<string, Promise<any>>();
let _version = 0; // bumped after every mutation
const _listeners = new Set<(teachers: ApiTeacher[]) => void>();
const _versionListeners = new Set<(v: number) => void>();

function getPagedTeacherQueryCache(key: string): { teachers: ApiTeacher[]; total: number; timestamp: number } | null {
  const mem = _pagedTeacherQueryCache.get(key);
  if (mem && (Date.now() - mem.timestamp) < CACHE_TTL_MS) return mem;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(SESSION_TEACHERS_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          _pagedTeacherQueryCache.set(key, parsed);
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

function invalidateCache(singleId?: string) {
  _teachersCache = null;
  _cacheTimestamp = 0;
  _pagedTeacherQueryCache.clear();
  _teachersInFlight.clear();
  if (typeof window !== "undefined") {
    try {
      if (singleId) {
        sessionStorage.removeItem(SESSION_TEACHER_DETAIL_PREFIX + singleId);
      }
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith(SESSION_TEACHERS_PREFIX)) {
          sessionStorage.removeItem(k);
        }
      });
    } catch {}
  }
}

function bumpVersion() {
  _version++;
  _versionListeners.forEach(fn => fn(_version));
}

export function getStoredTeacher(id: string): ApiTeacher | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const direct = sessionStorage.getItem(SESSION_TEACHER_DETAIL_PREFIX + id);
    if (direct) return JSON.parse(direct);

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(SESSION_TEACHERS_PREFIX)) {
        const val = sessionStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (parsed.teachers && Array.isArray(parsed.teachers)) {
            const match = parsed.teachers.find((t: any) => t._id === id);
            if (match) {
              sessionStorage.setItem(SESSION_TEACHER_DETAIL_PREFIX + id, JSON.stringify(match));
              return match;
            }
          }
        }
      }
    }
  } catch {}
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useTeachers(options?: { skip?: boolean; limit?: number | "all" }) {
  const [teachers, setTeachers] = useState<ApiTeacher[]>(() => {
    if (_teachersCache && _teachersCache.length > 0) return _teachersCache;
    if (typeof window !== "undefined") {
      try {
        const cleanKey = "sort=Ascending&academic_year=2026-2027&page=1&limit=12";
        const legacyKey = "sort=Ascending&academic_year=2026-2027&department=all&designation=all&page=1&limit=12";
        const stored = sessionStorage.getItem(SESSION_TEACHERS_PREFIX + cleanKey) || sessionStorage.getItem(SESSION_TEACHERS_PREFIX + legacyKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.teachers && parsed.teachers.length > 0) {
            return parsed.teachers;
          }
        }
        // Fallback: check any cached teachers query in sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(SESSION_TEACHERS_PREFIX)) {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.teachers && parsed.teachers.length > 0) return parsed.teachers;
            }
          }
        }
      } catch {}
    }
    return [];
  });
  const [total, setTotal] = useState<number>(() => {
    if (_teachersCache && _teachersCache.length > 0) return _teachersCache.length;
    if (typeof window !== "undefined") {
      try {
        const cleanKey = "sort=Ascending&academic_year=2026-2027&page=1&limit=12";
        const legacyKey = "sort=Ascending&academic_year=2026-2027&department=all&designation=all&page=1&limit=12";
        const stored = sessionStorage.getItem(SESSION_TEACHERS_PREFIX + cleanKey) || sessionStorage.getItem(SESSION_TEACHERS_PREFIX + legacyKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed.total === "number") return parsed.total;
        }
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(SESSION_TEACHERS_PREFIX)) {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (typeof parsed.total === "number") return parsed.total;
            }
          }
        }
      } catch {}
    }
    return 0;
  });
  const [isLoading, setIsLoading] = useState(() => _teachersCache === null && teachers.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [mutationVersion, setMutationVersion] = useState(_version);
  const authReady = useAuthReady();
  const abortControllerRef = useRef<AbortController | null>(null);
  const teachersRef = useRef(teachers);
  teachersRef.current = teachers;

  // Subscribe to cache broadcasts so all instances stay in sync
  useEffect(() => {
    const listener = (data: ApiTeacher[]) => setTeachers(data);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  // Subscribe to version bumps so all instances auto-refetch after mutations
  useEffect(() => {
    const vListener = (v: number) => setMutationVersion(v);
    _versionListeners.add(vListener);
    return () => { _versionListeners.delete(vListener); };
  }, []);

  // Cross-tab and central cache sync
  useEffect(() => {
    return cacheSync.subscribe("teachers", () => {
      invalidateCache();
      bumpVersion();
    });
  }, []);

  // ─── Fetch all teachers ─────────────────────────────────────────
  const fetchTeachers = useCallback(async (
    arg1?: string | {
      search?: string;
      status?: string;
      dateRange?: string;
      sort?: string;
      page?: number;
      limit?: number | "all";
      academic_year?: string;
      department?: string;
      designation?: string;
    }
  ) => {
    let search = "";
    let status = "";
    let dateRange = "";
    let sort = "";
    let page = 1;
    let limit: number | "all" = 12;
    let academic_year = "";
    let department = "";
    let designation = "";

    const isObject = arg1 && typeof arg1 === "object";
    const p = (isObject ? arg1 : {}) as any;

    if (isObject) {
      search = p.search ?? "";
      status = p.status ?? "";
      dateRange = p.dateRange ?? "";
      sort = p.sort ?? "";
      page = p.page ?? 1;
      limit = p.limit ?? (p.page ? 12 : "all");
      academic_year = p.academic_year ?? "";
      department = p.department ?? "";
      designation = p.designation ?? "";
    } else {
      search = (arg1 as string) ?? "";
      limit = "all"; // Legacy string-path / dropdowns: default to all teachers
    }

    const isFiltered = !!(search || (status && status !== "all") || (dateRange && dateRange !== "All Time") || sort || (isObject && (p.page || p.search || p.status || p.department || p.designation)));
    const isAll = limit === "all";

    if (isAll && !isFiltered) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);
      try {
        const data = await TeacherService.getAllTeachers();
        _teachersCache = data;
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(data));
        setTeachers(data);
        setTotal(data.length);
        return {
          teachers: data,
          total: data.length,
          page: 1,
          limit: 100000,
        };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        setError(err instanceof Error ? err.message : "Failed to load teachers");
        return null;
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    }

    const isFresh = _teachersCache !== null && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS;

    // Use cache only for unfiltered legacy fetch (same strategy as useStudents)
    if (isFresh && !isFiltered) {
      setTeachers(_teachersCache!);
      setTotal(_teachersCache!.length);
      setIsLoading(false);
      return { teachers: _teachersCache!, total: _teachersCache!.length };
    }

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all" && status !== "Select") params.set("status", status);
    if (dateRange && dateRange !== "All Time") params.set("dateRange", dateRange);
    if (sort) params.set("sort", sort);
    if (academic_year) params.set("academic_year", academic_year);
    if (department && department !== "all") params.set("department", department);
    if (designation && designation !== "all") params.set("designation", designation);
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    const cacheKey = params.toString();
    const cachedQuery = getPagedTeacherQueryCache(cacheKey);
    if (cachedQuery) {
      setTeachers(cachedQuery.teachers);
      setTotal(cachedQuery.total);
      setIsLoading(false);
      return {
        teachers: cachedQuery.teachers,
        total: cachedQuery.total,
        page,
        limit,
      };
    }

    // Reuse identical query already in-flight (prevents strict-mode canceled requests)
    if (_teachersInFlight.has(cacheKey)) {
      setIsLoading(true);
      const inFlightRes = await _teachersInFlight.get(cacheKey)!;
      if (inFlightRes) {
        setTeachers(inFlightRes.teachers);
        setTotal(inFlightRes.total);
      }
      setIsLoading(false);
      return inFlightRes;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/teachers?${cacheKey}`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

        const queryEntry = {
          teachers: data.data.teachers,
          total: data.data.total ?? data.data.teachers.length,
          timestamp: Date.now(),
        };
        _pagedTeacherQueryCache.set(cacheKey, queryEntry);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(SESSION_TEACHERS_PREFIX + cacheKey, JSON.stringify(queryEntry));
          } catch {}
        }

        // Only cache unfiltered results
        if (!isFiltered) {
          _teachersCache = data.data.teachers;
          _cacheTimestamp = Date.now();
          _listeners.forEach(fn => fn(data.data.teachers));
        }

        setTeachers(data.data.teachers);
        setTotal(data.data.total ?? data.data.teachers.length);
        return {
          teachers: data.data.teachers,
          total: data.data.total ?? data.data.teachers.length,
          page: data.data.page ?? page,
          limit: data.data.limit ?? limit,
        };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        setError(err instanceof Error ? err.message : "Failed to load teachers");
        return null;
      } finally {
        _teachersInFlight.delete(cacheKey);
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    })();

    _teachersInFlight.set(cacheKey, fetchPromise);
    return await fetchPromise;
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage

    // SWR: skip fetching if TeacherService already has fresh data in memory or sessionStorage
    if (_teachersCache !== null && Date.now() - _cacheTimestamp < 30_000) {
      // Already fresh within 30s — no need to re-fetch
      if (teachers.length === 0) {
        setTeachers(_teachersCache);
        setTotal(_teachersCache.length);
        setIsLoading(false);
      }
      return;
    }

    fetchTeachers({ limit: options?.limit });
  }, [fetchTeachers, options?.skip, options?.limit, authReady, mutationVersion]);

  // ─── Create teacher ─────────────────────────────────────────────
  const createTeacher = async (input: CreateTeacherInput): Promise<{ success: boolean; message: string; data?: ApiTeacher; credentials?: { loginId: string; password?: string } }> => {
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to create" };

      TeacherService.invalidateCache();
      const newList = [data.data, ...(_teachersCache ?? [])];
      _teachersCache = newList;
      _cacheTimestamp = Date.now();
      _listeners.forEach(fn => fn(newList));

      invalidateCache();
      bumpVersion();
      syncInvalidateCache("teachers");

      setTeachers((prev) => [data.data, ...prev]);
      return { success: true, message: "Teacher created successfully", data: data.data, credentials: data.credentials };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Update teacher ─────────────────────────────────────────────
  const updateTeacher = async (id: string, input: Partial<CreateTeacherInput & { is_active: boolean }>): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to update" };

      TeacherService.invalidateCache();
      if (_teachersCache) {
        _teachersCache = _teachersCache.map(t => t._id === id ? data.data : t);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_teachersCache!));
      }

      invalidateCache(id);
      bumpVersion();
      syncInvalidateCache("teachers");

      if (typeof window !== "undefined" && data.data) {
        try {
          sessionStorage.setItem(SESSION_TEACHER_DETAIL_PREFIX + id, JSON.stringify(data.data));
        } catch {}
      }

      setTeachers((prev) => prev.map((t) => (t._id === id ? data.data : t)));
      return { success: true, message: "Teacher updated successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Delete teacher ─────────────────────────────────────────────
  const deleteTeacher = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Optimistically remove from state
      setTeachers((prev) => prev.filter((t) => t._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));

      const res = await fetch(`/api/teachers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        invalidateCache(id);
        bumpVersion();
        return { success: false, message: data.message || "Failed to delete" };
      }

      TeacherService.invalidateCache();
      if (_teachersCache) {
        _teachersCache = _teachersCache.filter(t => t._id !== id);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_teachersCache!));
      }

      invalidateCache(id);
      bumpVersion();
      syncInvalidateCache("teachers");

      return { success: true, message: "Teacher deleted successfully" };
    } catch {
      invalidateCache(id);
      bumpVersion();
      return { success: false, message: "Network error" };
    }
  };

  // ─── Get single teacher ─────────────────────────────────────────
  const getTeacher = useCallback(async (id: string): Promise<ApiTeacher | null> => {
    if (!id) return null;

    // 1. Instant local lookup if already in module cache or state
    let local: ApiTeacher | null | undefined = _teachersCache?.find((t) => t._id === id) || teachersRef.current.find((t) => t._id === id);

    // 2. Instant lookup in sessionStorage (detail or paged items)
    if (!local && typeof window !== "undefined") {
      local = getStoredTeacher(id);
    }

    // 3. If we have cached data, return it immediately and refresh in background
    if (local) {
      // Background refresh — update cache silently without blocking the caller
      fetch(`/api/teachers/${id}`, { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.success && data.data) {
            // Update sessionStorage with fresh data
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem(SESSION_TEACHER_DETAIL_PREFIX + id, JSON.stringify(data.data));
              } catch {}
            }
            // Update module cache if present
            if (_teachersCache) {
              _teachersCache = _teachersCache.map(t => t._id === id ? data.data : t);
            }
          }
        })
        .catch(() => {});
      return local;
    }

    // 4. No cache — must fetch and wait
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return null;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(SESSION_TEACHER_DETAIL_PREFIX + id, JSON.stringify(data.data));
        } catch {}
      }
      return data.data;
    } catch {
      return null;
    }
  }, []);

  return {
    teachers,
    total,
    isLoading,
    error,
    fetchTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacher,
  };
}
