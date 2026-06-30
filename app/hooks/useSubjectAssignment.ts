"use client";

import { useState, useCallback } from "react";
import { getAuthHeaders } from "@/lib/utils/session";

export interface PopulatedAssignment {
  _id: string;
  school_id: string;
  academic_year: string;
  class_id?: { _id: string; name: string; class_code?: string; section?: string } | null;
  stream_id?: { _id: string; name: string } | null;
  subject_master_id: { _id: string; name: string; subject_code?: string };
  createdAt?: string;
}

export function useSubjectAssignment() {
  const [assignments, setAssignments] = useState<PopulatedAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAssignments = useCallback(async (params: {
    class_id?: string;
    stream_id?: string;
    academic_year?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    setIsLoading(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.class_id) qs.set("class_id", params.class_id);
      if (params.stream_id) qs.set("stream_id", params.stream_id);
      if (params.academic_year) qs.set("academic_year", params.academic_year);
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));

      const res = await fetch(`/api/subject-assignment?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

      setAssignments(data.data.assignments);
      setTotal(data.data.total ?? 0);
      setTotalPages(data.data.totalPages ?? 1);
      setCurrentPage(data.data.page ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAssignment = async (input: {
    academic_year: string;
    class_id?: string;
    stream_id?: string;
    subject_master_id?: string;
    subject_master_ids?: string[];
  }) => {
    try {
      const res = await fetch("/api/subject-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      return { success: true, message: "Subject assigned", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const updateAssignment = async (id: string, input: {
    academic_year?: string;
    class_id?: string;
    stream_id?: string;
    subject_master_id?: string;
  }) => {
    try {
      const res = await fetch(`/api/subject-assignment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to update" };
      return { success: true, message: "Assignment updated", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const res = await fetch(`/api/subject-assignment/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      setAssignments(prev => prev.filter(a => a._id !== id));
      return { success: true, message: "Assignment removed" };
    } catch { return { success: false, message: "Network error" }; }
  };

  return { assignments, isLoading, error, total, totalPages, currentPage, fetchAssignments, createAssignment, updateAssignment, deleteAssignment };
}
