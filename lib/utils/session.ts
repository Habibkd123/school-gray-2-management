// ─── Token Storage Helpers (localStorage) ────────────────────────
// Ye helpers browser mein access_token aur refresh_token save/load karte hain

const KEYS = {
  ACCESS_TOKEN: "sm_access_token",
  REFRESH_TOKEN: "sm_refresh_token",
  USER: "sm_user",
} as const;

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  school_id: string | null;
  must_change_password?: boolean;
}

// ─── Save ─────────────────────────────────────────────────────────
export const saveSession = (
  accessToken: string,
  refreshToken: string,
  user: StoredUser
) => {
  localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
};

// ─── Load ─────────────────────────────────────────────────────────
export const getAccessToken = (): string | null =>
  localStorage.getItem(KEYS.ACCESS_TOKEN);

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
  localStorage.removeItem(KEYS.ACCESS_TOKEN);
  localStorage.removeItem(KEYS.REFRESH_TOKEN);
  localStorage.removeItem(KEYS.USER);
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
    if (ready) return; // Already confirmed — no polling needed.

    // Poll every 50 ms until the token appears (handles SSR hydration gap).
    const id = setInterval(() => {
      if (localStorage.getItem(KEYS.ACCESS_TOKEN)) {
        setReady(true);
        clearInterval(id);
      }
    }, 50);

    // Give up after 5 s to avoid infinite polling on unauthenticated pages.
    const timeout = setTimeout(() => {
      clearInterval(id);
      setReady(true); // Let hooks run anyway — they'll get a 401 and handle it.
    }, 5000);

    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, [ready]);

  return ready;
}
