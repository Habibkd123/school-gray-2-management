"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  saveSession,
  clearSession,
  getStoredUser,
  getAccessToken,
  getRefreshToken,
  getAuthHeaders,
  StoredUser,
} from "@/lib/utils/session";

// ─── Types ──────────────────────────────────────────────────────────
export interface StudentProfile {
  _id: string;
  name: string;
  roll_no?: string;
  admission_no?: string;
  photo_url?: string;
  class_id: { _id: string; name: string; section: string } | string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
}

interface StudentAuthContextType {
  user: StoredUser | null;
  studentProfile: StudentProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/student/profile", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStudentProfile(data.data);
      }
    } catch {
      // silent fail
    }
  }, []);

  // ── Restore session on mount ─────────────────────────────────────
  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getAccessToken();
    if (storedUser && token && storedUser.role === "student") {
      setUser(storedUser);
      fetchProfile();
    }
    setIsLoading(false);
  }, [fetchProfile]);

  // ── Login ────────────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const schoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;
      if (!schoolId || schoolId === "your_school_object_id_here") {
        return { success: false, message: "School not configured. Contact administrator." };
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, school_id: schoolId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || "Login failed" };
      }

      const { user: userData, access_token, refresh_token } = data.data;

      // ── Role guard: only students allowed in this portal ─────────
      if (userData.role !== "student") {
        return {
          success: false,
          message: "Access denied. This portal is only for students. Please use the main portal.",
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
      await fetchProfile();
      return { success: true, message: "Login successful" };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  };

  // ── Logout ────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setStudentProfile(null);
    router.push("/student/login");
  }, [router]);

  // ── Refresh profile ───────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return (
    <StudentAuthContext.Provider
      value={{
        user,
        studentProfile,
        isLoading,
        isAuthenticated: !!user && user.role === "student",
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error("useStudentAuth must be used within a StudentAuthProvider");
  }
  return context;
}
