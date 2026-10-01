"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { cacheSync } from "@/lib/utils/cache-sync";

export interface DashboardStats {
  students: { total: number; active: number; inactive: number };
  teachers: { total: number; active: number; inactive: number };
  classes:  { total: number };
  subjects: { total: number };
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    percentage: number | null;
    marked: boolean;
  };
}

interface UseDashboardStatsOptions {
  skip?: boolean;
  /** Polling interval in ms. Default: 60 000 (1 min). Pass 0 to disable. */
  pollInterval?: number;
}

// ── Module-level cache — shared across all hook instances ────────────────────
let _cachedDashboardStats: DashboardStats | null = null;
let _cachedStatsTime = 0;
// 60s TTL — stale data is shown immediately, fresh fetch happens in background
const STATS_TTL = 60_000;

export function useDashboardStats(opts: UseDashboardStatsOptions = {}) {
  const { skip = false, pollInterval = 60_000 } = opts;

  // Stale-while-revalidate: if cache exists → isLoading starts as false immediately
  const hasCache = Boolean(_cachedDashboardStats);
  const [stats, setStats] = useState<DashboardStats | null>(_cachedDashboardStats);
  const [isLoading, setIsLoading] = useState(!skip && !hasCache);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async (silent = false) => {
    try {
      // If cache exists and this is a background refresh — don't show loading spinner
      if (!silent || !_cachedDashboardStats) setIsLoading(true);
      if (silent && _cachedDashboardStats) setIsStale(true);
      setError(null);

      const res = await fetch("/api/dashboard/stats", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch");

      _cachedDashboardStats = data.data;
      _cachedStatsTime = Date.now();
      setStats(data.data);
    } catch (err: any) {
      // On background refresh failure, don't hide existing data
      if (!silent || !_cachedDashboardStats) {
        setError(err.message || "Failed to load dashboard stats");
      }
    } finally {
      setIsLoading(false);
      setIsStale(false);
    }
  }, []);

  // Initial fetch once auth is ready
  useEffect(() => {
    if (skip || !authReady) return;
    const isExpired = !_cachedDashboardStats || Date.now() - _cachedStatsTime > STATS_TTL;
    if (isExpired) {
      // Cold start: show loading spinner until first data arrives
      fetchStats(false);
    } else {
      // Cache is fresh: render instantly, silently refresh in background
      setStats(_cachedDashboardStats);
      setIsLoading(false);
      fetchStats(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, authReady]);

  // Auto-refresh stats when relevant entities are mutated anywhere
  useEffect(() => {
    return cacheSync.subscribeMany(
      ["dashboard", "students", "teachers", "classes", "attendance", "fees"],
      () => {
        _cachedDashboardStats = null;
        _cachedStatsTime = 0;
        fetchStats(true);
      }
    );
  }, [fetchStats]);

  // Polling for auto-update (always silent — user already has data on screen)
  useEffect(() => {
    if (skip || !authReady || pollInterval <= 0) return;
    intervalRef.current = setInterval(() => fetchStats(true), pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [skip, authReady, pollInterval, fetchStats]);

  return { stats, isLoading, isStale, error, refetch: () => fetchStats(false) };
}