"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";
import { createQueryCache } from "@/lib/utils/queryCache";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

export interface ApiHoliday {
  _id: string;
  school_id: string;
  display_id: string;
  title: string;
  date: string;
  description?: string;
  status: "Active" | "Inactive";
  createdAt?: string;
  updatedAt?: string;
}

// ── Module-level SWR cache — 5min TTL (holidays change rarely) ─────────────
const CACHE_TTL_MS = 300_000;
const _cache = createQueryCache<{ holidays: ApiHoliday[]; total: number; totalPages: number }>(CACHE_TTL_MS);
const SS_HOLIDAYS_PREFIX = "sm_holidays_q_";
const _holidayPromises = new Map<string, Promise<{ holidays: ApiHoliday[]; total: number; totalPages: number }>>();

function readSessionHolidays(key: string): { holidays: ApiHoliday[]; total: number; totalPages: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_HOLIDAYS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
      return parsed.data;
    }
  } catch {}
  return null;
}

function writeSessionHolidays(key: string, data: { holidays: ApiHoliday[]; total: number; totalPages: number }) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SS_HOLIDAYS_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

function clearSessionHolidays() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(SS_HOLIDAYS_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

export function useHolidays(options?: { skip?: boolean; initialPage?: number; initialPageSize?: number }) {
  const initialPage = options?.initialPage ?? 1;
  const initialPageSize = getPersistedPageSize(options?.initialPageSize ?? 25);
  const initialKey = `holidays:${initialPage}:${initialPageSize}`;
  const initialCached = _cache.get(initialKey) ?? readSessionHolidays(initialKey);

  const [holidays, setHolidays] = useState<ApiHoliday[]>(() => initialCached?.holidays ?? []);
  const [isLoading, setIsLoading] = useState(() => {
    if (options?.skip) return false;
    return !initialCached;
  });
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(() => initialCached?.total ?? 0);
  const [totalPages, setTotalPages] = useState(() => initialCached?.totalPages ?? 1);

  const authReady = useAuthReady();

  const fetchHolidays = useCallback(async (pNum = page, pSize = pageSize) => {
    const key = `holidays:${pNum}:${pSize}`;
    const cached = _cache.get(key) ?? readSessionHolidays(key);

    if (cached) {
      // Serve stale/cached data instantly — 0ms loading
      setHolidays(cached.holidays);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      setIsLoading(false);
    } else if (holidays.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    if (_holidayPromises.has(key)) {
      try {
        const result = await _holidayPromises.get(key)!;
        setHolidays(result.holidays);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const promise = (async () => {
      const res = await fetch(`/api/holidays?page=${pNum}&limit=${pSize}`, {
        headers: getAuthHeaders(),
        signal: abortRef.current?.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch holidays");
      return {
        holidays: data.data.holidays,
        total: data.data.total,
        totalPages: data.data.totalPages,
      };
    })();

    _holidayPromises.set(key, promise);

    try {
      const result = await promise;
      _cache.set(key, result);
      writeSessionHolidays(key, result);
      setHolidays(result.holidays);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Failed to load holidays");
      }
    } finally {
      _holidayPromises.delete(key);
      setIsLoading(false);
    }
  }, [page, pageSize, holidays.length]);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchHolidays(page, pageSize);
  }, [fetchHolidays, page, pageSize, options?.skip, authReady]);

  // Synchronize across tabs and instances on holiday mutation
  useEffect(() => {
    return cacheSync.subscribe("holidays", () => {
      _cache.invalidate();
      clearSessionHolidays();
      fetchHolidays(page, pageSize);
    });
  }, [fetchHolidays, page, pageSize]);

  const createHoliday = async (payload: Partial<ApiHoliday>) => {
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create holiday");
      _cache.invalidate();
      clearSessionHolidays();
      invalidateCache("holidays");
      await fetchHolidays(page, pageSize);
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateHoliday = async (id: string, payload: Partial<ApiHoliday>) => {
    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update holiday");
      _cache.invalidate();
      clearSessionHolidays();
      invalidateCache("holidays");
      await fetchHolidays(page, pageSize);
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete holiday");
      _cache.invalidate();
      clearSessionHolidays();
      invalidateCache("holidays");
      setHolidays((prev) => {
        const nextList = prev.filter((h) => h._id !== id);
        if (nextList.length === 0 && page > 1) {
          setPage((p) => p - 1);
        }
        return nextList;
      });
      setTotal((t) => Math.max(0, t - 1));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return {
    holidays,
    isLoading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    fetchHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  };
}
