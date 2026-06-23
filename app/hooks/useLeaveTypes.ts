"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface ApiLeaveType {
  _id: string;
  school_id: string;
  leave_type: string;
  status: "Active" | "Inactive";
  createdAt?: string;
  updatedAt?: string;
}

export function useLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState<ApiLeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leave-types", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch leave types");
      setLeaveTypes(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leave types");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authReady = useAuthReady();
  useEffect(() => {
    if (!authReady) return;
    fetchLeaveTypes();
  }, [fetchLeaveTypes, authReady]);

  const createLeaveType = async (payload: Partial<ApiLeaveType>) => {
    try {
      const res = await fetch("/api/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create leave type");
      await fetchLeaveTypes();
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateLeaveType = async (id: string, payload: Partial<ApiLeaveType>) => {
    try {
      const res = await fetch(`/api/leave-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update leave type");
      await fetchLeaveTypes();
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const deleteLeaveType = async (id: string) => {
    try {
      const res = await fetch(`/api/leave-types/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete leave type");
      await fetchLeaveTypes();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return {
    leaveTypes,
    isLoading,
    error,
    fetchLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
  };
}
