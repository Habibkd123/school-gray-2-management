import React, { useState } from "react";
import { X, Lock, Copy, Check, Eye, EyeOff, KeyRound, Info } from "lucide-react";
import { ApiStudent } from "../../hooks/useStudents";
import { ApiTeacher } from "../../hooks/useTeachers";

export interface ApiParentForModal {
  _id: string;
  name: string;
  email?: string;
  user_id?: string | { _id: string; name: string; email: string; role: string; is_active: boolean } | null;
}

interface LoginDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: ApiStudent | null;
  parent?: ApiParentForModal | null;
  teacher?: ApiTeacher | null;
  target: "student" | "parent" | "teacher";
}

// ── Derive the default password for a student from their DOB ─────────
function getStudentDefaultPassword(dob?: string | null): string {
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      const day   = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const yy    = d.getFullYear().toString().slice(-2);
      return `${day}${month}${yy}`;
    }
  }
  return "student123";
}

export function LoginDetailsModal({ isOpen, onClose, student, parent, teacher, target }: LoginDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const getAvatar = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F1F5F9&color=5D6BEE&bold=true`;

  const getClassName = (cid: any) => {
    if (typeof cid === "object" && cid?.name) return `${cid.name} - ${cid.section || ""}`;
    return "Student Profile";
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // ── Resolve info based on target ───────────────────────────────────
  let name = "";
  let subtext = "";
  let email = "";
  let userExists = false;
  let isActive = false;
  let photoUrl = "";
  let badgeLabel = "";
  let badgeStyle = "";
  let defaultPassword = "";
  let mustChangePassword = false;
  let showPasswordRow = false;

  if (target === "student" && student) {
    name    = student.name;
    subtext = getClassName(student.class_id);
    // Prefer the linked User account email (auto-generated login ID), then student.email
    email   = (student.user_id && typeof student.user_id === "object" && student.user_id.email)
      ? student.user_id.email
      : (student.email || "");
    userExists         = !!(student.user_id && typeof student.user_id === "object");
    isActive           = student.user_id && typeof student.user_id === "object"
      ? student.user_id.is_active
      : student.is_active;
    photoUrl           = student.photo_url || "";
    badgeLabel         = "🎓 Student";
    badgeStyle         = "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300";
    const userPlainPassword = (student.user_id && typeof student.user_id === "object" && (student.user_id as any).plain_password);
    defaultPassword    = userPlainPassword || getStudentDefaultPassword((student as any).dob);
    mustChangePassword = !!(student.user_id && typeof student.user_id === "object"
      && (student.user_id as any).must_change_password);
    showPasswordRow    = userExists;

  } else if (target === "parent") {
    let parentObj = parent;
    if (!parentObj && student && student.parent_id && typeof student.parent_id === "object") {
      parentObj = student.parent_id as any;
    }
    if (parentObj) {
      name       = parentObj.name;
      subtext    = "Parent Account";
      email      = (parentObj.user_id && typeof parentObj.user_id === "object" && parentObj.user_id.email)
        ? parentObj.user_id.email
        : (parentObj.email || "");
      userExists = !!(parentObj.user_id && typeof parentObj.user_id === "object");
      isActive   = parentObj.user_id && typeof parentObj.user_id === "object"
        ? parentObj.user_id.is_active
        : true;
      badgeLabel = "👨‍👩‍👧 Parent";
      badgeStyle = "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300";
      const userPlainPassword = (parentObj.user_id && typeof parentObj.user_id === "object" && (parentObj.user_id as any).plain_password);
      defaultPassword    = userPlainPassword || "Parent@123";
      showPasswordRow    = userExists;
      mustChangePassword = !!(parentObj.user_id && typeof parentObj.user_id === "object"
        && (parentObj.user_id as any).must_change_password);
    }

  } else if (target === "teacher" && teacher) {
    name       = teacher.name;
    subtext    = `Employee ID: ${teacher.employee_id || "—"}`;
    email      = (teacher.user_id && typeof teacher.user_id === "object" && teacher.user_id.email)
      ? teacher.user_id.email
      : (teacher.email || "");
    userExists = !!(teacher.user_id && typeof teacher.user_id === "object");
    isActive   = teacher.user_id && typeof teacher.user_id === "object"
      ? teacher.user_id.is_active
      : teacher.is_active;
    photoUrl   = teacher.photo_url || "";
    badgeLabel = "💼 Teacher";
    badgeStyle = "bg-[#F59E0B]/10 text-[#F59E0B]";
    const userPlainPassword = (teacher.user_id && typeof teacher.user_id === "object" && (teacher.user_id as any).plain_password);
    defaultPassword    = userPlainPassword || "password123";
    showPasswordRow    = userExists;
    mustChangePassword = !!(teacher.user_id && typeof teacher.user_id === "object"
      && (teacher.user_id as any).must_change_password);
  }

  const avatarUrl = photoUrl || getAvatar(name || "User");

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100 border border-border text-left">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-[16px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#F59E0B]" />
            <span>Login Details</span>
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 text-center">
            <img src={avatarUrl} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-border" alt="Profile" />
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{name || "—"}</h3>
              <p className="text-[12px] text-slate-500 font-medium">{subtext}</p>
            </div>
          </div>

          {/* Details card */}
          <div className="p-4 border border-border bg-slate-50/50 dark:bg-slate-800/20 rounded-xl space-y-4">
            {/* Badges row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${badgeStyle}`}>
                {badgeLabel}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${isActive ? "bg-[#E8F8E8] text-[#1D7F2C]" : "bg-[#FFEBF0] text-[#FF4A6B]"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#1DD04A]" : "bg-[#FF4A6B]"}`} />
                {isActive ? "Active" : "Disabled"}
              </span>
            </div>

            <div className="space-y-3 text-[13px] border-t border-border pt-3">
              {/* Email / Username */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Username (Email)</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white font-mono break-all text-right text-[12px]">
                    {email || "—"}
                  </span>
                  {email && (
                    <button
                      onClick={() => copyToClipboard(email, "email")}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-[#F59E0B] transition-colors"
                      title="Copy email"
                    >
                      {copiedField === "email" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Password row — only for students */}
              {showPasswordRow && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" />
                    {mustChangePassword ? "Default Password" : "Password"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-[12px] tracking-widest">
                      {showPassword ? defaultPassword : "••••••••"}
                    </span>
                    <button
                      onClick={() => setShowPassword(v => !v)}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-[#F59E0B] transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    {showPassword && (
                      <button
                        onClick={() => copyToClipboard(defaultPassword, "password")}
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-[#F59E0B] transition-colors"
                        title="Copy password"
                      >
                        {copiedField === "password" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Password formula note */}
              {showPasswordRow && mustChangePassword && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded-lg p-2.5 mt-1">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                    {target === "student" && (
                      <>
                        Default password = <strong>Date of Birth</strong> in <strong>DDMMYY</strong> format.
                        If DOB was not provided, password is <strong>student123</strong>.
                        Student must change password on first login.
                      </>
                    )}
                    {target === "teacher" && (
                      <>
                        Default password = <strong>password123</strong>.
                        Teacher must change password on first login.
                      </>
                    )}
                    {target === "parent" && (
                      <>
                        Default password = <strong>Parent@123</strong> or <strong>parent123</strong> (if created automatically during admission).
                        Parent must change password on first login.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Must change password badge */}
              {showPasswordRow && mustChangePassword && (
                <div className="flex items-center gap-1.5 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                  <Lock className="w-3 h-3" />
                  Password change required on next login
                </div>
              )}

              {/* Linked account status */}
              <div className="flex justify-between border-t border-border pt-2.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Linked Account</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {userExists ? "✅ Connected" : "❌ No Account Linked"}
                </span>
              </div>
              {!userExists && (
                <p className="text-[11px] text-slate-400 italic">
                  No user account has been created yet. Ensure email is populated in their profile details.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end bg-slate-50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-border hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
