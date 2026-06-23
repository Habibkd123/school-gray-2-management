"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface ApiGrade {
  _id: string;
  school_id: string;
  grade_name: string;
  marks_from: number;
  marks_upto: number;
  grade_points: number;
  status: "Active" | "Inactive";
  description?: string;
  createdAt?: string;
}

export function useGrades() {
  const [grades, setGrades] = useState<ApiGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/grades", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch grades");
      setGrades(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grades");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authReady = useAuthReady();
  useEffect(() => {
    if (!authReady) return;
    fetchGrades();
  }, [fetchGrades, authReady]);

  const createGrade = async (payload: Partial<ApiGrade>) => {
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create grade");
      await fetchGrades();
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateGrade = async (id: string, payload: Partial<ApiGrade>) => {
    try {
      const res = await fetch(`/api/grades/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update grade");
      await fetchGrades();
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const deleteGrade = async (id: string) => {
    try {
      const res = await fetch(`/api/grades/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete grade");
      await fetchGrades();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return {
    grades,
    isLoading,
    error,
    fetchGrades,
    createGrade,
    updateGrade,
    deleteGrade,
  };
}
