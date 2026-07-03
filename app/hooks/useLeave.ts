"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { getPersistedPageSize } from "@/app/components/ui/pagination-bar";

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
  const [leaveRequests, setLeaveRequests] = useState<ApiLeaveRequest[]>([]);
  const [loading, setLoading] = useState(options?.skip ? false : true);

  const [page, setPage] = useState(options?.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(() => getPersistedPageSize(options?.initialPageSize ?? 25));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLeave = useCallback(async (pNum = page, pSize = pageSize) => {
    setLoading(true);
    try {
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
      if (data.success) {
        setLeaveRequests(data.data.leaves);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      }
    } catch (e) {
      console.error("useLeave fetch error", e);
    } finally {
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

  const submitLeave = useCallback(async (payload: Partial<ApiLeaveRequest>) => {
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchLeave(page, pageSize);
    return data;
  }, [fetchLeave, page, pageSize]);

  const approveLeave = useCallback(async (id: string, admin_note?: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "approved", admin_note }),
    });
    const data = await res.json();
    if (data.success) await fetchLeave(page, pageSize);
    return data;
  }, [fetchLeave, page, pageSize]);

  const rejectLeave = useCallback(async (id: string, admin_note?: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "rejected", admin_note }),
    });
    const data = await res.json();
    if (data.success) await fetchLeave(page, pageSize);
    return data;
  }, [fetchLeave, page, pageSize]);

  const deleteLeave = useCallback(async (id: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
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
