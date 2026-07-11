"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Eye, EyeOff, ChevronRight, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const newsItems = [
  { title: "Summer Vacation Holiday Homework", desc: "The school will remain closed from April 20th to June 15th for summer..." },
  { title: "New Academic Session Admission Start(2024-25)", desc: "An academic term is a portion of an academic year, the time ...." },
  { title: "Date sheet Final Exam Nursery to Sr.Kg", desc: "Dear Parents, As the final examination for the session 2024-25 is ..." },
  { title: "Annual Day Function", desc: "Annual functions provide a platform for students to showcase their..." },
  { title: "Summer Vacation Holiday Homework", desc: "The school will remain closed from April 20th to June 15th for summer..." },
];

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: "", color: "", width: "0%" };
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNum, hasSpecial, password.length >= 10].filter(Boolean).length;
  if (score <= 2) return { label: "Weak", color: "bg-rose-500", width: "33%" };
  if (score <= 3) return { label: "Fair", color: "bg-amber-500", width: "60%" };
  return { label: "Strong", color: "bg-emerald-500", width: "100%" };
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  // No token in URL
  useEffect(() => {
    if (!token) {
      setError("No reset token found. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("Password must contain uppercase, lowercase, and a number");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to reset password. Please try again.");
      } else {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full sm:w-[420px] bg-white dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">

      {success ? (
        /* ─── Success State ─── */
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-[22px] font-bold text-[#202c4b] dark:text-slate-100 mb-2">Password Reset!</h1>
          <p className="card-subtitle text-[13px] leading-relaxed mb-6">
            Your password has been successfully reset. Redirecting you to login...
          </p>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary hover:bg-[#4b58ce] text-white rounded-lg text-[13px] font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Login
          </Link>
        </div>
      ) : (
        /* ─── Form State ─── */
        <>
          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-[#202c4b] dark:text-slate-100 mb-1">Reset Password</h1>
            <p className="card-subtitle text-[13px] leading-relaxed">
              Enter your new password below.
            </p>
          </div>

          {/* No token warning */}
          {!token && (
            <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3.5 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12.5px] text-amber-700 dark:text-amber-400 font-medium">Invalid reset link</p>
                <Link href="/forget-password" className="text-[12px] text-primary hover:underline font-medium">
                  Request a new reset link →
                </Link>
              </div>
            </div>
          )}

          {/* Error */}
          {error && token && (
            <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-3.5 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-rose-600 dark:text-rose-400 font-medium leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-[#202c4b] dark:text-slate-100">New Password</label>
              <div className="relative">
                <input
                  id="reset-new-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  placeholder="Min 8 chars, upper + lower + number"
                  disabled={!token}
                  className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showNewPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-1.5 space-y-1">
                  <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className={`text-[11px] font-medium ${strength.color.replace("bg-", "text-")}`}>{strength.label} password</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-[#202c4b] dark:text-slate-100">Confirm New Password</label>
              <div className="relative">
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="Re-enter new password"
                  disabled={!token}
                  className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword && (
                <p className={`text-[11px] font-medium flex items-center gap-1 ${confirmPassword === newPassword ? "text-emerald-500" : "text-rose-500"}`}>
                  {confirmPassword === newPassword
                    ? <><CheckCircle2 className="w-3 h-3" /> Passwords match</>
                    : <><AlertCircle className="w-3 h-3" /> Passwords do not match</>}
                </p>
              )}
            </div>

            <button
              id="reset-password-submit"
              type="submit"
              disabled={isLoading || !token}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-[#4b58ce] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
              ) : (
                <><Lock className="w-4 h-4" /> Reset Password</>
              )}
            </button>
          </form>

          <p className="w-full text-center text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-6">
            Remember your password?{" "}
            <Link href="/login" className="text-primary hover:text-[#4b58ce] transition-colors font-semibold">
              Sign In
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-900 font-sans">

      {/* Left Side */}
      <div
        className="hidden lg:flex flex-1 relative flex-col justify-center items-center p-12 bg-cover bg-center"
        style={{ backgroundImage: `url('https://preskool.dreamstechnologies.com/html/assets/img/authentication/authentication-04.jpg')` }}
      >
        <div className="absolute inset-0 bg-primary/80 dark:bg-slate-900/80 backdrop-blur-[2px]" />
        <div className="relative z-10 w-full max-w-full sm:w-[500px] bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">What&apos;s New on School ERP !!!</h2>
          <div className="space-y-3">
            {newsItems.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight">{item.title}</h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-full sm:w-[320px]">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-900">
        <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 xl:px-24 pb-20 mt-10">
          <Suspense fallback={
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>

          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
              Copyright © {new Date().getFullYear()} — {process.env.NEXT_PUBLIC_SCHOOL_NAME || "School ERP"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
