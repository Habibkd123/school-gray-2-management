"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  RefreshCw, Upload, Edit, EyeOff, Eye, Save, X,
  Loader2, CheckCircle2, AlertCircle, User, Lock, MapPin
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
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=5D6BEE&color=fff&bold=true&size=200`;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const isParent = user?.role === "parent";

  // Profile state
  const [profile, setProfile] = useState<ParentProfile | null>(null);
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
      const res = await fetch("/api/parent/profile", {
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

  const displayName = name || user?.name || "User";
  const displayPhoto = photoUrl || getAvatar(displayName);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Profile</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Settings</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Profile</span>
          </div>
        </div>
        <button
          onClick={loadProfile}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

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
                <p className="text-[12px] text-slate-500 capitalize mt-0.5">{user?.role?.replace("_", " ")}</p>
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
                  className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-[13px] font-bold rounded-lg hover:bg-emerald-600 disabled:opacity-60 transition-colors shadow-sm"
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
                    className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
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
                    className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
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
                    className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
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
                      className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
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
                  className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full resize-none disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-default"
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
                      className="px-4 py-2.5 pr-10 bg-[#F8FAFC] dark:bg-[#0F172A] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full"
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
                      className="px-4 py-2.5 pr-10 bg-[#F8FAFC] dark:bg-[#0F172A] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full"
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
                    className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changingPw}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {changingPw ? "Changing…" : "Change Password"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
