"use client";

import { useState, useCallback, useEffect } from "react";
import { getAuthHeaders } from "@/lib/utils/session";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

export interface SyllabusResource {
  title: string;
  type: "file" | "youtube" | "drive" | "link";
  url: string;
}

export interface SyllabusAttachment {
  filename: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
}

export interface SyllabusNode {
  id: string;
  title: string;
  description?: string;
  type: "unit" | "chapter" | "topic" | "sub_topic" | "learning_outcome" | "resource" | "other";
  children?: SyllabusNode[];
  resources?: SyllabusResource[];
}

export interface SyllabusHistoryEntry {
  version: number;
  title: string;
  description?: string;
  status: "Draft" | "Published" | "Archived";
  nodes: SyllabusNode[];
  attachments: SyllabusAttachment[];
  reference_links: string[];
  updated_by?: any;
  updated_at: string;
  remarks?: string;
}

export interface SyllabusData {
  _id?: string;
  school_id?: string;
  academic_year: string;
  class_id: any; // populated or ID
  section_id?: any; // populated or ID
  stream_id?: any; // populated or ID
  subject_master_id: any; // populated or ID
  teacher_id?: any; // populated or ID
  
  title: string;
  description?: string;
  version: number;
  status: "Draft" | "Published" | "Archived";
  publish_date?: string | null;
  visibility: "Public" | "Internal" | "Restricted";
  
  attachments: SyllabusAttachment[];
  reference_links: string[];
  nodes: SyllabusNode[];
  
  history: SyllabusHistoryEntry[];
  created_by?: any;
  updated_by?: any;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Module-level Cache & sessionStorage Backup ─────────────────────
interface SyllabusListCacheEntry {
  syllabi: SyllabusData[];
  total: number;
  totalPages: number;
  page: number;
  timestamp: number;
}
const _syllabusCache = new Map<string, SyllabusListCacheEntry>();
const _syllabusDetailCache = new Map<string, { data: SyllabusData; timestamp: number }>();
const CACHE_TTL_MS = 30_000;
const SS_PREFIX = "sm_syl_";
const SS_DETAIL_PREFIX = "sm_syld_";

function readSessionCacheSyl(key: string): SyllabusListCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Date.now() - p.timestamp < CACHE_TTL_MS) return p;
  } catch {}
  return null;
}

function writeSessionCacheSyl(key: string, entry: SyllabusListCacheEntry) {
  try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry)); } catch {}
}

function readSessionCacheDetail(id: string): { data: SyllabusData; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_DETAIL_PREFIX + id);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Date.now() - p.timestamp < CACHE_TTL_MS) return p;
  } catch {}
  return null;
}

function writeSessionCacheDetail(id: string, entry: { data: SyllabusData; timestamp: number }) {
  try { sessionStorage.setItem(SS_DETAIL_PREFIX + id, JSON.stringify(entry)); } catch {}
}

