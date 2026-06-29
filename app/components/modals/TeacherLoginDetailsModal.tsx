import React, { useState } from "react";
import { X, Lock, Loader2 } from "lucide-react";
import { ApiTeacher } from "../../hooks/useTeachers";
import { getAuthHeaders } from "@/lib/utils/session";

interface TeacherLoginDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: ApiTeacher | null;
}

export function TeacherLoginDetailsModal({ isOpen, onClose, teacher }: TeacherLoginDetailsModalProps) {
  const [password, setPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!teacher) return null;

  const getAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F1F5F9&color=F59E0B&bold=true`;

  const handleUpdatePassword = async () => {
    const teacherUser = teacher?.user_id;
    const tUid = teacherUser && typeof teacherUser === "object" ? teacherUser._id : null;
    if (!tUid) {
      setMsg({ type: "error", text: "No linked teacher user account found." });
      return;
    }
    if (password.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setUpdating(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/users/${tUid}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({ type: "success", text: "Teacher password updated successfully." });
        setPassword("");
      } else {
        setMsg({ type: "error", text: data.message || "Failed to update teacher password." });
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "An error occurred while updating teacher password." });
    } finally {
      setUpdating(false);
    }
  };

  const teacherEmail = typeof teacher.user_id === "object" && teacher.user_id ? teacher.user_id.email : teacher.email;
  const teacherUserExists = !!(teacher.user_id && typeof teacher.user_id === "object");

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100 border border-border">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-[18px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <span>Teacher Login Details & Password</span>
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col">

          {/* Teacher Info Panel */}
          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <img src={teacher.photo_url || getAvatar(teacher.name)} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-border" alt="Teacher" />
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{teacher.name}</h3>
              <p className="text-[12px] text-slate-500 font-medium dark:text-slate-400">Employee ID: {teacher.employee_id || "—"}</p>
            </div>
          </div>

          {/* Feedback Messages */}
          {msg && (
            <div className={`mb-5 p-3 rounded-lg border text-[13px] font-medium text-left ${msg.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"}`}>
              {msg.text}
            </div>
          )}

          {/* Password Reset Section */}
          <div className="space-y-5">
            <div className="p-4 border border-border bg-slate-50/50 dark:bg-slate-800/20 rounded-xl space-y-4 text-left">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                  💼 Teacher Login
                </span>
                <span className="text-[12px] text-slate-600 dark:text-slate-300 font-bold font-mono break-all">
                  {teacherEmail || "—"}
                </span>
              </div>
              {teacherUserExists ? (
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="flex-1">
                    <input
                      type="password"
                      placeholder="Enter new teacher password (min 6 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-[13px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleUpdatePassword}
                    disabled={updating || !password}
                    className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No user account linked. Setup teacher email to enable login.</p>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end bg-slate-50 dark:bg-slate-800/30">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
