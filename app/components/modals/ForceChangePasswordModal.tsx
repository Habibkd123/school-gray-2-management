"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface ForceChangePasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

// ─── Password strength helper ─────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "Weak",   color: "#EF4444" };
  if (score <= 2) return { score, label: "Fair",   color: "var(--primary)" };
  if (score <= 3) return { score, label: "Good",   color: "#3B82F6" };
  return            { score, label: "Strong", color: "#10B981" };
}

export function ForceChangePasswordModal({ isOpen, onSuccess }: ForceChangePasswordModalProps) {
  const [oldPassword,     setOldPassword]     = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOld,     setShowOld]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState("");
  const [fieldErrors,  setFieldErrors]  = useState<{ old?: string; new?: string; confirm?: string }>({});

  if (!isOpen) return null;

  const strength        = getStrength(newPassword);
  const passwordsMatch  = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs: typeof fieldErrors = {};
    if (!oldPassword)                         errs.old = "Old password is required";
    if (!newPassword)                         errs.new = "New password is required";
    else if (newPassword.length < 8)          errs.new = "At least 8 characters required";
    else if (!/[A-Z]/.test(newPassword))      errs.new = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(newPassword))      errs.new = "Must contain a number";
    if (!confirmPassword)                     errs.confirm = "Please confirm your new password";
    else if (newPassword !== confirmPassword) errs.confirm = "Passwords do not match";
    if (oldPassword && oldPassword === newPassword) errs.new = "New password must differ from old password";

    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ current_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(
          data.errors?.length
            ? data.errors.map((e: { message: string }) => e.message).join(". ")
            : data.message || "Failed to change password. Please try again."
        );
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Shared input style helpers ───────────────────────────────────────────
  const inputBase =
    "w-full pl-4 pr-10 py-3 rounded-xl text-[13px] text-slate-900 dark:text-white " +
    "placeholder:text-slate-400 dark:placeholder:text-slate-600 " +
    "bg-white dark:bg-slate-800/60 outline-none transition-all " +
    "font-[var(--font-roboto),sans-serif]";

  const inputBorder = (hasError: boolean) =>
    hasError
      ? "border border-red-400/70 focus:border-red-400"
      : "border border-slate-200 dark:border-slate-700/60 focus:border-primary";

  return (
    /* Full-screen non-dismissable overlay */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
    >
      {/* Dark backdrop — matches app dark bg */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(2,6,23,0.97) 0%, rgba(15,23,42,0.97) 60%, rgba(2,6,23,0.97) 100%)",
        }}
      />

      {/* Modal card — dark slate, matches dashboard dark mode */}
      <div
        className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-300"
        style={{
          background: "linear-gradient(160deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          boxShadow:
            "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.08) inset",
        }}
      >
        {/* Amber top glow — consistent with app accent */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-24 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(245,158,11,0.25) 0%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative px-7 pt-8 pb-6 text-center border-b border-white/[0.07]">
          {/* Icon badge */}
          <div className="flex items-center justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.22) 100%)",
                border: "1px solid rgba(245,158,11,0.35)",
                boxShadow: "0 8px 28px rgba(245,158,11,0.22)",
              }}
            >
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h2
            className="text-[20px] font-bold text-white mb-1.5"
            style={{ fontFamily: "var(--font-roboto), sans-serif" }}
          >
            Password Change Required
          </h2>
          <p className="text-[13px] text-slate-400 leading-relaxed max-w-[280px] mx-auto"
             style={{ fontFamily: "var(--font-roboto), sans-serif" }}>
            For your security, you must change your system-generated password before continuing.
          </p>
        </div>

        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="relative px-7 py-6 space-y-4"
          style={{ fontFamily: "var(--font-roboto), sans-serif" }}
        >
          {/* Global error */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.28)" }}
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-rose-300 leading-snug">{error}</p>
            </div>
          )}

          {/* Old Password */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              Old Password
            </label>
            <div className="relative">
              <input
                id="force-old-password"
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => { setOldPassword(e.target.value); setFieldErrors(p => ({ ...p, old: undefined })); setError(""); }}
                placeholder="Enter your current password"
                className={`${inputBase} ${inputBorder(!!fieldErrors.old)}`}
              />
              <button
                type="button"
                onClick={() => setShowOld(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showOld ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.old && (
              <p className="text-[11.5px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {fieldErrors.old}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              New Password
            </label>
            <div className="relative">
              <input
                id="force-new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setFieldErrors(p => ({ ...p, new: undefined })); setError(""); }}
                placeholder="Min 8 chars, uppercase & number"
                className={`${inputBase} ${inputBorder(!!fieldErrors.new)}`}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showNew ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength bar */}
            {newPassword.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <div className="flex gap-1 h-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full transition-all duration-300"
                      style={{
                        background: i <= strength.score ? strength.color : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-semibold" style={{ color: strength.color }}>
                  {strength.label} password
                </p>
              </div>
            )}

            {fieldErrors.new && (
              <p className="text-[11.5px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {fieldErrors.new}
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="force-confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirm: undefined })); setError(""); }}
                placeholder="Re-enter new password"
                className={`${inputBase} ${
                  passwordsMismatch
                    ? "border border-red-400/70"
                    : passwordsMatch
                    ? "border border-emerald-500/60"
                    : inputBorder(!!fieldErrors.confirm)
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {passwordsMatch && (
              <p className="text-[11.5px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Passwords match
              </p>
            )}
            {passwordsMismatch && (
              <p className="text-[11.5px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Passwords do not match
              </p>
            )}
            {fieldErrors.confirm && !passwordsMismatch && (
              <p className="text-[11.5px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {fieldErrors.confirm}
              </p>
            )}
          </div>

          {/* Submit button — amber gradient, matches app primary CTA */}
          <button
            id="force-change-password-submit"
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isLoading
                ? "rgba(245,158,11,0.4)"
                : "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)",
              boxShadow: isLoading ? "none" : "0 8px 24px rgba(245,158,11,0.35)",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Update Password & Continue
              </>
            )}
          </button>

          {/* Footer note */}
          <p className="text-center text-[11px] text-slate-600 pt-1">
            🔒 This is a one-time mandatory security step. You cannot skip this.
          </p>
        </form>
      </div>
    </div>
  );
}
