"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

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

export function useLeave(statusFilter?: string, userId?: string, options?: { skip?: boolean }) {
  const [leaveRequests, setLeaveRequests] = useState<ApiLeaveRequest[]>([]);
  const [loading, setLoading] = useState(options?.skip ? false : true);

  const fetchLeave = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (userId) params.set("userId", userId);
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/leave${queryString}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setLeaveRequests(data.data.leaves);
    } catch (e) {
      console.error("useLeave fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, userId]);

  const authReady = useAuthReady();
  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return;
    fetchLeave();
  }, [fetchLeave, options?.skip, authReady]);

  const submitLeave = useCallback(async (payload: Partial<ApiLeaveRequest>) => {
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchLeave();
    return data;
  }, [fetchLeave]);

  const approveLeave = useCallback(async (id: string, admin_note?: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "approved", admin_note }),
    });
    const data = await res.json();
    if (data.success) await fetchLeave();
    return data;
  }, [fetchLeave]);

  const rejectLeave = useCallback(async (id: string, admin_note?: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "rejected", admin_note }),
    });
    const data = await res.json();
    if (data.success) await fetchLeave();
    return data;
  }, [fetchLeave]);

  const deleteLeave = useCallback(async (id: string) => {
    const res = await fetch(`/api/leave/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) await fetchLeave();
    return data;
  }, [fetchLeave]);

  const pending = leaveRequests.filter(l => l.status === "pending");
  const approved = leaveRequests.filter(l => l.status === "approved");
  const rejected = leaveRequests.filter(l => l.status === "rejected");

  return {
    leaveRequests, loading, fetchLeave,
    submitLeave, approveLeave, rejectLeave, deleteLeave,
    pending, approved, rejected
  };
}
