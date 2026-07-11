"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useLoginConfig } from "@/app/hooks/useLoginConfig";
import RolesPermissionsPage from "../roles/page";
import {
  RefreshCw, Upload, Edit, EyeOff, Eye, Save, X,
  Loader2, CheckCircle2, AlertCircle, User, Lock, MapPin,
  TrendingUp, ClipboardList, CreditCard, Users, Mail, MessageSquare, 
  PieChart, Wallet, Book, Sparkles
} from "lucide-react";

interface ParentProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  occupation?: string;
  photo_url?: string;
  relation?: string;
}

function getAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=D2232A&color=fff&bold=true&size=200`;
}

const UPCOMING_FEATURES = [
  {
    name: "Student Promotion",
    description: "Easily promote students to the next academic year or class.",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  {
    name: "Exam Module",
    description: "Create exams, manage grading, generate report cards, and publish results.",
    icon: ClipboardList,
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    name: "Fees Management",
    description: "Track fee payments, generate receipts, and manage pending dues.",
    icon: CreditCard,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  {
    name: "Group Classes",
    description: "Organize students into custom groups for specialized sessions.",
    icon: Users,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10"
  },
  {
    name: "Email Integration",
    description: "Send automated email notifications and newsletters to parents and staff.",
    icon: Mail,
    color: "text-sky-500",
    bg: "bg-sky-500/10"
  },
  {
    name: "SMS Messaging",
    description: "Send instant SMS alerts for attendance, fees, and announcements.",
    icon: MessageSquare,
    color: "text-rose-500",
    bg: "bg-rose-500/10"
  },
  {
    name: "Parent Portal / Login",
    description: "Dedicated login for parents to track child's progress and attendance.",
    icon: User,
    color: "text-teal-500",
    bg: "bg-teal-500/10"
  },
  {
    name: "Reports & Analytics",
    description: "Comprehensive reporting and analytics for school administration.",
    icon: PieChart,
    color: "text-orange-500",
    bg: "bg-orange-500/10"
  },
  {
    name: "Salary / Payroll",
    description: "Manage employee salaries, payroll generation, and payslips.",
    icon: Wallet,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10"
  },
  {
    name: "Library Management",
    description: "Manage books, issue/return records, fines, and library members.",
    icon: Book,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  }
];

export default function ProfilePage() {
  const { user } = useAuth();
  const isParent = user?.role === "parent";
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";

  // Tab control
  const [activeTab, setActiveTab] = useState<"profile" | "roles" | "academic" | "login" | "upcoming">("profile");

  // Profile state
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [occupation, setOccupation] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  // Photo upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Academic configuration state
  const { config, isLoading: isConfigLoading, updateConfig, refetch: refetchConfig } = useAcademicConfig();
  const [savingConfig, setSavingConfig] = useState<"streams" | "sections" | null>(null);
  const [configSuccessMsg, setConfigSuccessMsg] = useState("");
  const [configErrorMsg, setConfigErrorMsg] = useState("");

  // Login configuration state
  const { config: loginConfig, isLoading: isLoginConfigLoading, updateConfig: updateLoginConfig, refetch: refetchLoginConfig } = useLoginConfig();
  const [savingLoginConfig, setSavingLoginConfig] = useState<"student" | "teacher" | null>(null);
  const [loginSuccessMsg, setLoginSuccessMsg] = useState("");
  const [loginErrorMsg, setLoginErrorMsg] = useState("");

  // ── Load profile ─────────────────────────────────────────────────
  const loadProfile = async () => {
    setLoading(true);
    try {
      if (isParent) {
        const res = await fetch("/api/parent/profile", { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          setProfile(data.data);
          setName(data.data.name || "");
          setEmail(data.data.email || "");
          setPhone(data.data.phone || "");
          setAddress(data.data.address || "");
          setOccupation(data.data.occupation || "");
          setPhotoUrl(data.data.photo_url || "");
        }
      } else if (isTeacher) {
        const res = await fetch("/api/teacher/profile", { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          setProfile(data.data);
          setName(data.data.name || "");
          setEmail(data.data.email || "");
          setPhone(data.data.phone || "");
          setAddress(data.data.address || "");
          setPhotoUrl(data.data.photo_url || "");
        }
      } else {
        // For other roles — use auth user data
        setName(user?.name || "");
        setEmail(user?.email || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  // ── Save profile ──────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const url = isParent ? "/api/parent/profile" : (isTeacher ? "/api/teacher/profile" : null);
      if (!url) {
        setSaveError("Profile edit not supported for this role.");
        setSaving(false);
        return;
      }
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name, email, phone, address, occupation, photo_url: photoUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setProfile(data.data);
        setEditMode(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.message || "Failed to save");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setSaveError("");
    // Reset to saved values
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setOccupation(profile.occupation || "");
      setPhotoUrl(profile.photo_url || "");
    } else {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setPhone("");
      setAddress("");
      setPhotoUrl("");
    }
  };

  // ── Photo upload ──────────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, headers: getAuthHeaders() });
      const data = await res.json();
      if (data.url) setPhotoUrl(data.url);
    } catch {
      console.error("Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }

    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwSuccess("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPwSuccess(""), 4000);
      } else {
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const errMsgs = data.errors.map((err: any) => err.message).join(", ");
          setPwError(errMsgs);
        } else {
          setPwError(data.message || "Failed to change password");
        }
      }
    } catch {
      setPwError("Network error. Please try again.");
    } finally {
      setChangingPw(false);
    }
  };

  // ── Academic Config toggling ─────────────────────────────────────────
  const handleConfigToggle = async (key: "enable_streams" | "enable_sections", value: boolean) => {
    if (!isAdmin) return;
    setSavingConfig(key === "enable_streams" ? "streams" : "sections");
    setConfigSuccessMsg("");
    setConfigErrorMsg("");
    const result = await updateConfig({ [key]: value });
    setSavingConfig(null);
    if (result.success) {
      setConfigSuccessMsg(`${key === "enable_streams" ? "Streams" : "Sections"} ${value ? "enabled" : "disabled"}.`);
      setTimeout(() => setConfigSuccessMsg(""), 3000);
    } else {
      setConfigErrorMsg(result.message || "Failed to update.");
      setTimeout(() => setConfigErrorMsg(""), 4000);
    }
  };

  // ── Login Config toggling ─────────────────────────────────────────
  const handleLoginConfigToggle = async (key: "disable_student_login" | "disable_teacher_login", value: boolean) => {
    if (!isAdmin) return;
    setSavingLoginConfig(key === "disable_student_login" ? "student" : "teacher");
    setLoginSuccessMsg("");
    setLoginErrorMsg("");
    const result = await updateLoginConfig({ [key]: value });
    setSavingLoginConfig(null);
    if (result.success) {
      setLoginSuccessMsg(`${key === "disable_student_login" ? "Student" : "Teacher"} login ${value ? "disabled" : "enabled"}.`);
      setTimeout(() => setLoginSuccessMsg(""), 3000);
    } else {
      setLoginErrorMsg(result.message || "Failed to update.");
      setTimeout(() => setLoginErrorMsg(""), 4000);
    }
  };

  const displayName = name || user?.name || "User";
  const displayPhoto = photoUrl || getAvatar(displayName);

  const handleRefreshClick = () => {
    if (activeTab === "profile") {
      loadProfile();
    } else if (activeTab === "academic" && isAdmin) {
      refetchConfig();
    } else if (activeTab === "login" && isAdmin) {
      refetchLoginConfig();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      {activeTab !== "roles" && (
        <div className="page-header mb-2">
          <div>
            <h1 className="page-title">
              {activeTab === "profile" ? "Profile" : (activeTab === "academic" ? "Academic Settings" : "Login Settings")}
            </h1>
            <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
              <span>Dashboard</span>
              <span>/</span>
              <span>Settings</span>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-medium">
                {activeTab === "profile" ? "Profile" : (activeTab === "academic" ? "Academic Settings" : (activeTab === "upcoming" ? "Upcoming Features" : "Login Settings"))}
              </span>
            </div>
          </div>
          <button
            onClick={handleRefreshClick}
            className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-border gap-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap ${ activeTab === "profile" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300" } dark:text-slate-400`}
        >
          Profile
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab("roles")}
              className={`pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap ${ activeTab === "roles" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300" } dark:text-slate-400`}
            >
              Roles & Permissions
            </button>
            <button
              onClick={() => setActiveTab("academic")}
              className={`pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap ${ activeTab === "academic" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300" } dark:text-slate-400`}
            >
              Academic Settings
            </button>
            <button
              onClick={() => setActiveTab("login")}
              className={`pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap ${ activeTab === "login" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300" } dark:text-slate-400`}
            >
              Login Settings
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${ activeTab === "upcoming" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300" } dark:text-slate-400`}
        >
          <Sparkles className="w-4 h-4" /> Upcoming Features
        </button>
      </div>

      {activeTab === "upcoming" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {UPCOMING_FEATURES.map((feature, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left hover:-translate-y-1 hover:shadow-lg transition-all duration-300 h-fit">
              <div className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${feature.bg}`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                    Coming Soon
                  </span>
                </div>
                
                <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {feature.name}
                </h3>
                
                <p className="text-[13px] text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "roles" && isAdmin ? (
        <RolesPermissionsPage />
      ) : activeTab === "academic" && isAdmin ? (
        /* Academic Settings Tab */
        <div className="space-y-5 text-left max-w-lg">
          {configSuccessMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {configSuccessMsg}
            </div>
          )}
          {configErrorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {configErrorMsg}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl divide-y divide-border shadow-sm">
            {isConfigLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[13px]">Loading…</span>
              </div>
            ) : (
              <>
                {/* Streams */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-white">Enable Streams</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Science, Commerce, Arts etc.</p>
                  </div>
                  <button
                    onClick={() => handleConfigToggle("enable_streams", !config.enable_streams)}
                    disabled={savingConfig !== null}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${config.enable_streams ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"}`}
                  >
                    {savingConfig === "streams" && <Loader2 className="absolute left-0 right-0 mx-auto w-3 h-3 animate-spin text-white" />}
                    <span className={`inline-block h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform ${config.enable_streams ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {/* Sections */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-white">Enable Sections</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Divide classes into A, B, C…</p>
                  </div>
                  <button
                    onClick={() => handleConfigToggle("enable_sections", !config.enable_sections)}
                    disabled={savingConfig !== null}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${config.enable_sections ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"}`}
                  >
                    {savingConfig === "sections" && <Loader2 className="absolute left-0 right-0 mx-auto w-3 h-3 animate-spin text-white" />}
                    <span className={`inline-block h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform ${config.enable_sections ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : activeTab === "login" && isAdmin ? (
        /* Login Settings Tab */
        <div className="space-y-5 text-left max-w-lg">
          {loginSuccessMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {loginSuccessMsg}
            </div>
          )}
          {loginErrorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {loginErrorMsg}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl divide-y divide-border shadow-sm">
            {isLoginConfigLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[13px]">Loading…</span>
              </div>
            ) : (
              <>
                {/* Enable Student Login */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-white">Enable Student Login</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Allow student users to log in to the system.</p>
                  </div>
                  <button
                    onClick={() => handleLoginConfigToggle("disable_student_login", !loginConfig.disable_student_login)}
                    disabled={savingLoginConfig !== null}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${!loginConfig.disable_student_login ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"}`}
                  >
                    {savingLoginConfig === "student" && <Loader2 className="absolute left-0 right-0 mx-auto w-3 h-3 animate-spin text-white" />}
                    <span className={`inline-block h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform ${!loginConfig.disable_student_login ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {/* Enable Teacher Login */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-white">Enable Teacher Login</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Allow teacher users to log in to the system.</p>
                  </div>
                  <button
                    onClick={() => handleLoginConfigToggle("disable_teacher_login", !loginConfig.disable_teacher_login)}
                    disabled={savingLoginConfig !== null}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${!loginConfig.disable_teacher_login ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"}`}
                  >
                    {savingLoginConfig === "teacher" && <Loader2 className="absolute left-0 right-0 mx-auto w-3 h-3 animate-spin text-white" />}
                    <span className={`inline-block h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform ${!loginConfig.disable_teacher_login ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Profile Tab (Original Columns) */
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── LEFT COLUMN: Avatar ── */}
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
              <div className="p-5 border-b border-border">
                <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Your Photo</h2>
              </div>
              <div className="p-5 flex flex-col items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover" />
                  </div>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{displayName}</h3>
                  <p className="text-[12px] text-slate-500 capitalize mt-0.5 dark:text-slate-400">{user?.role?.replace("_", " ")}</p>
                  {profile?.relation && (
                    <span className="mt-1 inline-block px-2 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 text-[11px] font-bold rounded-full">
                      {profile.relation}
                    </span>
                  )}
                </div>

                {/* Upload photo */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 flex flex-col items-center justify-center text-center hover:bg-primary/5 hover:border-primary/40 transition-colors cursor-pointer group"
                >
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-primary mb-2 transition-colors" />
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    <span className="text-primary font-bold">Click to upload</span> or drag & drop
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">JPG or PNG (max 450×450px)</p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex-1 space-y-6">
            {/* Success / Error banners */}
            {saveSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Profile saved successfully!
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                <AlertCircle className="w-4 h-4" /> {saveError}
              </div>
            )}

            {/* Personal Information */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Personal Information
                </h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCancel}
                      className="btn btn-outline flex items-center gap-2"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      disabled={!editMode}
                      placeholder="Full name"
                      className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={!editMode}
                      placeholder="Email"
                      className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      disabled={!editMode}
                      placeholder="Phone"
                      className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
                    />
                  </div>

                  {/* Occupation (parent only) */}
                  {isParent && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Occupation</label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={e => setOccupation(e.target.value)}
                        disabled={!editMode}
                        placeholder="e.g. Engineer, Teacher..."
                        className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
                      />
                    </div>
                  )}

                  {/* Role (readonly) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Role</label>
                    <input
                      type="text"
                      value={user?.role?.replace("_", " ") || ""}
                      disabled
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-border rounded-lg text-[13px] text-slate-500 dark:text-slate-400 cursor-default w-full capitalize"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address (parent only) */}
            {isParent && (
              <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
                <div className="p-5 border-b border-border">
                  <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Address
                  </h2>
                </div>
                <div className="p-5">
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    disabled={!editMode}
                    rows={3}
                    placeholder="Enter your address"
                    className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full resize-none disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
                  />
                </div>
              </div>
            )}

            {/* Change Password */}
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
              <div className="p-5 border-b border-border bg-slate-50/50 dark:bg-slate-800/30">
                <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" /> Change Password
                </h2>
              </div>
              <form onSubmit={handleChangePassword} className="p-5 space-y-4">
                {pwSuccess && (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> {pwSuccess}
                  </div>
                )}
                {pwError && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                    <AlertCircle className="w-4 h-4" /> {pwError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Current password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={e => { setCurrentPassword(e.target.value); setPwError(""); }}
                        placeholder="Current password"
                        required
                        className="px-4 py-2.5 pr-10 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full"
                      />
                      <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showCurrent ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPwError(""); }}
                        placeholder="Min 8 characters"
                        required
                        className="px-4 py-2.5 pr-10 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full"
                      />
                      <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showNew ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setPwError(""); }}
                      placeholder="Re-enter password"
                      required
                      className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPw}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {changingPw ? "Changing…" : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
