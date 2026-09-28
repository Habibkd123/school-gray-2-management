"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

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

let _cachedDashboardStats: DashboardStats | null = null;
let _cachedStatsTime = 0;
const STATS_TTL = 30_000;

export function useDashboardStats(opts: UseDashboardStatsOptions = {}) {
  const { skip = false, pollInterval = 60_000 } = opts;

  const [stats, setStats] = useState<DashboardStats | null>(_cachedDashboardStats);
  const [isLoading, setIsLoading] = useState(!skip && !_cachedDashboardStats);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      if (!_cachedDashboardStats) {
        setIsLoading(true);
      }
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
      setError(err.message || "Failed to load dashboard stats");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch once auth is ready
  useEffect(() => {
    if (skip || !authReady) return;
    fetchStats();
  }, [skip, authReady, fetchStats]);

  // Polling for auto-update
  useEffect(() => {
    if (skip || !authReady || pollInterval <= 0) return;
    intervalRef.current = setInterval(fetchStats, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [skip, authReady, pollInterval, fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}
