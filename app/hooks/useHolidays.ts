"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

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

export function useHolidays(options?: { skip?: boolean }) {
  const [holidays, setHolidays] = useState<ApiHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(options?.skip ? false : true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();

  const fetchHolidays = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/holidays", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch holidays");
      setHolidays(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holidays");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until the JWT token is in localStorage
    fetchHolidays();
  }, [fetchHolidays, options?.skip, authReady]);

  const createHoliday = async (payload: Partial<ApiHoliday>) => {
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create holiday");
      await fetchHolidays();
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
      await fetchHolidays();
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
      await fetchHolidays();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return {
    holidays,
    isLoading,
    error,
    fetchHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  };
}
