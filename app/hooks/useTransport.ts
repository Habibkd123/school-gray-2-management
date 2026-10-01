"use client";

import { useState, useEffect, useCallback } from "react";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";
import { getAuthHeaders } from "@/lib/utils/session";

const CACHE_TTL_MS = 60_000;

// ─── Module-level Caches & In-flight Deduplication ────────────────
let _busesCache: any[] | null = null;
let _busesTimestamp = 0;
let _busesPromise: Promise<any[]> | null = null;
const _busesListeners = new Set<(data: any[]) => void>();

let _routesCache: any[] | null = null;
let _routesTimestamp = 0;
let _routesPromise: Promise<any[]> | null = null;
const _routesListeners = new Set<(data: any[]) => void>();

let _allocationsCache: any[] | null = null;
let _allocationsTimestamp = 0;
let _allocationsPromise: Promise<any[]> | null = null;
const _allocationsListeners = new Set<(data: any[]) => void>();

// ─── SessionStorage Helpers ────────────────────────────────────────
function getStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
      return parsed.data as T;
    }
  } catch {}
  return null;
}

function setStored(key: string, data: any[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

function clearStored(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

// ───────────────────────────────────────────────────────────────────
// 1. useBuses Hook
// ───────────────────────────────────────────────────────────────────
export function useBuses() {
  const initialData = _busesCache ?? getStored<any[]>("sm_transport_buses");
  const [buses, setBuses] = useState<any[]>(() => initialData ?? []);
  const [isLoading, setIsLoading] = useState(() => initialData === null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to module broadcasts
  useEffect(() => {
    const listener = (data: any[]) => setBuses(data);
    _busesListeners.add(listener);
    return () => {
      _busesListeners.delete(listener);
    };
  }, []);

  const fetchBuses = useCallback(async (force = false) => {
    const now = Date.now();
    const isFresh = _busesCache !== null && (now - _busesTimestamp < CACHE_TTL_MS);

    if (!force && isFresh) {
      setBuses(_busesCache!);
      setIsLoading(false);
      if (now - _busesTimestamp < 15_000) return;
    }

    const stored = getStored<any[]>("sm_transport_buses");
    if (stored && stored.length > 0) {
      setBuses(stored);
      setIsLoading(false);
    } else if (!_busesCache && !stored) {
      setIsLoading(true);
    }

    if (_busesPromise) {
      try {
        const data = await _busesPromise;
        setBuses(data);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setError(null);
    const promise = (async () => {
      const res = await fetch("/api/transport/buses", { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to fetch buses");
      return json.data.map((b: any) => ({ ...b, id: b._id }));
    })();

    _busesPromise = promise;

    try {
      const data = await promise;
      _busesCache = data;
      _busesTimestamp = Date.now();
      setStored("sm_transport_buses", data);
      setBuses(data);
      _busesListeners.forEach((fn) => fn(data));
    } catch (err: any) {
      setError(err.message);
    } finally {
      _busesPromise = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  useEffect(() => {
    const unsub = cacheSync.subscribe("transport", () => {
      _busesCache = null;
      _busesTimestamp = 0;
      clearStored("sm_transport_buses");
      fetchBuses(true);
    });
    return unsub;
  }, [fetchBuses]);

  const addBus = async (busData: any) => {
    const res = await fetch("/api/transport/buses", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(busData),
    });
    const data = await res.json();
    if (data.success) {
      _busesCache = null;
      _busesTimestamp = 0;
      clearStored("sm_transport_buses");
      invalidateCache("transport");
      await fetchBuses(true);
    }
    return data;
  };

  const updateBus = async (id: string, busData: any) => {
    const res = await fetch(`/api/transport/buses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(busData),
    });
    const data = await res.json();
    if (data.success) {
      _busesCache = null;
      _busesTimestamp = 0;
      clearStored("sm_transport_buses");
      invalidateCache("transport");
      await fetchBuses(true);
    }
    return data;
  };

  const deleteBus = async (id: string) => {
    const res = await fetch(`/api/transport/buses/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      _busesCache = null;
      _busesTimestamp = 0;
      clearStored("sm_transport_buses");
      invalidateCache("transport");
      await fetchBuses(true);
    }
    return data;
  };

  return { buses, isLoading, error, fetchBuses, addBus, updateBus, deleteBus };
}

// ───────────────────────────────────────────────────────────────────
// 2. useRoutes Hook
// ───────────────────────────────────────────────────────────────────
export function useRoutes() {
  const initialData = _routesCache ?? getStored<any[]>("sm_transport_routes");
  const [routes, setRoutes] = useState<any[]>(() => initialData ?? []);
  const [isLoading, setIsLoading] = useState(() => initialData === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listener = (data: any[]) => setRoutes(data);
    _routesListeners.add(listener);
    return () => {
      _routesListeners.delete(listener);
    };
  }, []);

  const fetchRoutes = useCallback(async (force = false) => {
    const now = Date.now();
    const isFresh = _routesCache !== null && (now - _routesTimestamp < CACHE_TTL_MS);

    if (!force && isFresh) {
      setRoutes(_routesCache!);
      setIsLoading(false);
      if (now - _routesTimestamp < 15_000) return;
    }

    const stored = getStored<any[]>("sm_transport_routes");
    if (stored && stored.length > 0) {
      setRoutes(stored);
      setIsLoading(false);
    } else if (!_routesCache && !stored) {
      setIsLoading(true);
    }

    if (_routesPromise) {
      try {
        const data = await _routesPromise;
        setRoutes(data);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setError(null);
    const promise = (async () => {
      const res = await fetch("/api/transport/routes", { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to fetch routes");
      return json.data.map((r: any) => ({ ...r, id: r._id }));
    })();

    _routesPromise = promise;

    try {
      const data = await promise;
      _routesCache = data;
      _routesTimestamp = Date.now();
      setStored("sm_transport_routes", data);
      setRoutes(data);
      _routesListeners.forEach((fn) => fn(data));
    } catch (err: any) {
      setError(err.message);
    } finally {
      _routesPromise = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => {
    const unsub = cacheSync.subscribe("transport", () => {
      _routesCache = null;
      _routesTimestamp = 0;
      clearStored("sm_transport_routes");
      fetchRoutes(true);
    });
    return unsub;
  }, [fetchRoutes]);

  const addRoute = async (routeData: any) => {
    const res = await fetch("/api/transport/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(routeData),
    });
    const data = await res.json();
    if (data.success) {
      _routesCache = null;
      _routesTimestamp = 0;
      clearStored("sm_transport_routes");
      invalidateCache("transport");
      await fetchRoutes(true);
    }
    return data;
  };

  const updateRoute = async (id: string, routeData: any) => {
    const res = await fetch(`/api/transport/routes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(routeData),
    });
    const data = await res.json();
    if (data.success) {
      _routesCache = null;
      _routesTimestamp = 0;
      clearStored("sm_transport_routes");
      invalidateCache("transport");
      await fetchRoutes(true);
    }
    return data;
  };

  const deleteRoute = async (id: string) => {
    const res = await fetch(`/api/transport/routes/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      _routesCache = null;
      _routesTimestamp = 0;
      clearStored("sm_transport_routes");
      invalidateCache("transport");
      await fetchRoutes(true);
    }
    return data;
  };

  return { routes, isLoading, error, fetchRoutes, addRoute, updateRoute, deleteRoute };
}

// ───────────────────────────────────────────────────────────────────
// 3. useAllocations Hook
// ───────────────────────────────────────────────────────────────────
export function useAllocations() {
  const initialData = _allocationsCache ?? getStored<any[]>("sm_transport_allocations");
  const [allocations, setAllocations] = useState<any[]>(() => initialData ?? []);
  const [isLoading, setIsLoading] = useState(() => initialData === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listener = (data: any[]) => setAllocations(data);
    _allocationsListeners.add(listener);
    return () => {
      _allocationsListeners.delete(listener);
    };
  }, []);

  const fetchAllocations = useCallback(async (force = false) => {
    const now = Date.now();
    const isFresh = _allocationsCache !== null && (now - _allocationsTimestamp < CACHE_TTL_MS);

    if (!force && isFresh) {
      setAllocations(_allocationsCache!);
      setIsLoading(false);
      if (now - _allocationsTimestamp < 15_000) return;
    }

    const stored = getStored<any[]>("sm_transport_allocations");
    if (stored && stored.length > 0) {
      setAllocations(stored);
      setIsLoading(false);
    } else if (!_allocationsCache && !stored) {
      setIsLoading(true);
    }

    if (_allocationsPromise) {
      try {
        const data = await _allocationsPromise;
        setAllocations(data);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setError(null);
    const promise = (async () => {
      const res = await fetch("/api/transport/allocations", { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to fetch allocations");
      return json.data.map((a: any) => ({ ...a, id: a._id || a.id }));
    })();

    _allocationsPromise = promise;

    try {
      const data = await promise;
      _allocationsCache = data;
      _allocationsTimestamp = Date.now();
      setStored("sm_transport_allocations", data);
      setAllocations(data);
      _allocationsListeners.forEach((fn) => fn(data));
    } catch (err: any) {
      setError(err.message);
    } finally {
      _allocationsPromise = null;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  useEffect(() => {
    const unsub = cacheSync.subscribe("transport", () => {
      _allocationsCache = null;
      _allocationsTimestamp = 0;
      clearStored("sm_transport_allocations");
      fetchAllocations(true);
    });
    return unsub;
  }, [fetchAllocations]);

  const addAllocation = async (allocData: any) => {
    const res = await fetch("/api/transport/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(allocData),
    });
    const data = await res.json();
    if (data.success) {
      _allocationsCache = null;
      _allocationsTimestamp = 0;
      clearStored("sm_transport_allocations");
      invalidateCache("transport");
      await fetchAllocations(true);
    }
    return data;
  };

  const updateAllocation = async (id: string, allocData: any) => {
    const res = await fetch(`/api/transport/allocations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(allocData),
    });
    const data = await res.json();
    if (data.success) {
      _allocationsCache = null;
      _allocationsTimestamp = 0;
      clearStored("sm_transport_allocations");
      invalidateCache("transport");
      await fetchAllocations(true);
    }
    return data;
  };

  const deleteAllocation = async (id: string) => {
    const res = await fetch(`/api/transport/allocations/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      _allocationsCache = null;
      _allocationsTimestamp = 0;
      clearStored("sm_transport_allocations");
      invalidateCache("transport");
      setAllocations((prev) => prev.filter((a) => a.id !== id));
      await fetchAllocations(true);
    }
    return data;
  };

  return { allocations, isLoading, error, fetchAllocations, addAllocation, updateAllocation, deleteAllocation };
}
