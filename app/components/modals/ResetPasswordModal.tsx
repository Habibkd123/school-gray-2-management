import React, { useState } from "react";
import { X, Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  userName: string;
  userEmail: string;
  /** Called after a successful password update — use this to refetch the data list so Login Details modal reflects the new password */
  onSuccess?: () => void;
}

export function ResetPasswordModal({ isOpen, onClose, userId, userName, userEmail, onSuccess }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMsg({ type: "error", text: "No user account linked to reset password." });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    setUpdating(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({ type: "success", text: "Password updated successfully." });
        setNewPassword("");
        setConfirmPassword("");
        // Refetch the list so Login Details modal reflects the new password
        onSuccess?.();
      } else {
        setMsg({ type: "error", text: data.message || "Failed to update password." });
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "An error occurred while updating the password." });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <form onSubmit={handleReset} className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden transform transition-all border border-border text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-[16px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-rose-500" />
            <span>Reset Password</span>
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center pb-2">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2.5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{userName}</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{userEmail || "No Email Linked"}</p>
          </div>

          {msg && (
            <div className={`p-3 rounded-lg border text-[13px] font-medium flex items-start gap-2.5 ${msg.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"}`}>
              {msg.type === "success" ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          {!userId ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-[12px] font-semibold">
              Warning: No user login account is linked to this profile. Create a login first.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">New Password</label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Confirm Password</label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end bg-slate-50 dark:bg-slate-800/30 gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-border hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={updating || !userId || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-[13px] font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Update Password</span>
          </button>
        </div>
      </form>
    </div>
  );
}
