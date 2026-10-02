"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import { cacheSync, invalidateCache as syncInvalidateCache } from "@/lib/utils/cache-sync";

// ─── Types ────────────────────────────────────────────────────────
export interface ApiStudent {
  _id: string;
  school_id: { _id: string; name: string; subdomain?: string; slug?: string; logo_url?: string } | string;
  class_id: { _id: string; name: string; section: string } | string;
  name: string;
  roll_no?: string;
  gender?: "male" | "female" | "other";
  dob?: string;
  blood_group?: string;
  photo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: string;
  guardian_email?: string;
  admission_date?: string;
  admission_no?: string;
  academic_year?: string;
  is_active: boolean;
  parent_id?: { _id: string; name: string; phone?: string; email?: string; relation?: string; photo_url?: string; occupation?: string; address?: string; user_id?: any } | string | null;
  user_id?: { _id: string; name: string; email: string; role: string; is_active: boolean } | string | null;
  createdAt?: string;

  religion?: string;
  caste?: string;
  category?: string;
  mother_tongue?: string;
  languages?: string[];
  prev_school_name?: string;
  prev_school_address?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_ifsc?: string;
  allergies?: string[];
  medications?: string[];
  medical_notes?: string;
  house?: string;
  medical_cert?: { name: string; url: string } | null;
  migration_cert?: { name: string; url: string } | null;
  transfer_cert?: { name: string; url: string } | null;
  birth_cert?: { name: string; url: string } | null;
  father_name?: string;
  father_phone?: string;
  father_email?: string;
  father_occupation?: string;
  father_photo?: string;
  mother_name?: string;
  mother_phone?: string;
  mother_email?: string;
  mother_occupation?: string;
  mother_photo?: string;
  guardian_type?: string;
  guardian_occupation?: string;
  guardian_address?: string;
  guardian_photo?: string;
  permanent_address?: string;
  other_info?: string;
  aadhaar_no?: string;
}

export interface CreateStudentInput {
  name: string;
  email?: string;
  class_id: string;
  roll_no?: string;
  gender?: string;
  dob?: string;
  blood_group?: string;
  address?: string;
  phone?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: string;
  guardian_email?: string;
  admission_no?: string;
  academic_year?: string;
  photo_url?: string;
  aadhaar_no?: string;
}

// ─── Module-level cache (shared across all useStudents() instances) ──
const SESSION_STUDENTS_PREFIX = "sm_paged_students_";
const SESSION_STUDENT_DETAIL_PREFIX = "sm_student_detail_";

