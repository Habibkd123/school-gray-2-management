"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";

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

export function useHolidays(options?: { skip?: boolean; initialPage?: number; initialPageSize?: number }) {
  const [holidays, setHolidays] = useState<ApiHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(options?.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(options?.initialPageSize ?? 25));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const authReady = useAuthReady();

  const fetchHolidays = useCallback(async (pNum = page, pSize = pageSize) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/holidays?page=${pNum}&limit=${pSize}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch holidays");
      setHolidays(data.data.holidays);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holidays");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage
    fetchHolidays(page, pageSize);
  }, [fetchHolidays, page, pageSize, options?.skip, authReady]);

  const createHoliday = async (payload: Partial<ApiHoliday>) => {
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create holiday");
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
