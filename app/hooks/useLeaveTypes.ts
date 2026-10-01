"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

export interface ApiLeaveType {
  _id: string;
  school_id: string;
  leave_type: string;
  status: "Active" | "Inactive";
  createdAt?: string;
  updatedAt?: string;
}

// ─── Module-level cache & in-flight deduplication ──────────────────
const SESSION_LEAVE_TYPES_KEY = "sm_leave_types_cache";
let _leaveTypesCache: ApiLeaveType[] | null = null;
let _leaveTypesTimestamp = 0;
const CACHE_TTL_MS = 60_000;
let _leaveTypesPromise: Promise<ApiLeaveType[]> | null = null;
const _leaveTypesListeners = new Set<(types: ApiLeaveType[]) => void>();

function getStoredLeaveTypes(): ApiLeaveType[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_LEAVE_TYPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.leaveTypes)) {
        return parsed.leaveTypes;
      }
    }
  } catch {}
  return null;
}

function setStoredLeaveTypes(types: ApiLeaveType[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_LEAVE_TYPES_KEY, JSON.stringify({ leaveTypes: types, timestamp: Date.now() }));
  } catch {}
}

function clearStoredLeaveTypes() {
  _leaveTypesCache = null;
  _leaveTypesTimestamp = 0;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_LEAVE_TYPES_KEY);
  } catch {}
}

export function useLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState<ApiLeaveType[]>(() => _leaveTypesCache ?? getStoredLeaveTypes() ?? []);
  const [isLoading, setIsLoading] = useState(() => _leaveTypesCache === null && getStoredLeaveTypes() === null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to module cache updates
  useEffect(() => {
    const listener = (types: ApiLeaveType[]) => setLeaveTypes(types);
    _leaveTypesListeners.add(listener);
    return () => {
      _leaveTypesListeners.delete(listener);
    };
  }, []);

  const fetchLeaveTypes = useCallback(async (force = false) => {
    const now = Date.now();
    const isFresh = _leaveTypesCache !== null && (now - _leaveTypesTimestamp < CACHE_TTL_MS);

    if (!force && isFresh) {
      setLeaveTypes(_leaveTypesCache!);
      setIsLoading(false);
      // Fast return if freshly loaded
      if (now - _leaveTypesTimestamp < 15_000) return;
    }

    const stored = getStoredLeaveTypes();
    if (stored && stored.length > 0 && !leaveTypes.length) {
      setLeaveTypes(stored);
      setIsLoading(false);
    } else if (!_leaveTypesCache && !stored) {
      setIsLoading(true);
    }

    if (_leaveTypesPromise) {
      try {
        const data = await _leaveTypesPromise;
        setLeaveTypes(data);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setError(null);
    const promise = (async () => {
      const res = await fetch("/api/leave-types", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch leave types");
      return data.data as ApiLeaveType[];
    })();

    _leaveTypesPromise = promise;

    try {
      const data = await promise;
      _leaveTypesCache = data;
      _leaveTypesTimestamp = Date.now();
      setStoredLeaveTypes(data);
      setLeaveTypes(data);
      _leaveTypesListeners.forEach((fn) => fn(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leave types");
    } finally {
      _leaveTypesPromise = null;
      setIsLoading(false);
    }
  }, [leaveTypes.length]);

  const authReady = useAuthReady();
  useEffect(() => {
    if (!authReady) return;
    fetchLeaveTypes();
  }, [fetchLeaveTypes, authReady]);

  // Central cross-tab cache sync
  useEffect(() => {
    return cacheSync.subscribe("leave-types", () => {
      clearStoredLeaveTypes();
      fetchLeaveTypes(true);
    });
  }, [fetchLeaveTypes]);

  const createLeaveType = async (payload: Partial<ApiLeaveType>) => {
    try {
      const res = await fetch("/api/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create leave type");
      clearStoredLeaveTypes();
      invalidateCache("leave-types");
      await fetchLeaveTypes(true);
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
      clearStoredLeaveTypes();
      invalidateCache("leave-types");
      await fetchLeaveTypes(true);
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
      clearStoredLeaveTypes();
      invalidateCache("leave-types");
      setLeaveTypes((prev) => prev.filter((item) => item._id !== id));
      await fetchLeaveTypes(true);
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