let _studentsCache: ApiStudent[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds
const _pagedQueryCache = new Map<string, { students: ApiStudent[]; total: number; timestamp: number }>();
const _studentsInFlight = new Map<string, Promise<any>>();
let _version = 0; // bumped after every mutation
const _listeners = new Set<(students: ApiStudent[]) => void>();
const _versionListeners = new Set<(v: number) => void>();

function getPagedQueryCache(key: string): { students: ApiStudent[]; total: number; timestamp: number } | null {
  const mem = _pagedQueryCache.get(key);
  if (mem && (Date.now() - mem.timestamp) < CACHE_TTL_MS) return mem;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(SESSION_STUDENTS_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          _pagedQueryCache.set(key, parsed);
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

function invalidateCache(singleId?: string) {
  _studentsCache = null;
  _cacheTimestamp = 0;
  _pagedQueryCache.clear();
  _studentsInFlight.clear();
  if (typeof window !== "undefined") {
    try {
      if (singleId) {
        sessionStorage.removeItem(SESSION_STUDENT_DETAIL_PREFIX + singleId);
      }
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith(SESSION_STUDENTS_PREFIX)) {
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

export function getStoredStudent(id: string): ApiStudent | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const direct = sessionStorage.getItem(SESSION_STUDENT_DETAIL_PREFIX + id);
    if (direct) return JSON.parse(direct);

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(SESSION_STUDENTS_PREFIX)) {
        const val = sessionStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (parsed.students && Array.isArray(parsed.students)) {
            const match = parsed.students.find((s: any) => s._id === id);
            if (match) {
              sessionStorage.setItem(SESSION_STUDENT_DETAIL_PREFIX + id, JSON.stringify(match));
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
export function useStudents(options?: { skip?: boolean }) {
  const [students, setStudents] = useState<ApiStudent[]>(() => {
    if (_studentsCache && _studentsCache.length > 0) return _studentsCache;
    if (typeof window !== "undefined") {
      try {
        // Try any recent paged query from sessionStorage (most-recently cached wins)
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(SESSION_STUDENTS_PREFIX)) {
            const raw = sessionStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (
                parsed.students &&
                parsed.students.length > 0 &&
                Date.now() - (parsed.timestamp ?? 0) < CACHE_TTL_MS
              ) {
                return parsed.students;
              }
            }
          }
        }
      } catch {}
    }
    return [];
  });
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(_studentsCache === null);
  const [error, setError] = useState<string | null>(null);
  const [mutationVersion, setMutationVersion] = useState(_version);
  const abortControllerRef = useRef<AbortController | null>(null);
  const studentsRef = useRef(students);
  studentsRef.current = students;

  // Register/unregister this instance as a listener for cache updates
  useEffect(() => {
    const listener = (data: ApiStudent[]) => setStudents(data);
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
    return cacheSync.subscribe("students", () => {
      invalidateCache();
      bumpVersion();
    });
  }, []);

  // ─── Fetch all students ─────────────────────────────────────────
  const fetchStudents = useCallback(async (
    arg1?: string | {
      search?: string;
      classId?: string;
      streamId?: string;
      sectionId?: string;
      gender?: string;
      status?: string;
      dateRange?: string;
      sort?: string;
      page?: number;
      limit?: number;
      academic_year?: string;
      section?: string;
      house?: string;
      admissionStatus?: string;
      school_id?: string;
    },
    arg2?: string
  ) => {
    let search = "";
    let classId = "";
    let streamId = "";
    let sectionId = "";
    let gender = "";
    let status = "";
    let dateRange = "";
    let sort = "";
    let page = 1;
    let limit = 12;
    let academic_year = "";
    let section = "";
    let house = "";
    let admissionStatus = "";
    let school_id = "";

    const isObject = arg1 && typeof arg1 === "object";
    const p = (isObject ? arg1 : {}) as any;

    if (isObject) {
      search = p.search ?? "";
      classId = p.classId ?? "";
      streamId = p.streamId ?? "";
      sectionId = p.sectionId ?? "";
      gender = p.gender ?? "";
      status = p.status ?? "";
      dateRange = p.dateRange ?? "";
      sort = p.sort ?? "";
      page = p.page ?? 1;
      // If caller explicitly passes limit, use it.
      // If caller passes page (pagination mode), default to 10 per page.
      // Otherwise cap at 500 — never fetch unbounded records.
      limit = p.limit ?? (p.page ? 10 : 500);
      academic_year = p.academic_year ?? "";
      section = p.section ?? "";
      house = p.house ?? "";
      admissionStatus = p.admissionStatus ?? "";
      school_id = p.school_id ?? "";
    } else {
      search = (arg1 as string) ?? "";
      classId = arg2 ?? "";
      // Legacy string-path: cap at 500 to avoid unbounded fetches
      limit = 500;
    }

    // academic_year alone does NOT count as a filter — it's the default context key.
    // Only real search/filter params should bypass the module-level cache.
    const isFiltered = !!(search || classId || streamId || sectionId || school_id ||
      (gender && gender !== "all") ||
      (status && status !== "all") ||
      (dateRange && dateRange !== "All Time") ||
      sort ||
      (section && section !== "all") ||
      (house && house !== "all") ||
      (admissionStatus && admissionStatus !== "all") ||
      (isObject && (p.page || p.search || p.classId || p.streamId || p.sectionId || p.gender || p.status || p.section || p.house || p.admissionStatus || p.school_id)));
    const isFresh = _studentsCache !== null && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS;

    // Use cache only for unfiltered legacy fetch
    if (isFresh && !isFiltered) {
      setStudents(_studentsCache!);
      setTotal(_studentsCache!.length);
      setIsLoading(false);
      return { students: _studentsCache!, total: _studentsCache!.length, page: 1, limit: 10 };
    }

    const params = new URLSearchParams();
    if (school_id && school_id !== "all") params.set("school_id", school_id);
    if (search) params.set("search", search);
    if (classId && classId !== "all") params.set("class_id", classId);
    if (streamId) params.set("stream_id", streamId);
    if (sectionId) params.set("section_id", sectionId);
    if (gender && gender !== "all" && gender !== "Select") params.set("gender", gender);
    if (status && status !== "all" && status !== "Select") params.set("status", status);
    if (dateRange && dateRange !== "All Time") params.set("dateRange", dateRange);
    if (sort) params.set("sort", sort);
    if (academic_year) params.set("academic_year", academic_year);
    if (section && section !== "all") params.set("section", section);
    if (house && house !== "all") params.set("house", house);
    if (admissionStatus && admissionStatus !== "all") params.set("admission_status", admissionStatus);
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    const cacheKey = params.toString();
    const cachedQuery = getPagedQueryCache(cacheKey);
    if (cachedQuery) {
      setStudents(cachedQuery.students);
      setTotal(cachedQuery.total);
      setIsLoading(false);
      return {
        students: cachedQuery.students,
        total: cachedQuery.total,
        page,
        limit,
      };
    }

    // Reuse identical query already in-flight (prevents strict-mode canceled requests)
    if (_studentsInFlight.has(cacheKey)) {
      setIsLoading(true);
      const inFlightRes = await _studentsInFlight.get(cacheKey)!;
      if (inFlightRes) {
        setStudents(inFlightRes.students);
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
        const res = await fetch(`/api/students?${cacheKey}`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

        const queryEntry = {
          students: data.data.students,
          total: data.data.total ?? data.data.students.length,
          timestamp: Date.now(),
        };
        _pagedQueryCache.set(cacheKey, queryEntry);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(SESSION_STUDENTS_PREFIX + cacheKey, JSON.stringify(queryEntry));
          } catch {}
        }

        // Only cache the full unfiltered legacy list
        if (!isFiltered) {
          _studentsCache = data.data.students;
          _cacheTimestamp = Date.now();
          _listeners.forEach(fn => fn(data.data.students));
        }

        setStudents(data.data.students);
        setTotal(data.data.total ?? data.data.students.length);
        return {
          students: data.data.students,
          total: data.data.total ?? data.data.students.length,
          page: data.data.page ?? page,
          limit: data.data.limit ?? limit,
        };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        setError(err instanceof Error ? err.message : "Failed to load students");
        return null;
      } finally {
        _studentsInFlight.delete(cacheKey);
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    })();

    _studentsInFlight.set(cacheKey, fetchPromise);
    return await fetchPromise;
  }, []);

  const { academicYear } = useAppState();
  const authReady = useAuthReady();

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage

    // SWR: serve from module/sessionStorage cache immediately, then revalidate in background
    const cacheKey = new URLSearchParams(
      Object.fromEntries([
        ["academic_year", academicYear],
        ["page", "1"],
        ["limit", "12"],
      ])
    ).toString();
    const isFresh =
      _pagedQueryCache.has(cacheKey) &&
      Date.now() - (_pagedQueryCache.get(cacheKey)?.timestamp ?? 0) < 30_000;
    if (isFresh) return; // Fresh within 30s — skip redundant network hit

    // Default fetch: small page (12) to keep payload lean — pages that need more fetch explicitly.
    fetchStudents({ academic_year: academicYear, limit: 12, page: 1 });
  }, [fetchStudents, options?.skip, academicYear, authReady, mutationVersion]);

  // ─── Create student ─────────────────────────────────────────────
  const createStudent = async (input: CreateStudentInput): Promise<{ success: boolean; message: string; data?: ApiStudent; credentials?: { loginId: string; password?: string } }> => {
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to create" };

      // Instantly update local state in current hook instance
      if (data.data) {
        setStudents(prev => [data.data, ...prev]);
        setTotal(prev => prev + 1);
      }

      // Update module cache and broadcast to all hook instances
      const newList = [data.data, ...(_studentsCache ?? [])];
      _studentsCache = newList;
      _cacheTimestamp = Date.now();
      _listeners.forEach(fn => fn(newList));

      invalidateCache();
      bumpVersion();
      syncInvalidateCache("students");

      return { success: true, message: "Student created successfully", data: data.data, credentials: data.credentials };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Update student ─────────────────────────────────────────────
  const updateStudent = async (id: string, input: Partial<CreateStudentInput & { is_active: boolean }>): Promise<{ success: boolean; message: string; data?: ApiStudent }> => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to update" };

      const updatedStudent = data.data;

      // Instantly update local state in current hook instance
      if (updatedStudent) {
        setStudents(prev => prev.map(s => s._id === id ? { ...s, ...updatedStudent } : s));
      }

      // Update in cache and broadcast
      if (_studentsCache) {
        _studentsCache = _studentsCache.map(s => s._id === id ? (updatedStudent || s) : s);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_studentsCache!));
      }

      invalidateCache(id);
      bumpVersion();
      syncInvalidateCache("students");

      if (typeof window !== "undefined" && updatedStudent) {
        try {
          sessionStorage.setItem(SESSION_STUDENT_DETAIL_PREFIX + id, JSON.stringify(updatedStudent));
        } catch {}
      }

      return { success: true, message: "Student updated successfully", data: updatedStudent };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Delete student (soft) ──────────────────────────────────────
  const deleteStudent = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Optimistic update: instantly remove from UI
      setStudents(prev => prev.filter(s => s._id !== id));
      setTotal(prev => Math.max(0, prev - 1));

      const res = await fetch(`/api/students/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        invalidateCache(id);
        bumpVersion();
        return { success: false, message: data.message || "Failed to delete" };
      }

      // Remove from module cache and broadcast
      if (_studentsCache) {
        _studentsCache = _studentsCache.filter(s => s._id !== id);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_studentsCache!));
      }

      invalidateCache(id);
      bumpVersion();
      syncInvalidateCache("students");

      return { success: true, message: "Student deleted successfully" };
    } catch {
      invalidateCache(id);
      bumpVersion();
      return { success: false, message: "Network error" };
    }
  };

  // ─── Get single student ─────────────────────────────────────────
  const getStudent = useCallback(async (id: string): Promise<ApiStudent | null> => {
    if (!id) return null;
    // 1. Instant local lookup if already in module cache or state
    let local: ApiStudent | null | undefined = _studentsCache?.find((s) => s._id === id) || studentsRef.current.find((s) => s._id === id);

    // 2. Instant lookup in sessionStorage (detail or paged items)
    if (!local && typeof window !== "undefined") {
      local = getStoredStudent(id);
    }

    try {
      const res = await fetch(`/api/students/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return local ?? null;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(SESSION_STUDENT_DETAIL_PREFIX + id, JSON.stringify(data.data));
        } catch {}
      }
      return data.data;
    } catch {
      return local ?? null;
    }
  }, []);

  return {
    students,
    total,
    isLoading,
    error,
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    getStudent,
  };
}
