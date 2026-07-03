"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";

export interface ApiHomeworkSubmission {
  student_id: {
    _id: string;
    name: string;
  } | string;
  content: string;
  submitted_at: string;
  grade?: string;
  feedback?: string;
  remarks?: string;
}

export interface ApiHomework {
  _id: string;
  school_id: string;
  class_id: {
    _id: string;
    name: string;
    section: string;
  } | string;
  subject_id: {
    _id: string;
    name: string;
  } | string;
  teacher_id: {
    _id: string;
    name: string;
  } | string;
  title: string;
  description?: string;
  assigned_date: string;
  due_date: string;
  attachment_url?: string;
  status: "draft" | "published" | "completed";
  submissions: ApiHomeworkSubmission[];
}

export function useHomework(
  classId?: string,
  options?: { skip?: boolean; initialPage?: number; initialPageSize?: number }
) {
  const [homework, setHomework] = useState<ApiHomework[]>([]);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(options?.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(options?.initialPageSize ?? 25));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { academicYear } = useAppState();

  const fetchHomework = useCallback(async (cId?: string, pNum = page, pSize = pageSize) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cId) params.set("classId", cId);
      if (academicYear) params.set("academic_year", academicYear);
      params.set("page", pNum.toString());
      params.set("limit", pSize.toString());

      const res = await fetch(`/api/homework?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch homework");
      setHomework(data.data.homeworks);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load homework");
    } finally {
      setIsLoading(false);
    }
  }, [academicYear, page, pageSize]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [classId]);

  const authReady = useAuthReady();
  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchHomework(classId, page, pageSize);
  }, [fetchHomework, classId, page, pageSize, options?.skip, authReady]);

  const createHomework = async (input: {
    title: string;
    description: string;
    classId: string;
    subject: string;
    dueDate: string;
    attachmentUrl?: string;
    status?: string;
  }): Promise<{ success: boolean; message: string; data?: ApiHomework }> => {
    try {
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to assign homework" };
      
      setHomework((prev) => [data.data, ...prev]);
      return { success: true, message: "Homework assigned successfully", data: data.data };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const submitHomework = async (
    homeworkId: string,
    studentId: string | undefined,
    content: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/homework/${homeworkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "submit", studentId, content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to submit work" };
      
      // Update local state
      setHomework((prev) =>
        prev.map((hw) => (hw._id === homeworkId ? data.data : hw))
      );
      return { success: true, message: "Homework response submitted successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const gradeHomework = async (
    homeworkId: string,
    studentId: string,
    grade: string,
    feedback?: string,
    remarks?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/homework/${homeworkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "grade", studentId, grade, feedback, remarks }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to grade work" };

      // Update local state
      setHomework((prev) =>
        prev.map((hw) => (hw._id === homeworkId ? data.data : hw))
      );
      return { success: true, message: "Homework graded successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const markCompleted = async (homeworkId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/homework/${homeworkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to mark homework as completed" };

      // Update local state
      setHomework((prev) =>
        prev.map((hw) => (hw._id === homeworkId ? data.data : hw))
      );
      return { success: true, message: "Homework marked as completed" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const publishHomework = async (homeworkId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/homework/${homeworkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to publish homework" };

      // Update local state
      setHomework((prev) =>
        prev.map((hw) => (hw._id === homeworkId ? data.data : hw))
      );
      return { success: true, message: "Homework published successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const deleteHomework = async (homeworkId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/homework/${homeworkId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed to delete" };

      setHomework((prev) => {
        const nextList = prev.filter((hw) => hw._id !== homeworkId);
        if (nextList.length === 0 && page > 1) {
          setPage((p) => p - 1);
        }
        return nextList;
      });
      setTotal((t) => Math.max(0, t - 1));
      return { success: true, message: "Homework deleted successfully" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  return {
    homework,
    isLoading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    fetchHomework,
    createHomework,
    submitHomework,
    gradeHomework,
    markCompleted,
    publishHomework,
    deleteHomework,
  };
}
