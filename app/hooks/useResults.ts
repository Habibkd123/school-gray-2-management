"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

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

  // ─── Fetch results ──────────────────────────────────────────────
  const fetchResults = useCallback(async (params?: { exam_id?: string; student_id?: string; class_id?: string }) => {
    setIsLoading(true);
    setResults([]);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params?.exam_id) query.set("exam_id", params.exam_id);
      if (params?.student_id) query.set("student_id", params.student_id);
      if (params?.class_id) query.set("class_id", params.class_id);

      const res = await fetch(`/api/results?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch results");
      setResults(data.data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authReady = useAuthReady();
  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchResults();
  }, [fetchResults, options?.skip, authReady]);

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
      await fetchResults();
      return { success: true, message: "Result saved successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  return { results, isLoading, error, fetchResults, createResult };
}
