"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

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

// Module-level client cache & in-flight deduplication
interface HomeworkPayload {
  homeworks: ApiHomework[];
  total: number;
  totalPages: number;
}
const _homeworkClientCache = new Map<string, { data: HomeworkPayload; timestamp: number }>();
const _homeworkInFlightClient = new Map<string, Promise<HomeworkPayload>>();
const HOMEWORK_CLIENT_TTL = 30_000;

function getHwCacheKey(cId?: string, year?: string, page = 1, limit = 25): string {
  return `hw_${cId || "all"}_${year || "all"}_${page}_${limit}`;
}

function getStoredHw(cacheKey: string): HomeworkPayload | null {
  const mem = _homeworkClientCache.get(cacheKey);
  if (mem) return mem.data;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`cache_${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.homeworks)) {
        _homeworkClientCache.set(cacheKey, { data: parsed, timestamp: Date.now() - 10_000 });
        return parsed;
      }
    }
  } catch {}
  return null;
}

function setStoredHw(cacheKey: string, data: HomeworkPayload) {
  _homeworkClientCache.set(cacheKey, { data, timestamp: Date.now() });
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`cache_${cacheKey}`, JSON.stringify(data));
    } catch {}
  }
}

export function useHomework(
  classId?: string,
  options?: { skip?: boolean; initialPage?: number; initialPageSize?: number }
) {
  const [page, setPage] = useState(options?.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(options?.initialPageSize ?? 25));
  const { academicYear } = useAppState();

  const cacheKey = getHwCacheKey(classId, academicYear, page, pageSize);
  const initialCached = options?.skip ? null : getStoredHw(cacheKey);

  const [homework, setHomework] = useState<ApiHomework[]>(initialCached?.homeworks || []);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : initialCached ? false : true);
  const [error, setError] = useState<string | null>(null);

  const [total, setTotal] = useState(initialCached?.total || 0);
  const [totalPages, setTotalPages] = useState(initialCached?.totalPages || 1);

  const fetchHomework = useCallback(async (cId?: string, pNum = page, pSize = pageSize, forceRefresh = false) => {
    const key = getHwCacheKey(cId, academicYear, pNum, pSize);

    if (!forceRefresh) {
      const cached = _homeworkClientCache.get(key);
      if (cached && Date.now() - cached.timestamp < HOMEWORK_CLIENT_TTL) {
        setHomework(cached.data.homeworks);
        setTotal(cached.data.total);
        setTotalPages(cached.data.totalPages);
        setIsLoading(false);
        return;
      }
    }

    const existingPromise = _homeworkInFlightClient.get(key);
    if (existingPromise) {
      try {
        const data = await existingPromise;
        setHomework(data.homeworks);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (err: any) {
        setError(err.message || "Failed to load homework");
      }
      return;
    }

    if (!homework || homework.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    const promise = (async () => {
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
      const payload: HomeworkPayload = {
        homeworks: data.data.homeworks || [],
        total: data.data.total || 0,
        totalPages: data.data.totalPages || 1,
      };
      setStoredHw(key, payload);
      return payload;
    })();

    _homeworkInFlightClient.set(key, promise);

    try {
      const data = await promise;
      setHomework(data.homeworks);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load homework");
    } finally {
      _homeworkInFlightClient.delete(key);
      setIsLoading(false);
    }
  }, [academicYear, page, pageSize, homework]);

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

  useEffect(() => {
    const unsub = cacheSync.subscribe("homework", () => {
      fetchHomework(classId, page, pageSize, true);
    });
    return unsub;
  }, [fetchHomework, classId, page, pageSize]);

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
      
      _homeworkClientCache.clear();
      invalidateCache("homework");
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
      
      _homeworkClientCache.clear();
      invalidateCache("homework");
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

      _homeworkClientCache.clear();
      invalidateCache("homework");
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

      _homeworkClientCache.clear();
      invalidateCache("homework");
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

      _homeworkClientCache.clear();
      invalidateCache("homework");
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

      _homeworkClientCache.clear();
      invalidateCache("homework");
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
