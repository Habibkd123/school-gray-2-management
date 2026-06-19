"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
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
}

// ─── Module-level cache (shared across all useStudents() instances) ──
let _studentsCache: ApiStudent[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds
const _listeners = new Set<(students: ApiStudent[]) => void>();

function invalidateCache() {
  _studentsCache = null;
  _cacheTimestamp = 0;
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useStudents(options?: { skip?: boolean }) {
  const [students, setStudents] = useState<ApiStudent[]>(_studentsCache ?? []);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(_studentsCache === null);
  const [error, setError] = useState<string | null>(null);

  // Register/unregister this instance as a listener for cache updates
  useEffect(() => {
    const listener = (data: ApiStudent[]) => setStudents(data);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  // ─── Fetch all students ─────────────────────────────────────────
  const fetchStudents = useCallback(async (
    arg1?: string | {
      search?: string;
      classId?: string;
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
    let gender = "";
    let status = "";
    let dateRange = "";
    let sort = "";
    let page = 1;
    let limit = 10;
    let academic_year = "";

    const isObject = arg1 && typeof arg1 === "object";

    if (isObject) {
      const p = arg1 as any;
      search = p.search ?? "";
      classId = p.classId ?? "";
      gender = p.gender ?? "";
      status = p.status ?? "";
      dateRange = p.dateRange ?? "";
      sort = p.sort ?? "";
      page = p.page ?? 1;
      limit = p.limit ?? 10;
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
      return { students: _studentsCache!, total: _studentsCache!.length, page: 1, limit: 500 };
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (classId && classId !== "all") params.set("class_id", classId);
      if (gender && gender !== "all" && gender !== "Select") params.set("gender", gender);
      if (status && status !== "all" && status !== "Select") params.set("status", status);
      if (dateRange && dateRange !== "All Time") params.set("dateRange", dateRange);
      if (sort) params.set("sort", sort);
      if (academic_year) params.set("academic_year", academic_year);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/students?${params.toString()}`, {
        headers: getAuthHeaders(),
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
      setError(err instanceof Error ? err.message : "Failed to load students");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { academicYear } = useAppState();

  useEffect(() => {
    if (options?.skip) return;
    fetchStudents({ academic_year: academicYear });
  }, [fetchStudents, options?.skip, academicYear]);

  // ─── Create student ─────────────────────────────────────────────
  const createStudent = async (input: CreateStudentInput): Promise<{ success: boolean; message: string; data?: ApiStudent }> => {
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

      return { success: true, message: "Student created successfully", data: data.data };
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

      return { success: true, message: "Student deleted successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Get single student ─────────────────────────────────────────
  const getStudent = async (id: string): Promise<ApiStudent | null> => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        headers: getAuthHeaders(),
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
