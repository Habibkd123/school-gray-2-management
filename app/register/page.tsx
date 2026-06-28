"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/auth";
import { useTheme } from "next-themes";
import { Mail, Eye, EyeOff, ChevronRight, User, Lock, AlertCircle, Loader2, CheckCircle2, Sun, Moon } from "lucide-react";
import Link from "next/link";

const newsItems = [
  { title: "Summer Vacation Holiday Homework", desc: "The school will remain closed from April 20th to June 15th for summer..." },
  { title: "New Academic Session Admission Start(2024-25)", desc: "An academic term is a portion of an academic year, the time ...." },
  { title: "Date sheet Final Exam Nursery to Sr.Kg", desc: "Dear Parents, As the final examination for the session 2024-25 is ..." },
  { title: "Annual Day Function", desc: "Annual functions provide a platform for students to showcase their..." },
  { title: "Summer Vacation Holiday Homework", desc: "The school will remain closed from April 20th to June 15th for summer..." },
];

// Password strength indicator
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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ─── Client-side validation ──────────────────────────────────
    if (!name.trim() || name.trim().length < 2) {
      setError("Full name must be at least 2 characters"); return;
    }
    if (!email.trim()) {
      setError("Email is required"); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address"); return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters"); return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must contain uppercase, lowercase, and a number"); return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match"); return;
    }
    if (!agreeTerms) {
      setError("You must agree to the Terms & Privacy Policy"); return;
    }

    setIsLoading(true);
    const result = await register({ name: name.trim(), email: email.trim(), password });

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-900 font-sans">

      {/* Left Panel */}
      <div
        className="hidden lg:flex flex-1 relative flex-col justify-center items-center p-12 bg-cover bg-center"
        style={{ backgroundImage: `url('https://preskool.dreamstechnologies.com/html/assets/img/authentication/authentication-01.jpg')` }}
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

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-900 h-screen overflow-y-auto">
        
        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="absolute top-6 right-6 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-50 shadow-sm"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        )}

        <div className="flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12 mt-8 sm:mt-0">
          <div className="w-full max-w-full sm:w-[420px] bg-white dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">

            <div className="mb-6">
              <h1 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 mb-1">Create Account</h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">Register as school administrator</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-3.5 py-3 mb-5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-rose-600 dark:text-rose-400 font-medium leading-snug">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4" noValidate>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Full Name</label>
                <div className="relative">
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    placeholder="John Smith"
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Email Address</label>
                <div className="relative">
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="admin@school.com"
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Password</label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Min 8 chars, upper + lower + number"
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {password && (
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
                <label className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Confirm Password</label>
                <div className="relative">
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="Re-enter password"
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] outline-none focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                {/* Match indicator */}
                {confirmPassword && password && (
                  <p className={`text-[11px] font-medium flex items-center gap-1 ${confirmPassword === password ? "text-emerald-500" : "text-rose-500"}`}>
                    {confirmPassword === password
                      ? <><CheckCircle2 className="w-3 h-3" /> Passwords match</>
                      : <><AlertCircle className="w-3 h-3" /> Passwords do not match</>}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-center pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => { setAgreeTerms(e.target.checked); setError(""); }}
                    className="rounded border-slate-300 text-primary focus:ring-primary w-3.5 h-3.5 mt-0.5 shrink-0"
                  />
                  <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                    I agree to the{" "}
                    <Link href="#" className="text-primary hover:underline">Terms & Privacy Policy</Link>
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                id="register-submit"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Create Account</>
                )}
              </button>
            </form>

            <p className="w-full text-center text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-semibold">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
              Copyright © {new Date().getFullYear()} — {process.env.NEXT_PUBLIC_SCHOOL_NAME || "School ERP"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
