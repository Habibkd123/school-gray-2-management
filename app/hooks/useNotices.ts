"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";

export interface ApiNotice {
  _id: string;
  title: string;
  content: string;
  target_audience: "all" | "students" | "teachers" | "parents" | "staff";
  is_published: boolean;
  publish_date: string;
  expiry_date?: string;
  attachment_url?: string;
  createdAt: string;
}

export function useNotices(options?: { initialPage?: number; initialPageSize?: number }) {
  const [notices, setNotices] = useState<ApiNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(options?.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(options?.initialPageSize ?? 25));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotices = useCallback(async (pNum = page, pSize = pageSize) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notices?page=${pNum}&limit=${pSize}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotices(data.data.notices);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      }
    } catch (e) {
      console.error("useNotices fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const authReady = useAuthReady();
  useEffect(() => {
    if (!authReady) return;
    fetchNotices(page, pageSize);
  }, [fetchNotices, page, pageSize, authReady]);

  const createNotice = useCallback(async (payload: Partial<ApiNotice>) => {
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchNotices(page, pageSize);
    return data;
  }, [fetchNotices, page, pageSize]);

  const updateNotice = useCallback(async (id: string, payload: Partial<ApiNotice>) => {
    const res = await fetch(`/api/notices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchNotices(page, pageSize);
    return data;
  }, [fetchNotices, page, pageSize]);

  const deleteNotice = useCallback(async (id: string) => {
    const res = await fetch(`/api/notices/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      setNotices((prev) => {
        const nextList = prev.filter((n) => n._id !== id);
        if (nextList.length === 0 && page > 1) {
          setPage((p) => p - 1);
        }
        return nextList;
      });
      setTotal((t) => Math.max(0, t - 1));
    }
    return data;
  }, [page]);

  return {
    notices,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    fetchNotices,
    createNotice,
    updateNotice,
    deleteNotice
  };
}
