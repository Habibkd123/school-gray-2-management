"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

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

export function useNotices() {
  const [notices, setNotices] = useState<ApiNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notices", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setNotices(data.data.notices);
    } catch (e) {
      console.error("useNotices fetch error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const authReady = useAuthReady();
  useEffect(() => { if (!authReady) return; fetchNotices(); }, [fetchNotices, authReady]);

  const createNotice = useCallback(async (payload: Partial<ApiNotice>) => {
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchNotices();
    return data;
  }, [fetchNotices]);

  const updateNotice = useCallback(async (id: string, payload: Partial<ApiNotice>) => {
    const res = await fetch(`/api/notices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchNotices();
    return data;
  }, [fetchNotices]);

  const deleteNotice = useCallback(async (id: string) => {
    const res = await fetch(`/api/notices/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) await fetchNotices();
    return data;
  }, [fetchNotices]);

  return { notices, loading, fetchNotices, createNotice, updateNotice, deleteNotice };
}
