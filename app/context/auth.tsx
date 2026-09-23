"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  saveSession,
  clearSession,
  getStoredUser,
  getAccessToken,
  getRefreshToken,
  getAuthHeaders,
  clearMustChangePassword,
  StoredUser,
} from "@/lib/utils/session";
import { getClientSubdomain, resolveSchoolIdBySubdomain, getSubdomainHost } from "@/lib/utils/subdomain";
import { AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
interface AuthContextType {
  user: StoredUser | null;
  permissions: Record<string, Record<string, string[]>> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string, loginType?: string) => Promise<{ success: boolean; message: string; schoolSubdomain?: string | null }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateRolePermissions: (role: string, perms: Record<string, string[]>) => Promise<void>;
  clearMustChangePasswordFlag: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERMISSIONS_CACHE_KEY = "sm_cached_permissions";
const PERMISSIONS_CACHE_TIME_KEY = "sm_cached_permissions_time";
const PERMISSIONS_TTL_MS = 15 * 60 * 1000; // 15 minutes

let _permissionsFetchPromise: Promise<Record<string, Record<string, string[]>>> | null = null;
let _activeRefreshPromise: Promise<boolean> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Single source of truth from lib/utils/subdomain
  const getSubdomain = (): string | null => {
    return getClientSubdomain();
  };

  const [user, setUser] = useState<StoredUser | null>(() => {
    if (typeof window !== "undefined") {
      const storedUser = getStoredUser();
      const token = getAccessToken();
      if (storedUser && token) {
        if (storedUser.role === "super_admin") return storedUser;
        const subdomain = getSubdomain();
        const hostname = window.location.hostname;
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
        // On root domain (production without subdomain), non-super_admins have no school context
        if (!subdomain && !isLocal) return null;
        // school_id will be validated on mount via API
        return storedUser;
      }
    }
    return null;
  });

  const [permissions, setPermissions] = useState<Record<string, Record<string, string[]>> | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(PERMISSIONS_CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const storedUser = getStoredUser();
      const token = getAccessToken();
      if (storedUser && token) {
        return false;
      }
    }
    return true;
  });

  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const storedUser = getStoredUser();
      return !!storedUser?.must_change_password;
    }
    return false;
  });
  const [sessionExpiredToast, setSessionExpiredToast] = useState(false);

  const fetchPermissions = useCallback(async (force = false): Promise<Record<string, Record<string, string[]>> | null> => {
    if (typeof window !== "undefined" && !force) {
      const cached = sessionStorage.getItem(PERMISSIONS_CACHE_KEY);
      const cachedTime = sessionStorage.getItem(PERMISSIONS_CACHE_TIME_KEY);
      const now = Date.now();
      if (cached && cachedTime && now - parseInt(cachedTime, 10) < PERMISSIONS_TTL_MS) {
        return null; // Fresh cache already in state
      }
    }

    if (_permissionsFetchPromise) {
      try {
        return await _permissionsFetchPromise;
      } catch (err) {
        console.error("Failed to fetch permissions", err);
        return null;
      }
    }

    _permissionsFetchPromise = (async () => {
      const res = await fetch("/api/settings/permissions", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch permissions");
      }
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(data.data));
          sessionStorage.setItem(PERMISSIONS_CACHE_TIME_KEY, Date.now().toString());
        } catch {
          // ignore storage quota errors
        }
      }
      return data.data;
    })();

    try {
      const data = await _permissionsFetchPromise;
      return data;
    } catch (err) {
      _permissionsFetchPromise = null;
      console.error("Failed to fetch permissions", err);
      return null;
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    if (user) {
      fetchPermissions().then((data) => {
        if (!isCancelled && data) {
          setPermissions(data);
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [user, fetchPermissions]);

  // ─── Verify session validity on mount ─────────────────────────
  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getAccessToken();
    if (!storedUser || !token) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }
    if (storedUser.role === "super_admin") {
      queueMicrotask(() => setIsLoading(false));
      return;
    }
    // Validate that stored school_id matches current subdomain's school
    const subdomain = getSubdomain();
    if (!subdomain) {
      // No subdomain in URL — check sm_subdomain cookie and redirect if not standalone
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const cookieMatch = document.cookie.match(/(?:^|;\s*)sm_subdomain=([^;]+)/);
      const targetSub = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
      if (targetSub) {
        const expectedHost = getSubdomainHost(targetSub, isLocal);
        const currentHost = window.location.hostname;
        if (currentHost !== expectedHost) {
          const port = window.location.port ? `:${window.location.port}` : "";
          const protocol = window.location.protocol;
          window.location.href = `${protocol}//${expectedHost}${port}${window.location.pathname}${window.location.search}`;
          return;
        }
      }

      clearSession();
      queueMicrotask(() => {
        setUser(null);
        setIsLoading(false);
      });
      return;
    }

    // Validate that storedUser's school_id matches the active school
    resolveSchoolIdBySubdomain(subdomain)
      .then((resolvedSchoolId) => {
        if (resolvedSchoolId && storedUser.school_id && storedUser.school_id !== resolvedSchoolId) {
          console.warn("[Auth] School mismatch. Stored school:", storedUser.school_id, "Current school:", resolvedSchoolId);
          clearSession();
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // ─── Login ────────────────────────────────────────────────────
  const login = useCallback(async (
    username: string,
    password: string,
    loginType?: string
  ): Promise<{ success: boolean; message: string; schoolSubdomain?: string | null }> => {
    try {
      // ── Resolve school_id from subdomain ──────────────────────
      const subdomain = getSubdomain();

      let schoolId: string | null = null;

      if (subdomain) {
        // Resolve school_id from the subdomain visible in the browser URL
        schoolId = await resolveSchoolIdBySubdomain(subdomain);
        if (!schoolId) {
          return { success: false, message: "School not found for this subdomain." };
        }
      } else {
        // No subdomain — this login form should be on a school's subdomain
        return { success: false, message: "Please open your school's URL to login (e.g. yourschool.myschoollife.in)." };
      }

      if (!schoolId) {
        return { success: false, message: "School not found. Please check the URL." };
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, school_id: schoolId, login_type: loginType }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, message: data.message || "Login failed" };
      }

      const { user: userData, access_token, refresh_token, school_subdomain } = data.data;

      // Allow student and parent logins on this portal as requested
      const ADMIN_PORTAL_ROLES = ["super_admin", "school_admin", "accountant", "teacher", "student", "parent"];
      if (!ADMIN_PORTAL_ROLES.includes(userData.role)) {
        return {
          success: false,
          message: "Access denied.",
        };
      }

      saveSession(access_token, refresh_token, {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        school_id: userData.school_id,
        must_change_password: userData.must_change_password ?? false,
      });

      setUser(userData);
      // Set must_change_password state for forced modal
      setMustChangePassword(userData.must_change_password ?? false);
      return { success: true, message: "Login successful", schoolSubdomain: school_subdomain };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  // ─── Register ─────────────────────────────────────────────────
  const register = useCallback(async (
    formData: RegisterData
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Resolve school_id from the current subdomain (same strategy as login)
      const subdomain = getClientSubdomain();
      let schoolId: string | null = null;

      if (subdomain) {
        schoolId = await resolveSchoolIdBySubdomain(subdomain);
      }

      if (!schoolId) {
        return { success: false, message: "School not found. Please open this page from your school's URL." };
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          school_id: schoolId,
          role: formData.role || "school_admin",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Show first validation error if present
        if (data.errors?.length) {
          return { success: false, message: data.errors[0].message };
        }
        return { success: false, message: data.message || "Registration failed" };
      }

      const { user: userData, access_token, refresh_token } = data.data;

      saveSession(access_token, refresh_token, {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        school_id: userData.school_id,
      });

      setUser(userData);
      return { success: true, message: "Registration successful" };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  // ─── Logout ───────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PERMISSIONS_CACHE_KEY);
      sessionStorage.removeItem(PERMISSIONS_CACHE_TIME_KEY);
    }
    setUser(null);
    setPermissions(null);
    setMustChangePassword(false);
    _permissionsFetchPromise = null;
    router.push("/");
  }, [router]);

  // ─── Token Refresh ────────────────────────────────────────────
  const tryRefreshToken = useCallback(async (): Promise<boolean> => {
    if (_activeRefreshPromise) {
      return _activeRefreshPromise;
    }

    _activeRefreshPromise = (async () => {
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;

        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) return false;

        const { access_token, refresh_token } = data.data;
        const currentUser = getStoredUser();
        if (!currentUser) return false;

        saveSession(access_token, refresh_token, currentUser);
        return true;
      } catch {
        return false;
      }
    })();

    try {
      const success = await _activeRefreshPromise;
      return success;
    } finally {
      _activeRefreshPromise = null;
    }
  }, []);

  // ─── Global Fetch Interceptor ─────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (response.status === 401) {
        const urlStr = typeof input === "string" ? input : (input as Request).url;
        // Don't intercept credentials or login validation/config requests
        const isAuthApi =
          urlStr.includes("/api/auth/login") ||
          urlStr.includes("/api/auth/refresh") ||
          urlStr.includes("/api/school/login-config");

        if (!isAuthApi) {
          const refreshSuccess = await tryRefreshToken();
          if (refreshSuccess) {
            const newAccessToken = getAccessToken();
            const newHeaders = new Headers((init?.headers || {}) as HeadersInit);
            newHeaders.set("Authorization", `Bearer ${newAccessToken}`);

            const newInit = {
              ...(init || {}),
              headers: newHeaders,
            };

            return originalFetch(input, newInit);
          } else {
            clearSession();
            setUser(null);
            setMustChangePassword(false);
            setSessionExpiredToast(true);
            setTimeout(() => setSessionExpiredToast(false), 5000);
            router.push("/");
          }
        }
      } else if (response.status === 403) {
        const urlStr = typeof input === "string" ? input : (input as Request).url;
        const isAuthApi =
          urlStr.includes("/api/auth/login") ||
          urlStr.includes("/api/auth/refresh") ||
          urlStr.includes("/api/school/login-config");

        if (!isAuthApi) {
          clearSession();
          setUser(null);
          setMustChangePassword(false);
          setSessionExpiredToast(true);
          setTimeout(() => setSessionExpiredToast(false), 5000);
          router.push("/");
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router, tryRefreshToken]);

  // ─── Clear mustChangePassword after forced change ───────────────
  const clearMustChangePasswordFlag = useCallback(() => {
    clearMustChangePassword(); // update localStorage
    setMustChangePassword(false);
  }, []);

  // ─── Refresh user data from /me ──────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        // Token expired — try refresh
        const newToken = await tryRefreshToken();
        if (!newToken) {
          logout();
          return;
        }
      }

      const data = await res.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch {
      // Silent fail
    }
  }, [logout, tryRefreshToken]);

  const updateRolePermissions = useCallback(async (role: string, perms: Record<string, string[]>) => {
    try {
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role, permissions: perms }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update permissions");
      }
      setPermissions((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          [role]: perms,
        };
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(updated));
            sessionStorage.setItem(PERMISSIONS_CACHE_TIME_KEY, Date.now().toString());
          } catch {
            // ignore
          }
        }
        return updated;
      });
    } catch (err: unknown) {
      throw err;
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    permissions,
    isLoading,
    isAuthenticated: !!user,
    mustChangePassword,
    login,
    register,
    logout,
    refreshUser,
    updateRolePermissions,
    clearMustChangePasswordFlag,
  }), [
    user,
    permissions,
    isLoading,
    mustChangePassword,
    login,
    register,
    logout,
    refreshUser,
    updateRolePermissions,
    clearMustChangePasswordFlag,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {sessionExpiredToast && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium transition-all bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Your session has expired. Please log in again.
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
