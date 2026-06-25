"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

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
// Matches the pattern used in useStudents — prevents duplicate fetches
// when multiple components mount simultaneously.
let _teachersCache: ApiTeacher[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds
let _version = 0; // bumped after every mutation
const _listeners = new Set<(teachers: ApiTeacher[]) => void>();
const _versionListeners = new Set<(v: number) => void>();

function invalidateCache() {
  _teachersCache = null;
  _cacheTimestamp = 0;
}

function bumpVersion() {
  _version++;
  _versionListeners.forEach(fn => fn(_version));
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useTeachers(options?: { skip?: boolean }) {
  const [teachers, setTeachers] = useState<ApiTeacher[]>(_teachersCache ?? []);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(_teachersCache === null);
  const [error, setError] = useState<string | null>(null);
  const [mutationVersion, setMutationVersion] = useState(_version);
  const authReady = useAuthReady();

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

  // ─── Fetch all teachers ─────────────────────────────────────────
  const fetchTeachers = useCallback(async (
    arg1?: string | {
      search?: string;
      status?: string;
      dateRange?: string;
      sort?: string;
      page?: number;
      limit?: number;
      academic_year?: string;
    }
  ) => {
    let search = "";
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
      status = p.status ?? "";
      dateRange = p.dateRange ?? "";
      sort = p.sort ?? "";
      page = p.page ?? 1;
      limit = p.limit ?? 10;
      academic_year = p.academic_year ?? "";
    } else {
      search = (arg1 as string) ?? "";
      limit = 500;
    }

    const isFiltered = !!(search || status || dateRange || sort || academic_year || isObject);
    const isFresh = _teachersCache !== null && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS;

    // Use cache only for unfiltered legacy fetch (same strategy as useStudents)
    if (isFresh && !isFiltered) {
      setTeachers(_teachersCache!);
      setTotal(_teachersCache!.length);
      setIsLoading(false);
      return { teachers: _teachersCache!, total: _teachersCache!.length };
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status && status !== "all" && status !== "Select") params.set("status", status);
      if (dateRange && dateRange !== "All Time") params.set("dateRange", dateRange);
      if (sort) params.set("sort", sort);
      if (academic_year) params.set("academic_year", academic_year);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/teachers?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

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
      setError(err instanceof Error ? err.message : "Failed to load teachers");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage
    fetchTeachers();
  }, [fetchTeachers, options?.skip, authReady, mutationVersion]);

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

      const newList = [data.data, ...(_teachersCache ?? [])];
      _teachersCache = newList;
      _cacheTimestamp = Date.now();
      _listeners.forEach(fn => fn(newList));
      bumpVersion();

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

      if (_teachersCache) {
        _teachersCache = _teachersCache.map(t => t._id === id ? data.data : t);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_teachersCache!));
      } else {
        invalidateCache();
      }
      bumpVersion();

      setTeachers((prev) => prev.map((t) => (t._id === id ? data.data : t)));
      return { success: true, message: "Teacher updated successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Delete teacher ─────────────────────────────────────────────
  const deleteTeacher = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to delete" };

      if (_teachersCache) {
        _teachersCache = _teachersCache.filter(t => t._id !== id);
        _cacheTimestamp = Date.now();
        _listeners.forEach(fn => fn(_teachersCache!));
      } else {
        invalidateCache();
      }
      bumpVersion();

      setTeachers((prev) => prev.filter((t) => t._id !== id));
      return { success: true, message: "Teacher deleted successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ─── Get single teacher ─────────────────────────────────────────
  const getTeacher = async (id: string): Promise<ApiTeacher | null> => {
    try {
      const res = await fetch(`/api/teachers/${id}?t=${Date.now()}`, {
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
