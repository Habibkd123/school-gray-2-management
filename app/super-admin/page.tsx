"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/utils/session";
import {
  Eye, EyeOff, Lock, Mail, Loader2, ShieldCheck,
  AlertCircle, ChevronRight
} from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, is_super_admin: true }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Login failed. Please check your credentials.");
        return;
      }

      const { user: userData, access_token, refresh_token } = data.data;

      if (userData.role !== "super_admin") {
        setError("Access denied. This portal is for Super Admins only.");
        return;
      }

      saveSession(access_token, refresh_token, {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        school_id: userData.school_id,
        must_change_password: userData.must_change_password ?? false,
      });

      router.push("/dashboard");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
      }}
    >
      {/* Ambient background glows */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md"
        style={{
          background: "linear-gradient(160deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "24px",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.06) inset",
        }}
      >
        {/* Top glow bar */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.7), transparent)",
          }}
        />

        {/* Header */}
        <div className="px-8 pt-10 pb-7 text-center border-b border-white/[0.06]">
          {/* Icon */}
          <div className="flex items-center justify-center mb-5">
            <div
              className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center relative"
              style={{
                background:
                  "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.20) 100%)",
                border: "1px solid rgba(245,158,11,0.30)",
                boxShadow: "0 12px 36px rgba(245,158,11,0.20)",
              }}
            >
              {/* inner shimmer ring */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)",
                }}
              />
              <ShieldCheck className="w-9 h-9 text-primary" />
            </div>
          </div>

          <h1 className="text-[22px] font-bold text-white tracking-tight">
            Super Admin Portal
          </h1>
          <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed">
            MySchoolLife ERP — Restricted Access
          </p>

          {/* Hierarchy badge */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold tracking-wider uppercase">
              Super Admin
            </span>
            <ChevronRight className="w-3 h-3 text-slate-600 dark:text-slate-300" />
            <span className="text-[10px] text-slate-600 dark:text-slate-300">Admin</span>
            <ChevronRight className="w-3 h-3 text-slate-600 dark:text-slate-300" />
            <span className="text-[10px] text-slate-600 dark:text-slate-300">Teacher / Student</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-rose-300 leading-snug">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Email Address
            </label>
            <div className="relative">
              <input
                id="sa-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="superadmin@myschoollife.com"
                className="w-full px-4 py-3 rounded-xl text-[13px] text-white placeholder:text-slate-600 outline-none transition-all"
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: error
                    ? "1px solid rgba(239,68,68,0.40)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(245,158,11,0.50)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Password
            </label>
            <div className="relative">
              <input
                id="sa-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••••••"
                className="w-full pl-4 pr-11 py-3 rounded-xl text-[13px] text-white placeholder:text-slate-600 outline-none transition-all"
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: error
                    ? "1px solid rgba(239,68,68,0.40)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(245,158,11,0.50)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors dark:text-slate-400"
                aria-label="Toggle password visibility"
              >
                {showPw ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="sa-login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-bold text-white transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isLoading
                ? "rgba(245,158,11,0.40)"
                : "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)",
              boxShadow: isLoading
                ? "none"
                : "0 8px 28px rgba(245,158,11,0.35)",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Authenticating…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Sign In as Super Admin
              </>
            )}
          </button>

          {/* Security Note */}
          <p className="text-center text-[11px] text-slate-600 pt-1 dark:text-slate-300">
            🔒 This portal is exclusively for Super Administrators.
            <br />
            Unauthorized access attempts are logged.
          </p>
        </form>

        {/* Footer */}
        <div className="px-8 pb-7 pt-0 text-center">
          <a
            href="/login"
            className="text-[12px] text-slate-500 hover:text-amber-400 transition-colors dark:text-slate-400"
          >
            ← Back to Admin Login
          </a>
        </div>
      </div>

      {/* Branding watermark */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-slate-700 font-medium tracking-wider uppercase select-none dark:text-slate-200">
        MySchoolLife ERP © 2026
      </div>
    </div>
  );
}
