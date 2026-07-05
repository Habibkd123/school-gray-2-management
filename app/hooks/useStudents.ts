"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";

// ─── Types ────────────────────────────────────────────────────────
export interface ApiStudent {
  _id: string;
  school_id: string;
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
let _studentsCache: ApiStudent[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds
let _version = 0; // bumped after every mutation
const _listeners = new Set<(students: ApiStudent[]) => void>();
const _versionListeners = new Set<(v: number) => void>();

function invalidateCache() {
  _studentsCache = null;
  _cacheTimestamp = 0;
}

function bumpVersion() {
  _version++;
  _versionListeners.forEach(fn => fn(_version));
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useStudents(options?: { skip?: boolean }) {
  const [students, setStudents] = useState<ApiStudent[]>(_studentsCache ?? []);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(_studentsCache === null);
  const [error, setError] = useState<string | null>(null);
  const [mutationVersion, setMutationVersion] = useState(_version);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    const isObject = arg1 && typeof arg1 === "object";

    if (isObject) {
      const p = arg1 as any;
      search = p.search ?? "";
      classId = p.classId ?? "";
      streamId = p.streamId ?? "";
      sectionId = p.sectionId ?? "";
      gender = p.gender ?? "";
      status = p.status ?? "";
      dateRange = p.dateRange ?? "";
      sort = p.sort ?? "";
      page = p.page ?? 1;
      limit = p.limit ?? 10; // Object-path default; explicit callers pass their own limit
      academic_year = p.academic_year ?? "";
    } else {
      search = (arg1 as string) ?? "";
      classId = arg2 ?? "";
      limit = 500; // Legacy pages fetch 500 records by default
    }

    const isFiltered = !!(search || classId || gender || status || dateRange || sort || isObject);
    const isFresh = _studentsCache !== null && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS;

    // Use cache only for unfiltered legacy fetch
    if (isFresh && !isFiltered) {
      setStudents(_studentsCache!);
      setTotal(_studentsCache!.length);
      setIsLoading(false);
      return { students: _studentsCache!, total: _studentsCache!.length, page: 1, limit: 10 };
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (classId && classId !== "all") params.set("class_id", classId);
      if (streamId) params.set("stream_id", streamId);
      if (sectionId) params.set("section_id", sectionId);
      if (gender && gender !== "all" && gender !== "Select") params.set("gender", gender);
      if (status && status !== "all" && status !== "Select") params.set("status", status);
      if (dateRange && dateRange !== "All Time") params.set("dateRange", dateRange);
      if (sort) params.set("sort", sort);
      if (academic_year) params.set("academic_year", academic_year);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/students?${params.toString()}`, {
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

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
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  const { academicYear } = useAppState();
  const authReady = useAuthReady();

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage
    // Default to 25 for contexts that only need summary data (e.g. dashboard).
    // Pages that need all students call fetchStudents({ limit: <n> }) explicitly.
    fetchStudents({ academic_year: academicYear, limit: 25 });
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

      // Update cache and broadcast to all hook instances
      const newList = [data.data, ...(_studentsCache ?? [])];
      _studentsCache = newList;
      _cacheTimestamp = Date.now();
      _listeners.forEach(fn => fn(newList));
      bumpVersion();

      return { success: true, message: "Student created successfully", data: data.data, credentials: data.credentials };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Update student ─────────────────────────────────────────────
  const updateStudent = async (id: string, input: Partial<CreateStudentInput & { is_active: boolean }>): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to update" };

      // Update in cache and broadcast
      if (_studentsCache) {
        _studentsCache = _studentsCache.map(s => s._id === id ? data.data : s);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_studentsCache!));
      } else {
        invalidateCache();
      }
      bumpVersion();

      return { success: true, message: "Student updated successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Delete student (soft) ──────────────────────────────────────
  const deleteStudent = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to delete" };

      // Remove from cache and broadcast
      if (_studentsCache) {
        _studentsCache = _studentsCache.filter(s => s._id !== id);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_studentsCache!));
      } else {
        invalidateCache();
      }
      bumpVersion();

      return { success: true, message: "Student deleted successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Get single student ─────────────────────────────────────────
  const getStudent = async (id: string): Promise<ApiStudent | null> => {
    try {
      const res = await fetch(`/api/students/${id}?t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok || !data.success) return null;
      return data.data;
    } catch {
      return null;
    }
  };

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