function clearSessionCacheSyl() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(SS_PREFIX) || k.startsWith(SS_DETAIL_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

export function useSyllabus() {
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [syllabi, setSyllabi] = useState<SyllabusData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSyllabus = useCallback(async (params: string | {
    academic_year?: string;
    class_id?: string;
    section_id?: string;
    stream_id?: string;
    subject_master_id?: string;
    teacher_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    teacher_assignment_id?: string;
  }) => {
    let url = "/api/syllabus";
    let cacheKey = "";
    if (typeof params === "string") {
      url = `/api/syllabus?teacher_assignment_id=${params}`;
      cacheKey = `ta_${params}`;
    } else if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          qs.set(key, String(val));
        }
      });
      qs.sort();
      cacheKey = qs.toString();
      url = `/api/syllabus?${cacheKey}`;
    }

    const cached = _syllabusCache.get(cacheKey) ?? readSessionCacheSyl(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setSyllabi(cached.syllabi);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      setCurrentPage(cached.page);
      setIsLoading(false);
      if (now - cached.timestamp < 15_000) return;
    } else {
      setIsLoading(true);
    }

    setError(null);
    try {
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch syllabus data.");

      if (Array.isArray(data.data)) {
        const fetchedSyllabi = data.data;
        const fetchedTotal = data.total ?? data.data.length;
        const fetchedTotalPages = data.totalPages ?? 1;
        const fetchedPage = data.page ?? 1;

        const entry: SyllabusListCacheEntry = {
          syllabi: fetchedSyllabi,
          total: fetchedTotal,
          totalPages: fetchedTotalPages,
          page: fetchedPage,
          timestamp: Date.now()
        };
        _syllabusCache.set(cacheKey, entry);
        writeSessionCacheSyl(cacheKey, entry);

        // Pre-seed detail cache so sub-pages load instantaneously (0ms)
        fetchedSyllabi.forEach((item: any) => {
          if (item && item._id) {
            const detailEntry = { data: item, timestamp: Date.now() };
            _syllabusDetailCache.set(item._id, detailEntry);
            writeSessionCacheDetail(item._id, detailEntry);
          }
        });

        setSyllabi(fetchedSyllabi);
        setTotal(fetchedTotal);
        setTotalPages(fetchedTotalPages);
        setCurrentPage(fetchedPage);
      } else if (data.data && data.data.syllabi) {
        const fetchedSyllabi = data.data.syllabi;
        const fetchedTotal = data.data.total ?? 0;
        const fetchedTotalPages = data.data.totalPages ?? 1;
        const fetchedPage = data.data.page ?? 1;

        const entry: SyllabusListCacheEntry = {
          syllabi: fetchedSyllabi,
          total: fetchedTotal,
          totalPages: fetchedTotalPages,
          page: fetchedPage,
          timestamp: Date.now()
        };
        _syllabusCache.set(cacheKey, entry);
        writeSessionCacheSyl(cacheKey, entry);

        // Pre-seed detail cache so sub-pages load instantaneously (0ms)
        fetchedSyllabi.forEach((item: any) => {
          if (item && item._id) {
            const detailEntry = { data: item, timestamp: Date.now() };
            _syllabusDetailCache.set(item._id, detailEntry);
            writeSessionCacheDetail(item._id, detailEntry);
          }
        });

        setSyllabi(fetchedSyllabi);
        setTotal(fetchedTotal);
        setTotalPages(fetchedTotalPages);
        setCurrentPage(fetchedPage);
      } else {
        // Single Syllabus record returned
        setSyllabus(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchronize across tabs and components
  useEffect(() => {
    return cacheSync.subscribe("syllabus", () => {
      _syllabusCache.clear();
      _syllabusDetailCache.clear();
      clearSessionCacheSyl();
    });
  }, []);

  const getSyllabusDetails = useCallback(async (id: string) => {
    const memCached = _syllabusDetailCache.get(id);
    const ssCached = readSessionCacheDetail(id);
    const cached = memCached ?? (ssCached ? { data: ssCached.data, timestamp: ssCached.timestamp } : null);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setSyllabus(cached.data);
      if (!memCached && ssCached) _syllabusDetailCache.set(id, { data: ssCached.data, timestamp: ssCached.timestamp });
      if (now - cached.timestamp < 15_000) return cached.data;
    } else {
      setIsLoading(true);
    }

    setError(null);
    try {
      const res = await fetch(`/api/syllabus/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load syllabus details.");
      const entry = { data: data.data, timestamp: Date.now() };
      _syllabusDetailCache.set(id, entry);
      writeSessionCacheDetail(id, entry);
      setSyllabus(data.data);
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus details");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAllSyllabusCaches = () => {
    _syllabusCache.clear();
    _syllabusDetailCache.clear();
    clearSessionCacheSyl();
    invalidateCache("syllabus");
  };

  const saveSyllabus = async (idOrData: string | Partial<SyllabusData>, rawChaptersFallback?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      // Legacy Mode Fallback: saveSyllabus(teacher_assignment_id, chapters)
      if (typeof idOrData === "string" && Array.isArray(rawChaptersFallback)) {
        const res = await fetch("/api/syllabus", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ teacher_assignment_id: idOrData, chapters: rawChaptersFallback }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to save syllabus");
        clearAllSyllabusCaches();
        setSyllabus(data.data);
        return { success: true, message: "Syllabus saved successfully", data: data.data };
      }

      // New Standard Mode: saveSyllabus(data)
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(idOrData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save syllabus");
      clearAllSyllabusCaches();
      setSyllabus(data.data);
      return { success: true, message: "Syllabus saved successfully", data: data.data };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const updateSyllabus = async (id: string, updateData: Partial<SyllabusData> & { incrementVersion?: boolean; remarks?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update syllabus");
      clearAllSyllabusCaches();
      setSyllabus(data.data);
      return { success: true, message: "Syllabus updated successfully", data: data.data };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSyllabus = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete syllabus");
      clearAllSyllabusCaches();
      setSyllabus(null);
      setSyllabi(prev => prev.filter(s => s._id !== id));
      return { success: true, message: "Syllabus deleted successfully" };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateSyllabus = async (id: string, targetData: { academic_year: string; class_id: string; section_id?: string; stream_id?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${id}?action=duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(targetData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to duplicate syllabus");
      clearAllSyllabusCaches();
      return { success: true, message: "Syllabus duplicated successfully", data: data.data };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const restoreVersion = async (id: string, version: number, remarks?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${id}?action=restore`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ version, remarks }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to restore syllabus version");
      clearAllSyllabusCaches();
      setSyllabus(data.data);
      return { success: true, message: `Restored to Version ${version} successfully`, data: data.data };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syllabus,
    syllabi,
    isLoading,
    error,
    total,
    totalPages,
    currentPage,
    fetchSyllabus,
    getSyllabusDetails,
    saveSyllabus,
    updateSyllabus,
    deleteSyllabus,
    duplicateSyllabus,
    restoreVersion
  };
}
