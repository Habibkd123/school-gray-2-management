"use client";

import { useEffect, useState } from "react";
import { getAccessToken, getStoredUser } from "@/lib/utils/session";

type ThemeSource = "auth" | "public" | "auto";

interface SchoolThemeProviderProps {
  source?: ThemeSource;
  children: React.ReactNode;
}

// These are hardcoded in globals.css for forced light mode — skip them from theme injection
const SKIP_IN_LIGHT_MODE = new Set(["--background", "--foreground"]);

function applyCssVars(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    if (value && !SKIP_IN_LIGHT_MODE.has(key)) root.style.setProperty(key, value);
  }
}

const _themeCache = new Map<string, Record<string, string>>();
const _themePromises = new Map<string, Promise<Record<string, string> | null>>();

async function fetchThemeEndpoint(endpoint: string, headers: HeadersInit = {}) {
  if (_themeCache.has(endpoint)) {
    return _themeCache.get(endpoint)!;
  }

  if (_themePromises.has(endpoint)) {
    return _themePromises.get(endpoint)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch(endpoint, { headers, cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) return null;
      const cssVars = json.data?.css_vars ?? null;
      if (cssVars) {
        _themeCache.set(endpoint, cssVars);
      }
      return cssVars;
    } catch {
      return null;
    } finally {
      _themePromises.delete(endpoint);
    }
  })();

  _themePromises.set(endpoint, promise);
  return promise;
}

export function SchoolThemeProvider({
  source = "auto",
  children,
}: SchoolThemeProviderProps) {
  useEffect(() => {
    let cancelled = false;

    async function loadTheme() {
      try {
        let cssVars: Record<string, string> | null = null;

        if (source === "public") {
          cssVars = await fetchThemeEndpoint("/api/public/theme");
        } else if (source === "auth") {
          const token = getAccessToken();
          const user = getStoredUser();
          const currentSchoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;
          const isDifferentSchool = user && user.role !== "super_admin" && user.school_id !== currentSchoolId;

          // If super_admin, allow viewing a specific school via localStorage key
          // 'sm_view_school_id' which triggers /api/theme?school_id=xxxx
          if (token && user?.role === "super_admin") {
            const viewId = typeof window !== "undefined" ? localStorage.getItem("sm_view_school_id") : null;
            if (viewId) {
              cssVars = await fetchThemeEndpoint(`/api/theme?school_id=${viewId}`, {
                Authorization: `Bearer ${token}`,
              });
            }
          }

          if (!cssVars && token && !isDifferentSchool && user?.role !== "super_admin") {
            cssVars = await fetchThemeEndpoint("/api/theme", {
              Authorization: `Bearer ${token}`,
            });
          }

          if (!cssVars) {
            cssVars = await fetchThemeEndpoint("/api/public/theme");
          }
        } else {
          // auto: try auth first, then public
          const token = getAccessToken();
          const user = getStoredUser();
          const currentSchoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;
          const isDifferentSchool = user && user.role !== "super_admin" && user.school_id !== currentSchoolId;

          if (token && user?.role === "super_admin") {
            const viewId = typeof window !== "undefined" ? localStorage.getItem("sm_view_school_id") : null;
            if (viewId) {
              cssVars = await fetchThemeEndpoint(`/api/theme?school_id=${viewId}`, {
                Authorization: `Bearer ${token}`,
              });
            }
          }

          if (!cssVars && token && !isDifferentSchool && user?.role !== "super_admin") {
            cssVars = await fetchThemeEndpoint("/api/theme", {
              Authorization: `Bearer ${token}`,
            });
          }

          if (!cssVars) {
            cssVars = await fetchThemeEndpoint("/api/public/theme");
          }
        }

        if (!cancelled && cssVars) {
          applyCssVars(cssVars);
        }
      } catch (err) {
        console.warn("[SchoolThemeProvider] Failed to load theme", err);
      }
    }

    loadTheme();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "sm_access_token") loadTheme();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, [source]);

  return <>{children}</>;
}

/** Read a theme CSS variable from document root (client-only). */
export function getThemeColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value || fallback;
}

export function useThemeColors() {
  const [colors, setColors] = useState({
    primary: "#1E3A5F",
    primaryHover: "#162C47",
    success: "#1FC16B",
    danger: "#EF4444",
    info: "#3B82F6",
    warning: "#FFD700",
  });

  useEffect(() => {
    setColors({
      primary: getThemeColor("--primary", "#1E3A5F"),
      primaryHover: getThemeColor("--primary-hover", "#162C47"),
      success: getThemeColor("--success", "#1FC16B"),
      danger: getThemeColor("--danger", "#EF4444"),
      info: getThemeColor("--info", "#3B82F6"),
      warning: getThemeColor("--warning", "#FFD700"),
    });
  }, []);

  return colors;
}
