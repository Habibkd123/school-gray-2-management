// ─── Token Storage Helpers (localStorage) ────────────────────────
// Ye helpers browser mein access_token aur refresh_token save/load karte hain

const KEYS = {
  ACCESS_TOKEN: "sm_access_token",
  REFRESH_TOKEN: "sm_refresh_token",
  USER: "sm_user",
  SCHOOL_INFO: "sm_school_info",
} as const;

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  school_id: string | null;
  must_change_password?: boolean;
}

export interface SchoolInfo {
  id: string;
  name: string;
  subtitle?: string;
  logo_url?: string | null;
  subdomain?: string;
}

// ─── Save ─────────────────────────────────────────────────────────
export const saveSession = (
  accessToken: string,
  refreshToken: string,
  user: StoredUser,
  school?: SchoolInfo | null
) => {
  localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
  if (school) {
    localStorage.setItem(KEYS.SCHOOL_INFO, JSON.stringify(school));
  }
};

export const saveSchoolInfo = (school: SchoolInfo | null) => {
  if (typeof window === "undefined") return;
  if (school) {
    localStorage.setItem(KEYS.SCHOOL_INFO, JSON.stringify(school));
  } else {
    localStorage.removeItem(KEYS.SCHOOL_INFO);
  }
};

export const getStoredSchoolInfo = (): SchoolInfo | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS.SCHOOL_INFO);
    return raw ? (JSON.parse(raw) as SchoolInfo) : null;
  } catch {
    return null;
  }
};

// ─── Load ─────────────────────────────────────────────────────────
export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(KEYS.ACCESS_TOKEN);
  if (token) return token;

  // Fallback to cookie (for cross-subdomain authentication)
  try {
    const match = document.cookie.match(/(?:^|;\s*)sm_token=([^;]+)/);
    if (match && match[1]) {
      const cookieToken = decodeURIComponent(match[1]);
      localStorage.setItem(KEYS.ACCESS_TOKEN, cookieToken);
      return cookieToken;
    }
  } catch {}

  return null;
};

export const getRefreshToken = (): string | null =>
  localStorage.getItem(KEYS.REFRESH_TOKEN);

export const getStoredUser = (): StoredUser | null => {
  try {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
};

// ─── Clear ────────────────────────────────────────────────────────
export const clearSession = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.SCHOOL_INFO);
    try {
      sessionStorage.removeItem("sm_active_subdomain");
      sessionStorage.removeItem("sm_cached_permissions");
      sessionStorage.removeItem("sm_cached_permissions_time");
    } catch {}

    // Clear cookies across root domain and current domain
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";
    const cookiesToClear = ["sm_token", "sm_subdomain", "sm_role"];
    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0;`;
      document.cookie = `${name}=; path=/; domain=.${rootDomain}; max-age=0;`;
    });
  }
};

// ─── Update must_change_password flag only ────────────────────────
export const clearMustChangePassword = () => {
  const user = getStoredUser();
  if (!user) return;
  localStorage.setItem(KEYS.USER, JSON.stringify({ ...user, must_change_password: false }));
};

// ─── Auth Header Helper ───────────────────────────────────────────
export const getAuthHeaders = (): HeadersInit => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── useAuthReady ─────────────────────────────────────────────────
// Returns true once the access token has been found in localStorage.
// Hooks should skip their initial fetch until this is true to prevent
// race conditions where the API call fires before the session is restored
// (causing 401 / empty responses on first page load).
import { useState, useEffect } from "react";

export function useAuthReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => {
    // On the server this is always false; on the client we can check immediately.
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(KEYS.ACCESS_TOKEN);
  });

  useEffect(() => {
    if (ready) return; // Already confirmed — no listener needed.

    // Listen for the storage event (fires when saveSession writes the token).
    // This is instant — no polling delay.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.ACCESS_TOKEN && e.newValue) {
        setReady(true);
      }
    };
    window.addEventListener("storage", onStorage);

    // Also do a single immediate check in case the token was written before
    // this effect ran (e.g., token already present from a previous tab).
    if (localStorage.getItem(KEYS.ACCESS_TOKEN)) {
      setReady(true);
    }

    // Safety fallback: give up after 5 s so hooks can run (will get 401).
    const timeout = setTimeout(() => setReady(true), 5000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearTimeout(timeout);
    };
  }, [ready]);

  return ready;
}
