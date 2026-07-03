"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";

// ─── Types ────────────────────────────────────────────────────────
export interface ApiResult {
  _id: string;
  school_id: string;
  exam_id: { _id: string; name: string; type: string } | string;
  student_id: { _id: string; name: string; roll_no: string } | string;
  subject_id: { _id: string; name: string; code: string } | string;
  marks_obtained: number;
  total_marks: number;
  passing_marks?: number;
  grade?: string;
  is_pass?: boolean;
  remarks?: string;
  createdAt?: string;
}

export interface CreateResultInput {
  exam_id: string;
  student_id: string;
  subject_id: string;
  marks_obtained: number;
  total_marks: number;
  passing_marks?: number;
  grade?: string;
  remarks?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useResults(options?: { skip?: boolean }) {
  const [results, setResults] = useState<ApiResult[]>([]);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(25));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [activeFilters, setActiveFilters] = useState<{ exam_id?: string; student_id?: string; class_id?: string }>({});
  const filtersRef = useRef<{ exam_id?: string; student_id?: string; class_id?: string }>({});

  // ─── Fetch results ──────────────────────────────────────────────
  const fetchResults = useCallback(async (
    params?: { exam_id?: string; student_id?: string; class_id?: string },
    pNum = page,
    pSize = pageSize
  ) => {
    setIsLoading(true);
    setError(null);

    const finalParams = params !== undefined ? params : filtersRef.current;
    if (params !== undefined) {
      filtersRef.current = params;
      setActiveFilters(params);
    }

    try {
      const query = new URLSearchParams();
      if (finalParams?.exam_id) query.set("exam_id", finalParams.exam_id);
      if (finalParams?.student_id) query.set("student_id", finalParams.student_id);
      if (finalParams?.class_id) query.set("class_id", finalParams.class_id);
      
      query.set("page", pNum.toString());
      query.set("limit", pSize.toString());

      const res = await fetch(`/api/results?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch results");
      setResults(data.data.results);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  const authReady = useAuthReady();
  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchResults(undefined, page, pageSize);
  }, [fetchResults, page, pageSize, options?.skip, authReady]);

  // ─── Create result(s) ───────────────────────────────────────────
  const createResult = async (input: CreateResultInput | CreateResultInput[]): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to create" };
      await fetchResults(undefined, page, pageSize);
      return { success: true, message: "Result saved successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  return {
    results,
    isLoading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    activeFilters,
    setActiveFilters,
    fetchResults,
    createResult
  };
}
