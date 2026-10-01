"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { cacheSync, invalidateCache as syncInvalidateCache } from "@/lib/utils/cache-sync";

export interface ApiSection {
  _id: string;
  school_id: string;
  name: string;
  status: "Active" | "Inactive";
  createdAt?: string;
}

let _sectionsCache: ApiSection[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;
const SS_KEY = "sm_sections_cache";
const _listeners = new Set<(s: ApiSection[]) => void>();

function readSessionCache(): ApiSection[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Date.now() - p.ts < CACHE_TTL_MS) return p.data;
  } catch {}
  return null;
}

function writeSessionCache(data: ApiSection[]) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function invalidateCache() {
  _sectionsCache = null;
  _cacheTimestamp = 0;
  try { sessionStorage.removeItem(SS_KEY); } catch {}
}

export function useSections(options?: { skip?: boolean }) {
  const ssData = _sectionsCache ?? readSessionCache();
  const [sections, setSections] = useState<ApiSection[]>(ssData ?? []);
  const [isLoading, setIsLoading] = useState(ssData === null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const authReady = useAuthReady();

  useEffect(() => {
    const listener = (data: ApiSection[]) => setSections(data);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  // Central cross-tab cache sync
  useEffect(() => {
    return cacheSync.subscribe("sections", () => {
      invalidateCache();
      fetchSections({ limit: 100 });
    });
  }, []);

  const fetchSections = useCallback(async (params: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
    setIsLoading(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.status) qs.set("status", params.status);
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));

      const res = await fetch(`/api/sections?${qs}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch sections");

      _sectionsCache = data.data.sections;
      _cacheTimestamp = Date.now();
      writeSessionCache(data.data.sections);
      _listeners.forEach(fn => fn(data.data.sections));
      setSections(data.data.sections);
      setTotal(data.data.total ?? 0);
      setTotalPages(data.data.totalPages ?? 1);
      setCurrentPage(data.data.page ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sections");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip || !authReady) return;
    const isFresh = (_sectionsCache !== null || readSessionCache() !== null) && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS;
    if (isFresh) return;
    fetchSections({ limit: 100 });
  }, [fetchSections, options?.skip, authReady]);

  const createSection = async (input: { name: string; status?: string }) => {
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      invalidateCache();
      syncInvalidateCache("sections");
      fetchSections({ limit: 100 });
      return { success: true, message: "Section created", data: data.data };
    } catch { return { success: false, message: "Network error" }; }
  };

  const updateSection = async (id: string, input: Partial<{ name: string; status: string }>) => {
    try {
      const res = await fetch(`/api/sections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      if (_sectionsCache) {
        _sectionsCache = _sectionsCache.map(s => s._id === id ? data.data : s);
        _listeners.forEach(fn => fn(_sectionsCache!));
      }
      syncInvalidateCache("sections");
      setSections(prev => prev.map(s => s._id === id ? data.data : s));
      return { success: true, message: "Section updated" };
    } catch { return { success: false, message: "Network error" }; }
  };

  const deleteSection = async (id: string) => {
    try {
      const res = await fetch(`/api/sections/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message || "Failed" };
      if (_sectionsCache) {
        _sectionsCache = _sectionsCache.filter(s => s._id !== id);
        _listeners.forEach(fn => fn(_sectionsCache!));
      }
      syncInvalidateCache("sections");
      setSections(prev => prev.filter(s => s._id !== id));
      return { success: true, message: "Section deleted" };
    } catch { return { success: false, message: "Network error" }; }
  };

  return { sections, isLoading, error, total, totalPages, currentPage, fetchSections, createSection, updateSection, deleteSection };
}
