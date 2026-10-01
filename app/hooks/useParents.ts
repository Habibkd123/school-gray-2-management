"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { IParent } from "@/lib/models/Parent";
import { IStudent } from "@/lib/models/Student";
import { useAppState } from "@/app/context/store";
import { cacheSync, invalidateCache as syncInvalidateCache } from "@/lib/utils/cache-sync";

export type ApiParent = Omit<IParent, "school_id" | "user_id"> & {
  _id: string;
  children: (IStudent & { _id: string, class_id: any })[];
};

// ─── Module-level cache (shared across all useParents() instances) ─
 const SESSION_PARENTS_PREFIX = "sm_paged_parents_";
let _parentsCache: ApiParent[] | null = null;
let _parentsCacheTotal = 0;
let _parentsCacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds
let _parentsVersion = 0;
const _parentsListeners = new Set<(parents: ApiParent[]) => void>();
const _parentsVersionListeners = new Set<(v: number) => void>();
// In-flight dedup: prevents multiple simultaneous identical fetches
const _parentsInFlightMap = new Map<string, Promise<{ parents: ApiParent[]; total: number } | null>>();

function getSessionParentsCache(key: string): { parents: ApiParent[]; total: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PARENTS_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) return parsed;
    }
  } catch {}
  return null;
}

function invalidateParentsCache() {
  _parentsCache = null;
  _parentsCacheTotal = 0;
  _parentsCacheTimestamp = 0;
  _parentsInFlightMap.clear();
  if (typeof window !== "undefined") {
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith(SESSION_PARENTS_PREFIX)) sessionStorage.removeItem(k);
      });
    } catch {}
  }
}

function bumpParentsVersion() {
  _parentsVersion++;
  _parentsVersionListeners.forEach((fn) => fn(_parentsVersion));
}

