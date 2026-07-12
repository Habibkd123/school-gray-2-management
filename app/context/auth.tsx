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
import { AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
interface AuthContextType {
  user: StoredUser | null;
  permissions: Record<string, Record<string, string[]>> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string, loginType?: string) => Promise<{ success: boolean; message: string }>;
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

let _permissionsFetchPromise: Promise<any> | null = null;
let _activeRefreshPromise: Promise<boolean> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, string[]>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [sessionExpiredToast, setSessionExpiredToast] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (_permissionsFetchPromise) {
      try {
        const data = await _permissionsFetchPromise;
        setPermissions(data);
      } catch (err) {
        console.error("Failed to fetch permissions", err);
      }
      return;
    }

    _permissionsFetchPromise = (async () => {
      const res = await fetch("/api/settings/permissions", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch permissions");
      }
      return data.data;
    })();

    try {
      const data = await _permissionsFetchPromise;
      setPermissions(data);
    } catch (err) {
      _permissionsFetchPromise = null;
      console.error("Failed to fetch permissions", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPermissions();
    } else {
      setPermissions(null);
    }
  }, [user, fetchPermissions]);

  // ─── Load user from localStorage on mount ─────────────────────
  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getAccessToken();
    if (storedUser && token) {
      const currentSchoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;
      if (storedUser.role !== "super_admin" && storedUser.school_id !== currentSchoolId) {
        clearSession();
        setUser(null);
      } else {
        setUser(storedUser);
        // Restore must_change_password from persisted session
        if (storedUser.must_change_password) {
          setMustChangePassword(true);
        }
      }
    }
    setIsLoading(false);
  }, []);

  // ─── Login ────────────────────────────────────────────────────
  const login = useCallback(async (
    username: string,
    password: string,
    loginType?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const schoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;

      if (!schoolId || schoolId === "your_school_object_id_here") {
        return { success: false, message: "School not configured. Set NEXT_PUBLIC_SCHOOL_ID in .env" };
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

      const { user: userData, access_token, refresh_token } = data.data;

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
      return { success: true, message: "Login successful" };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  // ─── Register ─────────────────────────────────────────────────
  const register = useCallback(async (
    formData: RegisterData
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const schoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;

      if (!schoolId || schoolId === "your_school_object_id_here") {
        return { success: false, message: "School not configured. Set NEXT_PUBLIC_SCHOOL_ID in .env" };
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
        return {
          ...prev,
          [role]: perms,
        };
      });
    } catch (err: any) {
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
