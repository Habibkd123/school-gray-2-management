"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

export interface ApiLeaveRequest {
  _id: string;
  user_id: any;
  leave_type: "sick" | "casual" | "emergency" | "other";
  from_date: string;
  to_date: string;
  total_days?: number;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: string;
  approved_at?: string;
  admin_note?: string;
  createdAt: string;
}

// ─── Module-level cache & in-flight deduplication ──────────────────
const SS_LEAVE_PREFIX = "sm_leave_q_";
const CACHE_TTL_MS = 60_000;
const _leaveQueryCache = new Map<string, { data: { leaves: ApiLeaveRequest[]; total: number; totalPages: number }; timestamp: number }>();
const _leaveFetchPromises = new Map<string, Promise<{ leaves: ApiLeaveRequest[]; total: number; totalPages: number }>>();

function getLeaveCacheKey(statusFilter?: string, userId?: string, options?: any, page = 1, pageSize = 25) {
  return `${statusFilter || ""}_${userId || ""}_${options?.leaveType || ""}_${options?.search || ""}_${options?.from || ""}_${options?.to || ""}_${page}_${pageSize}`;
}

function readSessionLeave(key: string): { leaves: ApiLeaveRequest[]; total: number; totalPages: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_LEAVE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
      return parsed.data;
    }
  } catch {}
  return null;
}

function writeSessionLeave(key: string, data: { leaves: ApiLeaveRequest[]; total: number; totalPages: number }) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SS_LEAVE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

function clearSessionLeave() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(SS_LEAVE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

export function useLeave(
  statusFilter?: string,
  userId?: string,
  options?: {
    skip?: boolean;
    initialPage?: number;
    initialPageSize?: number;
    leaveType?: string;
    search?: string;
    from?: string;
    to?: string;
  }
) {
  const initialPage = options?.initialPage ?? 1;
  const initialPageSize = getPersistedPageSize(options?.initialPageSize ?? 25);
  const initialKey = getLeaveCacheKey(statusFilter, userId, options, initialPage, initialPageSize);
  const initialCached = _leaveQueryCache.get(initialKey)?.data ?? readSessionLeave(initialKey);

  const [leaveRequests, setLeaveRequests] = useState<ApiLeaveRequest[]>(() => initialCached?.leaves ?? []);
  const [loading, setLoading] = useState(() => {
    if (options?.skip) return false;
    return !initialCached;
  });

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(() => initialCached?.total ?? 0);
  const [totalPages, setTotalPages] = useState(() => initialCached?.totalPages ?? 1);

  const fetchLeave = useCallback(async (pNum = page, pSize = pageSize) => {
    const key = getLeaveCacheKey(statusFilter, userId, options, pNum, pSize);
    const inMem = _leaveQueryCache.get(key);
    const sessionData = !inMem ? readSessionLeave(key) : null;
    const cached = inMem ?? (sessionData ? { data: sessionData, timestamp: Date.now() } : null);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setLeaveRequests(cached.data.leaves);
      setTotal(cached.data.total);
      setTotalPages(cached.data.totalPages);
      setLoading(false);
      // Fast revalidation window: if fetched in last 15s, return
      if (Date.now() - cached.timestamp < 15_000) return;
    } else if (leaveRequests.length === 0) {
      setLoading(true);
    }

    if (_leaveFetchPromises.has(key)) {
      try {
        const data = await _leaveFetchPromises.get(key)!;
        setLeaveRequests(data.leaves);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } finally {
        setLoading(false);
      }
      return;
    }

    const promise = (async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (userId) params.set("userId", userId);
      if (options?.leaveType) params.set("leaveType", options.leaveType);
      if (options?.search) params.set("search", options.search);
      if (options?.from) params.set("from", options.from);
      if (options?.to) params.set("to", options.to);
      params.set("page", pNum.toString());
      params.set("limit", pSize.toString());

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/leave${queryString}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch leaves");
      return data.data as { leaves: ApiLeaveRequest[]; total: number; totalPages: number };
    })();

    _leaveFetchPromises.set(key, promise);

    try {
      const data = await promise;
      _leaveQueryCache.set(key, { data, timestamp: Date.now() });
      writeSessionLeave(key, data);
      setLeaveRequests(data.leaves);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      console.error("useLeave fetch error", e);
    } finally {
      _leaveFetchPromises.delete(key);
      setLoading(false);
    }
  }, [statusFilter, userId, options?.leaveType, options?.search, options?.from, options?.to, page, pageSize]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, userId, options?.leaveType, options?.search, options?.from, options?.to]);

  const authReady = useAuthReady();
  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchLeave(page, pageSize);
  }, [fetchLeave, page, pageSize, options?.skip, authReady]);

  // Subscribe to cross-tab / cross-component leave events
  useEffect(() => {
    const unsub = cacheSync.subscribe("leave", () => {
      _leaveQueryCache.clear();
      clearSessionLeave();
      fetchLeave(page, pageSize);
    });
    return unsub;
  }, [fetchLeave, page, pageSize]);

  const submitLeave = useCallback(async (payload: Partial<ApiLeaveRequest>) => {
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      _leaveQueryCache.clear();
      clearSessionLeave();
      invalidateCache("leave");
      await fetchLeave(page, pageSize);
    }
    return data;
  }, [fetchLeave, page, pageSize]);

  const approveLeave = useCallback(async (id: string, admin_note?: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "approved", admin_note }),
    });
    const data = await res.json();
    if (data.success) {
      _leaveQueryCache.clear();
      clearSessionLeave();
      invalidateCache("leave");
      await fetchLeave(page, pageSize);
    }
    return data;
  }, [fetchLeave, page, pageSize]);

  const rejectLeave = useCallback(async (id: string, admin_note?: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "rejected", admin_note }),
    });
    const data = await res.json();
    if (data.success) {
      _leaveQueryCache.clear();
      clearSessionLeave();
      invalidateCache("leave");
      await fetchLeave(page, pageSize);
    }
    return data;
  }, [fetchLeave, page, pageSize]);

  const deleteLeave = useCallback(async (id: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      _leaveQueryCache.clear();
      clearSessionLeave();
      invalidateCache("leave");
      setLeaveRequests((prev) => {
        const nextList = prev.filter((l) => l._id !== id);
        if (nextList.length === 0 && page > 1) {
          setPage((p) => p - 1);
        }
        return nextList;
      });
      setTotal((t) => Math.max(0, t - 1));
    }
    return data;
  }, [page]);

  const pending = leaveRequests.filter(l => l.status === "pending");
  const approved = leaveRequests.filter(l => l.status === "approved");
  const rejected = leaveRequests.filter(l => l.status === "rejected");

  return {
    leaveRequests,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    fetchLeave,
    submitLeave,
    approveLeave,
    rejectLeave,
    deleteLeave,
    pending,
    approved,
    rejected
  };
}
