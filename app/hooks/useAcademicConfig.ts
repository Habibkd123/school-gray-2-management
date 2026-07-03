"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface AcademicConfig {
  enable_streams: boolean;
  enable_sections: boolean;
}

let _configCache: AcademicConfig | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 120_000; // 2 minutes
const _listeners = new Set<(config: AcademicConfig) => void>();
let _fetchPromise: Promise<AcademicConfig> | null = null;

export function useAcademicConfig() {
  const [config, setConfig] = useState<AcademicConfig>(
    _configCache ?? { enable_streams: false, enable_sections: false }
  );
  const [isLoading, setIsLoading] = useState(_configCache === null);
  const authReady = useAuthReady();

  useEffect(() => {
    const listener = (c: AcademicConfig) => setConfig(c);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  const fetchConfig = useCallback(async () => {
    const isFresh = _configCache !== null && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS;
    if (isFresh) { setConfig(_configCache!); setIsLoading(false); return; }

    if (_fetchPromise) {
      setIsLoading(true);
      try {
        const cachedData = await _fetchPromise;
        setConfig(cachedData);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    _fetchPromise = (async () => {
      const res = await fetch("/api/academic/config", { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Failed to fetch config");
      return data.data;
    })();

    try {
      const data = await _fetchPromise;
      _configCache = data;
      _cacheTimestamp = Date.now();
      _listeners.forEach(fn => fn(data));
      setConfig(data);
    } catch {
      // ignore
    } finally {
      _fetchPromise = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady) fetchConfig();
  }, [authReady, fetchConfig]);

  const updateConfig = async (updates: Partial<AcademicConfig>): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch("/api/academic/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.message };
      _configCache = data.data;
      _cacheTimestamp = Date.now();
      _listeners.forEach(fn => fn(data.data));
      setConfig(data.data);
      return { success: true };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  return {
    config,
    isLoading,
    enableStreams: config.enable_streams,
    enableSections: config.enable_sections,
    updateConfig,
    refetch: fetchConfig,
  };
}
