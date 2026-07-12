"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Mail, ChevronRight, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Sun, Moon } from "lucide-react";
import Link from "next/link";

const newsItems = [
  { title: "Summer Vacation Holiday Homework", desc: "The school will remain closed from April 20th to June 15th for summer..." },
  { title: "New Academic Session Admission Start(2024-25)", desc: "An academic term is a portion of an academic year, the time ...." },
  { title: "Date sheet Final Exam Nursery to Sr.Kg", desc: "Dear Parents, As the final examination for the session 2024-25 is ..." },
  { title: "Annual Day Function", desc: "Annual functions provide a platform for students to showcase their..." },
  { title: "Summer Vacation Holiday Homework", desc: "The school will remain closed from April 20th to June 15th for summer..." },
];

export default function ForgetPasswordPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const schoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), school_id: schoolId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
        // Dev mode: show token on screen
        if (data.dev_token) {
          setDevToken(data.dev_token);
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-900 font-sans">

      {/* Left Side - Image & News */}
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
      <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-900">

        {/* Theme Toggle
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="absolute top-6 right-6 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-50 shadow-sm"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        )} */}

        <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 xl:px-24 pb-20 mt-10">
          <div className="w-full max-w-full sm:w-[420px] bg-white dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">

            {success ? (
              /* ─── Success State ─── */
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h1 className="text-[22px] font-bold text-slate-900 dark:text-slate-100 mb-2">Check your email</h1>
                <p className="card-subtitle text-[13px] leading-relaxed mb-6">
                  If <strong className="text-slate-700 dark:text-slate-200">{email}</strong> is registered, we&apos;ve sent password reset instructions.
                </p>

                {/* Dev mode token display */}
                {devToken && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 mb-6 text-left">
                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">🛠 Dev Mode — Reset Token</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-300 break-all font-sans bg-amber-100 dark:bg-amber-500/20 rounded p-2">
                      {devToken}
                    </p>
                    <Link
                      href={`/reset-password?token=${devToken}`}
                      className="mt-3 inline-block text-[12px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      → Click to reset password
                    </Link>
                  </div>
                )}

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[13px] font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </div>
            ) : (
              /* ─── Form State ─── */
              <>
                <div className="mb-6">
                  <h1 className="text-[22px] font-bold text-slate-900 dark:text-slate-100 mb-1">Forgot Password?</h1>
                  <p className="card-subtitle text-[13px] leading-relaxed">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg px-3.5 py-3 mb-5">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-rose-600 dark:text-rose-400 font-medium leading-snug">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Email Address</label>
                    <div className="relative">
                      <input
                        id="forgot-password-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        placeholder="admin@school.com"
                        className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] outline-none focus:border-primary dark:focus:border-primary transition-colors text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <button
                    id="forgot-password-submit"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </form>

                <p className="w-full text-center text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-6">
                  Remember your password?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-semibold">
                    Sign In
                  </Link>
                </p>
              </>
            )}
          </div>

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
