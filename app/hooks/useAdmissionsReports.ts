"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { cacheSync } from "@/lib/utils/cache-sync";

export interface ClassReport {
  classId?: string | null;
  className: string;
  total: number;
  newApps: number;
  approved: number;
  rejected: number;
  pending: number;
  conversionRate: number;
}

export interface AdmissionsReportsData {
  totalApps: number;
  statusCounts: Record<string, number>;
  classReports: ClassReport[];
  conversionRate: number;
}

interface UseAdmissionsReportsOptions {
  skip?: boolean;
  pollInterval?: number;
}

const SESSION_KEY = "sm_admissions_reports_v2";
const CACHE_TTL = 60_000; // 60 seconds

// Module-level in-memory cache
let _cachedReports: AdmissionsReportsData | null = null;
let _cachedTimestamp = 0;
let _inFlightPromise: Promise<AdmissionsReportsData | null> | null = null;

function readSessionStorageCache(): AdmissionsReportsData | null {
  if (typeof window === "undefined") return null;
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s) {
      const p = JSON.parse(s);
      if (Date.now() - p.ts < CACHE_TTL && p.data) {
        return p.data;
      }
    }
  } catch {}
  return null;
}

function writeSessionStorageCache(data: AdmissionsReportsData) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function invalidateClientReportsCache() {
  _cachedReports = null;
  _cachedTimestamp = 0;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }
}

export function useAdmissionsReports(opts: UseAdmissionsReportsOptions = {}) {
  const { skip = false, pollInterval = 0 } = opts;
  const authReady = useAuthReady();

  // Initial state from memory cache or session storage for instant 0ms render
  const initialCache = _cachedReports || readSessionStorageCache();
  const [data, setData] = useState<AdmissionsReportsData | null>(initialCache);
  const [isLoading, setIsLoading] = useState<boolean>(!skip && !initialCache);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReports = useCallback(async (force = false): Promise<AdmissionsReportsData | null> => {
    // If we have a fresh cache and force is not true, use it
    if (!force && _cachedReports && Date.now() - _cachedTimestamp < CACHE_TTL) {
      setData(_cachedReports);
      setIsLoading(false);
      return _cachedReports;
    }

    // Deduplicate in-flight requests
    if (_inFlightPromise && !force) {
      try {
        const result = await _inFlightPromise;
        if (result) {
          setData(result);
          setIsLoading(false);
          return result;
        }
      } catch {}
    }

    if (!data && !_cachedReports) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    const promise = (async () => {
      try {
        const res = await fetch("/api/admissions/reports", {
          headers: getAuthHeaders(),
        });
        const json = await res.json();
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || "Failed to load admissions reports");
        }

        const reportData: AdmissionsReportsData = {
          totalApps: json.data.totalApps || 0,
          statusCounts: json.data.statusCounts || {},
          classReports: (json.data.classReports || []).map((r: any) => ({
            classId: r.classId || null,
            className: r.className,
            total: r.total || 0,
            newApps: r.newApps || 0,
            approved: r.approved || 0,
            rejected: r.rejected || 0,
            pending: r.pending ?? (r.total - (r.newApps || 0) - (r.approved || 0) - (r.rejected || 0)),
            conversionRate: r.conversionRate ?? (r.total > 0 ? Math.round((r.approved / r.total) * 100) : 0),
          })),
          conversionRate: json.data.conversionRate || 0,
        };

        _cachedReports = reportData;
        _cachedTimestamp = Date.now();
        writeSessionStorageCache(reportData);

        setData(reportData);
        return reportData;
      } catch (err: any) {
        console.error("[useAdmissionsReports]", err);
        setError(err.message || "Failed to load admissions reports");
        return null;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        _inFlightPromise = null;
      }
    })();

    _inFlightPromise = promise;
    return promise;
  }, [data]);

  // Initial load once auth is ready
  useEffect(() => {
    if (skip || !authReady) return;

    const memoryOrSession = _cachedReports || readSessionStorageCache();
    if (memoryOrSession) {
      setData(memoryOrSession);
      _cachedReports = memoryOrSession;
      setIsLoading(false);

      // Revalidate in background if cache is older than 30s
      if (Date.now() - _cachedTimestamp > 30_000) {
        fetchReports(false);
      }
    } else {
      fetchReports(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, authReady]);

  // Subscribe to central cache synchronization
  useEffect(() => {
    return cacheSync.subscribeMany(["admissions", "admissions-reports"], () => {
      invalidateClientReportsCache();
      fetchReports(true);
    });
  }, [fetchReports]);

  // Optional polling
  useEffect(() => {
    if (skip || !authReady || pollInterval <= 0) return;
    pollRef.current = setInterval(() => {
      fetchReports(true);
    }, pollInterval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [skip, authReady, pollInterval, fetchReports]);

  return {
    data,
    totalApps: data?.totalApps || 0,
    statusCounts: data?.statusCounts || {},
    classReports: data?.classReports || [],
    conversionRate: data?.conversionRate || 0,
    isLoading,
    isRefreshing,
    error,
    refetch: (force = true) => fetchReports(force),
  };
}
