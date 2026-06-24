"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface ApiStream {
  _id: string;
  school_id: string;
  name: string;
  status: "Active" | "Inactive";
  createdAt?: string;
}

let _streamsCache: ApiStream[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;
const _listeners = new Set<(s: ApiStream[]) => void>();

function invalidateCache() { _streamsCache = null; _cacheTimestamp = 0; }

export function useStreams(options?: { skip?: boolean }) {
  const [streams, setStreams] = useState<ApiStream[]>(_streamsCache ?? []);
  const [isLoading, setIsLoading] = useState(_streamsCache === null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const authReady = useAuthReady();

  useEffect(() => {
    const listener = (data: ApiStream[]) => setStreams(data);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  const fetchStreams = useCallback(async (params: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
    setIsLoading(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.status) qs.set("status", params.status);
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));

      const res = await fetch(`/api/streams?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch streams");

      _streamsCache = data.data.streams;
      _cacheTimestamp = Date.now();
      _listeners.forEach(fn => fn(data.data.streams));
      setStreams(data.data.streams);
      setTotal(data.data.total ?? 0);
      setTotalPages(data.data.totalPages ?? 1);
      setCurrentPage(data.data.page ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load streams");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip || !authReady) return;
    fetchStreams({ limit: 100 });
  }, [fetchStreams, options?.skip, authReady]);

  const createStream = async (input: { name: string; status?: string }) => {
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      invalidateCache(); fetchStreams({ limit: 100 });
      return { success: true, message: "Stream created", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const updateStream = async (id: string, input: Partial<{ name: string; status: string }>) => {
    try {
      const res = await fetch(`/api/streams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      if (_streamsCache) {
        _streamsCache = _streamsCache.map(s => s._id === id ? data.data : s);
        _listeners.forEach(fn => fn(_streamsCache!));
      }
      setStreams(prev => prev.map(s => s._id === id ? data.data : s));
      return { success: true, message: "Stream updated" };
    } catch { return { success: false, message: "Network error" }; }
  };

  const deleteStream = async (id: string) => {
    try {
      const res = await fetch(`/api/streams/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      if (_streamsCache) {
        _streamsCache = _streamsCache.filter(s => s._id !== id);
        _listeners.forEach(fn => fn(_streamsCache!));
      }
      setStreams(prev => prev.filter(s => s._id !== id));
      return { success: true, message: "Stream deleted" };
    } catch { return { success: false, message: "Network error" }; }
  };

  return { streams, isLoading, error, total, totalPages, currentPage, fetchStreams, createStream, updateStream, deleteStream };
}
