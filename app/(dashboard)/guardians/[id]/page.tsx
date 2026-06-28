"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils/session";
import { useUpload } from "../../../hooks/useUpload";
import { Modal } from "../../../components/ui/modal";
import { LoginDetailsModal } from "@/app/components/modals/LoginDetailsModal";
import { ResetPasswordModal } from "@/app/components/modals/ResetPasswordModal";
import {
  User, Phone, Mail, FileText, Calendar, Users, MapPin, Bus, Lock, Edit, ChevronDown, CheckCircle, RefreshCw, X, Loader2, ImageIcon
} from "lucide-react";

interface ApiStudent {
  _id: string;
  name: string;
  roll_no?: string;
  gender?: string;
  admission_date?: string;
  admission_no?: string;
  is_active: boolean;
  class_id?: {
    _id: string;
    name: string;
    section: string;
  };
}

interface ApiParent {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  relation?: string;
  photo_url?: string;
  occupation?: string;
  address?: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  user_id?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
  };
  children?: ApiStudent[];
}

function getAvatar(name: string, photo_url?: string) {
  if (photo_url) return photo_url;
  return name.toLowerCase().match(/^[a-m]/) ? "/asset 12.webp" : "/asset 14.webp";
}

function formatDate(d?: string | Date) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ParentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const parentId = params.id as string;
  const { uploadFile } = useUpload();

  const [parent, setParent] = useState<ApiParent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [resetPassTarget, setResetPassTarget] = useState<{ userId: string | undefined; name: string; email: string } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states for edit
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhoto, setFormPhoto] = useState("");
  const [formOccupation, setFormOccupation] = useState("");
  const [formRelation, setFormRelation] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchParentDetails = async () => {
    try {
      const res = await fetch(`/api/parents/${parentId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setParent(data.data);
        // Initialize form
        setFormName(data.data.name || "");
        setFormPhone(data.data.phone || "");
        setFormEmail(data.data.email || "");
        setFormPhoto(data.data.photo_url || "");
        setFormOccupation(data.data.occupation || "");
        setFormRelation(data.data.relation || "");
        setFormAddress(data.data.address || "");
        setFormIsActive(data.data.is_active !== false);
      }
    } catch (err) {
      console.error("Failed to fetch parent details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (parentId) {
      fetchParentDetails();
    }
  }, [parentId]);

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file);
      if (url) setFormPhoto(url);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/parents/${parentId}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          email: formEmail,
          photo_url: formPhoto,
          occupation: formOccupation,
          relation: formRelation,
          address: formAddress,
          is_active: formIsActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditOpen(false);
        fetchParentDetails();
      } else {
        alert(data.message || "Failed to update parent");
      }
    } catch (err) {
      console.error("Failed to update parent", err);
      alert("Failed to update parent");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-[14px] font-medium">Loading parent details...</span>
        </div>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="p-10 text-slate-500 text-center bg-white dark:bg-slate-900 border border-border rounded-xl">
        Parent not found.
      </div>
    );
  }

  const getClassName = (child: ApiStudent) => {
    if (child.class_id) {
      const name = child.class_id.name || "";
      const section = child.class_id.section || "";
      return name ? `${name} ${section}`.trim() : "—";
    }
    return "—";
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[20px] leading-[24px] font-semibold text-foreground dark:text-slate-100">Parent Details</h1>
          <div className="flex items-center gap-2 text-[14px] leading-[21px] text-[#68718a] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/guardians" className="hover:text-primary">Parents</Link>
            <span>/</span>
            <span className="text-foreground dark:text-slate-100 font-normal">Parent Details</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer">
            <Lock className="w-3.5 h-3.5" />
            <span>Login Details</span>
          </button>
          <button 
            onClick={() => {
              const pUser = parent?.user_id;
              const pUid = pUser && typeof pUser === "object" ? pUser._id : undefined;
              const pEmail = pUser && typeof pUser === "object" ? pUser.email : parent.email || "";
              setResetPassTarget({ userId: pUid, name: parent.name, email: pEmail });
              setIsResetPassModalOpen(true);
            }} 
            className="flex items-center gap-2 px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Parent</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* LEFT PROFILE CARD (300px) */}
        <div className="w-full xl:w-[300px] flex-shrink-0 space-y-6">
          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow text-left relative overflow-hidden">
            <div className="flex flex-col items-center text-center p-2">
              <img src={getAvatar(parent.name, parent.photo_url)} className="w-full sm:w-[80px] h-[80px] rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm mb-4" alt="Avatar" />
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-bold mb-3
                ${parent.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${parent.is_active ? "bg-success" : "bg-danger"}`} />
                {parent.is_active ? "Active" : "Inactive"}
              </div>
              <h2 className="text-[18px] font-semibold text-foreground dark:text-slate-100">{parent.name}</h2>
              <p className="text-[12px] text-primary font-bold mt-1">ID: {parent._id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow text-left">
            <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Basic Information</h3>
            </div>
            <div className="p-4 text-[12px]">
              <div className="space-y-4">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold block mb-1">Relationship</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-[13px]">{parent.relation || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold block mb-1">Occupation</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-[13px]">{parent.occupation || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold block mb-1">Joined Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-[13px]">{formatDate(parent.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden card-shadow text-left">
            <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Contact Information</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Phone Number</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 font-semibold">{parent.phone || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Email Address</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-full sm:w-[170px]">{parent.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-0.5">Address</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{parent.address || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT MAIN CONTENT: Children Details */}
        <div className="flex-1 min-w-0 w-full">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left">
            <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
                Children Details
                <span className="ml-2 text-[12px] font-semibold text-slate-400">({parent.children?.length || 0})</span>
              </h3>
            </div>
            <div className="p-6">
              {(!parent.children || parent.children.length === 0) ? (
                <div className="text-center py-12 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-[14px]">No linked children found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {parent.children.map((child) => (
                    <div key={child._id} className="border border-border rounded-xl p-5 hover:border-primary/40 transition-colors flex flex-col justify-between bg-white dark:bg-slate-800 shadow-sm text-left">
                      {/* Top Row */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-primary text-[13px]">
                          {child.admission_no || `AD${child._id.slice(-7).toUpperCase()}`}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold
                          ${child.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${child.is_active ? "bg-success" : "bg-danger"}`} />
                          {child.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Middle profile */}
                      <div className="flex items-center gap-4 mb-5">
                        <img src={getAvatar(child.name)} className="w-full sm:w-[50px] h-[50px] rounded-xl object-cover border border-border" alt="Child" />
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-[15px]">
                            {child.name}
                          </h4>
                          <p className="text-[12px] text-slate-400 dark:text-slate-500 font-semibold">{getClassName(child)}</p>
                        </div>
                      </div>

                      {/* Stats Table */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-3 border-t border-b border-slate-100 dark:border-slate-700/50 mb-5 text-[12px]">
                        <div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">Roll No</p>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{child.roll_no || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">Gender</p>
                          <p className="font-bold text-slate-800 dark:text-slate-100 capitalize">{child.gender || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-0.5">Date Joined</p>
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{formatDate(child.admission_date)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-auto">
                        <button className="flex-1 py-2 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-colors cursor-pointer border border-border">
                          Add Fees
                        </button>
                        <button
                          onClick={() => router.push(`/students/${child._id}`)}
                          className="flex-1 py-2 rounded bg-primary hover:bg-[var(--primary-hover)] text-white text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Login Details Modal ── */}
      <LoginDetailsModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        parent={parent}
        target="parent"
      />

      <ResetPasswordModal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        userId={resetPassTarget?.userId}
        userName={resetPassTarget?.name || ""}
        userEmail={resetPassTarget?.email || ""}
        onSuccess={() => fetchParentDetails()}
      />

      {/* ── Edit Parent Modal ── */}
      {isEditOpen && (
        <Modal isOpen={true} onClose={() => setIsEditOpen(false)} title="Edit Parent" size="md">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePhotoUpload(e.target.files[0]);
                }
              }}
            />

            {/* Photo upload */}
            <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-left">
              {uploadingPhoto ? (
                <div className="w-16 h-16 rounded-lg border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center bg-white dark:bg-slate-900">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : formPhoto ? (
                <img src={formPhoto} className="w-16 h-16 rounded-lg object-cover border border-border shadow-sm" alt="Parent Photo" />
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-900">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={uploadingPhoto} onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 border border-border rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50 cursor-pointer">
                    Upload
                  </button>
                  {formPhoto && (
                    <button type="button" onClick={() => setFormPhoto("")} disabled={uploadingPhoto} className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#E2E8F0] disabled:opacity-50 transition-colors cursor-pointer">
                      Remove
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">Max 5MB, JPG/PNG</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Full Name</label>
                <input required type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Robert Watson"
                  className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Relationship</label>
                  <input type="text" value={formRelation} onChange={e => setFormRelation(e.target.value)} placeholder="e.g. Father"
                    className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Occupation</label>
                  <input type="text" value={formOccupation} onChange={e => setFormOccupation(e.target.value)} placeholder="e.g. Engineer"
                    className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Phone Number</label>
                  <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="e.g. +1 (555) 123-4567"
                    className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Email Address</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="e.g. parent@email.com"
                    className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Address</label>
                <textarea rows={2} value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="e.g. 123 School Lane, NY"
                  className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm resize-none" />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input id="formIsActive" type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-primary" />
                <label htmlFor="formIsActive" className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Active Profile Status</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
              <button type="button" onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 border border-border text-[13px] font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-colors shadow-sm cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={isSaving || uploadingPhoto}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-70">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