export function useParents(options?: { skip?: boolean; filterByYear?: boolean }) {
  const [parents, setParents] = useState<ApiParent[]>(() => {
    if (_parentsCache && _parentsCache.length > 0) return _parentsCache;
    if (typeof window !== "undefined") {
      try {
        // Try first page default key
        const defaultKey = "page=1&limit=10";
        const stored = getSessionParentsCache(defaultKey);
        if (stored && stored.parents.length > 0) return stored.parents;
      } catch {}
    }
    return [];
  });
  const [totalParents, setTotalParents] = useState(() => {
    if (_parentsCacheTotal > 0) return _parentsCacheTotal;
    if (typeof window !== "undefined") {
      try {
        const defaultKey = "page=1&limit=10";
        const stored = getSessionParentsCache(defaultKey);
        if (stored) return stored.total;
      } catch {}
    }
    return 0;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (_parentsCache !== null && _parentsCache.length > 0) return false;
    if (typeof window !== "undefined") {
      try {
        const defaultKey = "page=1&limit=10";
        const stored = getSessionParentsCache(defaultKey);
        if (stored && stored.parents.length > 0) return false;
      } catch {}
    }
    return !options?.skip && _parentsCache === null;
  });
  const [error, setError] = useState<string | null>(null);
  const [mutationVersion, setMutationVersion] = useState(_parentsVersion);
  const authReady = useAuthReady();
  const { academicYear } = useAppState();

  // Subscribe to cache broadcasts
  useEffect(() => {
    const listener = (data: ApiParent[]) => setParents(data);
    _parentsListeners.add(listener);
    return () => { _parentsListeners.delete(listener); };
  }, []);

  // Subscribe to version bumps so all instances auto-refetch after mutations
  useEffect(() => {
    const vListener = (v: number) => setMutationVersion(v);
    _parentsVersionListeners.add(vListener);
    return () => { _parentsVersionListeners.delete(vListener); };
  }, []);

  // Cross-tab and central cache sync
  useEffect(() => {
    return cacheSync.subscribe("parents", () => {
      invalidateParentsCache();
      bumpParentsVersion();
    });
  }, []);

  const fetchParents = useCallback(async (params: {
    page?: number;
    limit?: number | "all" | string;
    search?: string;
    academic_year?: string;
    class_id?: string;
    section?: string;
    student_id?: string;
    status?: string;
    guardian_type?: string;
  } = {}) => {
    const isFiltered = !!(params.search || params.class_id || params.section || params.student_id || params.status || params.guardian_type);
    const isUnfiltered = !isFiltered && (!params.limit || params.limit === "all");

    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.academic_year) qs.set("academic_year", params.academic_year);
    if (params.class_id) qs.set("class_id", params.class_id);
    if (params.section) qs.set("section", params.section);
    if (params.student_id) qs.set("student_id", params.student_id);
    if (params.status) qs.set("status", params.status);
    if (params.guardian_type) qs.set("guardian_type", params.guardian_type);
    const cacheKey = qs.toString();

    // Serve from sessionStorage cache if fresh
    const sessionCached = getSessionParentsCache(cacheKey);
    if (sessionCached) {
      setParents(sessionCached.parents);
      setTotalParents(sessionCached.total);
      setIsLoading(false);
      return;
    }

    // Serve unfiltered results from module cache if still fresh
    if (isUnfiltered && _parentsCache !== null && (Date.now() - _parentsCacheTimestamp) < CACHE_TTL_MS) {
      setParents(_parentsCache);
      setTotalParents(_parentsCacheTotal);
      setIsLoading(false);
      return;
    }

    // Dedup identical in-flight fetches across all queries
    if (_parentsInFlightMap.has(cacheKey)) {
      setIsLoading(true);
      const res = await _parentsInFlightMap.get(cacheKey)!;
      if (res) {
        setParents(res.parents);
        setTotalParents(res.total);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/parents?${cacheKey}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && data.data) {
          const list = data.data.parents || [];
          const tot = data.data.pagination?.totalItems || list.length;
          setParents(list);
          setTotalParents(tot);

          // Persist to sessionStorage
          try {
            sessionStorage.setItem(SESSION_PARENTS_PREFIX + cacheKey, JSON.stringify({ parents: list, total: tot, timestamp: Date.now() }));
          } catch {}

          // Cache only unfiltered all-parents results
          if (isUnfiltered) {
            _parentsCache = list;
            _parentsCacheTotal = tot;
            _parentsCacheTimestamp = Date.now();
            _parentsListeners.forEach((fn) => fn(list));
          }
          return { parents: list, total: tot };
        } else {
          setError(data.message || "Failed to fetch parents");
          return null;
        }
      } catch (err: any) {
        setError(err.message || "Network error");
        return null;
      } finally {
        _parentsInFlightMap.delete(cacheKey);
        setIsLoading(false);
      }
    })();

    _parentsInFlightMap.set(cacheKey, fetchPromise);
    await fetchPromise;
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until JWT token is available
    const params: { academic_year?: string; limit?: string } = { limit: "all" };
    if (options?.filterByYear) params.academic_year = academicYear;
    fetchParents(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchParents, academicYear, options?.skip, options?.filterByYear, authReady, mutationVersion]);

  const createParent = async (payload: Partial<ApiParent> & { children_ids?: string[] }) => {
    const res = await fetch("/api/parents", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      invalidateParentsCache();
      bumpParentsVersion();
      syncInvalidateCache("parents");
      setParents((prev) => [...prev, data.data]);
      return data.data;
    }
    throw new Error(data.message || "Failed to create parent");
  };

  const updateParent = async (id: string, payload: Partial<ApiParent>) => {
    const res = await fetch(`/api/parents/${id}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      if (_parentsCache) {
        _parentsCache = _parentsCache.map((p) => p._id === id ? data.data : p);
        _parentsCacheTimestamp = Date.now();
        _parentsListeners.forEach((fn) => fn(_parentsCache!));
      } else {
        invalidateParentsCache();
      }
      bumpParentsVersion();
      syncInvalidateCache("parents");
      setParents((prev) => prev.map((p) => (p._id === id ? data.data : p)));
      return data.data;
    }
    throw new Error(data.message || "Failed to update parent");
  };

  const deleteParent = async (id: string) => {
    const res = await fetch(`/api/parents/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      if (_parentsCache) {
        _parentsCache = _parentsCache.filter((p) => p._id !== id);
        _parentsCacheTimestamp = Date.now();
        _parentsListeners.forEach((fn) => fn(_parentsCache!));
      } else {
        invalidateParentsCache();
      }
      bumpParentsVersion();
      syncInvalidateCache("parents");
      setParents((prev) => prev.filter((p) => p._id !== id));
      return true;
    }
    throw new Error(data.message || "Failed to delete parent");
  };

  return { parents, totalParents, isLoading, error, fetchParents, createParent, updateParent, deleteParent };
}
