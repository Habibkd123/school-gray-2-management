"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";
import { createQueryCache } from "@/lib/utils/queryCache";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

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

interface NoticesResult {
  notices: ApiNotice[];
  total: number;
  totalPages: number;
}

// ── Module-level SWR cache — shared across all useNotices() instances ────────
const _cache = createQueryCache<NoticesResult>(60_000); // 60s TTL

export function useNotices(options?: { initialPage?: number; initialPageSize?: number }) {
  const [notices, setNotices] = useState<ApiNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(options?.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(options?.initialPageSize ?? 25));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const authReady = useAuthReady();
  const abortRef = useRef<AbortController | null>(null);

  const fetchNotices = useCallback(async (pNum = page, pSize = pageSize, silent = false) => {
    const key = `notices:${pNum}:${pSize}`;
    const cached = _cache.get(key);

    if (cached) {
      // Serve stale data immediately — no loading flash
      setNotices(cached.notices);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      if (!silent) setLoading(false);
    } else {
      if (!silent) setLoading(true);
    }

    // Always fetch fresh data (stale-while-revalidate)
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/notices?page=${pNum}&limit=${pSize}`, {
        headers: getAuthHeaders(),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (data.success) {
        const result = {
          notices: data.data.notices,
          total: data.data.total,
          totalPages: data.data.totalPages,
        };
        _cache.set(key, result);
        setNotices(result.notices);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("useNotices fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (!authReady) return;
    fetchNotices(page, pageSize);
    return () => { abortRef.current?.abort(); };
  }, [page, pageSize, authReady]);

  // Synchronize across tabs and instances on notice mutation
  useEffect(() => {
    return cacheSync.subscribe("notices", () => {
      _cache.invalidate();
      fetchNotices(page, pageSize, true);
    });
  }, [fetchNotices, page, pageSize]);

  const createNotice = useCallback(async (payload: Partial<ApiNotice>) => {
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      _cache.invalidate();
      invalidateCache("notices");
      await fetchNotices(page, pageSize, false);
    }
    return data;
  }, [fetchNotices, page, pageSize]);

  const updateNotice = useCallback(async (id: string, payload: Partial<ApiNotice>) => {
    const res = await fetch(`/api/notices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      _cache.invalidate();
      invalidateCache("notices");
      await fetchNotices(page, pageSize, false);
    }
    return data;
  }, [fetchNotices, page, pageSize]);

  const deleteNotice = useCallback(async (id: string) => {
    const res = await fetch(`/api/notices/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      _cache.invalidate();
      invalidateCache("notices");
      setNotices((prev) => {
        const nextList = prev.filter((n) => n._id !== id);
        if (nextList.length === 0 && page > 1) setPage((p) => p - 1);
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
    deleteNotice,
  };
}