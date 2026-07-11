"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudentAuth } from "../context/studentAuth";
import { useTheme } from "next-themes";
import {
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  GraduationCap,
  BookOpen,
  Award,
  Users,
} from "lucide-react";

export default function StudentLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useStudentAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/student/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Please enter your School Username.");
      return;
    }
    if (!trimmedUsername.endsWith(".myschoollife") || trimmedUsername.includes(" ") || trimmedUsername.includes("@")) {
      setError("Please enter a valid School Username.");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    const result = await login(trimmedUsername, password);

    if (result.success) {
      router.push("/student/dashboard");
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  const features = [
    { icon: BookOpen, title: "Class Schedule", desc: "View your daily routine & timetable" },
    { icon: Award, title: "Exam Results", desc: "Track your grades & performance" },
    { icon: Users, title: "Attendance", desc: "Monitor your attendance record" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 font-sans">
      {/* Left Panel — Features */}
      <div
        className="hidden lg:flex flex-1 relative flex-col justify-center items-center p-12"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #6366f1 100%)",
        }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)",
              top: "-200px",
              right: "-100px",
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
              bottom: "-100px",
              left: "-100px",
            }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px"
          }} />
        </div>

        <div className="relative z-10 w-full max-w-[440px]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #818cf8, #a78bfa)",
                boxShadow: "0 0 30px rgba(129,140,248,0.5)",
              }}
            >
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {process.env.NEXT_PUBLIC_SCHOOL_NAME || "School ERP"}
              </h2>
              <p className="text-[12px] text-indigo-300 font-medium">Student Portal</p>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
            Your Academic Journey
            <br />
            <span className="text-indigo-300">Starts Here</span>
          </h1>
          <p className="text-[14px] text-indigo-200/80 mb-10 max-w-[360px] leading-relaxed">
            Access your class schedule, homework, exam results, attendance and
            more — all in one place.
          </p>

          {/* Feature cards */}
          <div className="space-y-3">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                    }}
                  >
                    <Icon className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-white">{feat.title}</h3>
                    <p className="text-[12px] text-indigo-300/80">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-950">
        {/* Theme toggle
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="absolute top-6 right-6 flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-50 shadow-sm"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        )} */}

        <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 xl:px-24 pb-20">
          <div className="w-full max-w-[420px]">
            {/* Mobile-only branding */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-slate-900 dark:text-white">
                  {process.env.NEXT_PUBLIC_SCHOOL_NAME || "School ERP"}
                </p>
                <p className="text-[11px] text-indigo-500 font-medium">Student Portal</p>
              </div>
            </div>

            {/* Form card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-8">
              <div className="mb-6">
                <h1 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Student Login
                </h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Sign in with your student credentials
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl px-3.5 py-3 mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-rose-600 dark:text-rose-400 font-medium leading-snug">
                    {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                    School Username
                  </label>
                  <div className="relative">
                    <input
                      id="student-login-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setError(""); }}
                      placeholder="Enter your school username. Example: greenvalley.myschoollife"
                      className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="student-login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="student-login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg text-white"
                  style={{
                    background: isLoading
                      ? "#94a3b8"
                      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow: isLoading ? "none" : "0 4px 15px rgba(99,102,241,0.4)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              {/* Back to main */}
              <div className="mt-6 text-center">
                <a
                  href="/login"
                  className="text-[12px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  ← Back to Main Portal
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-[12px] text-slate-400 dark:text-slate-500 font-medium">
            Copyright © {new Date().getFullYear()} — {process.env.NEXT_PUBLIC_SCHOOL_NAME || "School ERP"}
          </p>
        </div>
      </div>
    </div>
  );
}
