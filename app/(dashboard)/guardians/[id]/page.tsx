"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils/session";
import { useUpload } from "../../../hooks/useUpload";
import { Modal } from "../../../components/ui/modal";
import { LoginDetailsModal } from "@/app/components/modals/LoginDetailsModal";
import { ResetPasswordModal } from "@/app/components/modals/ResetPasswordModal";
import { useAuth } from "../../../context/auth";
import { useAttendanceSummary } from "@/app/hooks/useAttendanceSummary";
import { PrintService } from "@/app/lib/print-service";
import {
  User, Phone, Mail, FileText, Calendar, Users, MapPin, Lock, Edit,
  ChevronDown, CheckCircle, RefreshCw, X, Loader2, ImageIcon,
  DollarSign, Receipt, Clock, Bell, Send, ArrowRight, ShieldAlert, AlertTriangle
} from "lucide-react";

interface ApiStudent {
  _id: string;
  name: string;
  roll_no?: string;
  gender?: string;
  admission_date?: string;
  admission_no?: string;
  is_active: boolean;
  academic_year?: string;
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
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=E11D48&color=fff&bold=true`;
}

function formatDate(d?: string | Date) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ParentDetailPage() {
  const { user } = useAuth();
  const activeRole = user?.role;
  const params = useParams();
  const router = useRouter();
  const parentId = params.id as string;
  const { uploadFile } = useUpload();
  const { fetchSummary } = useAttendanceSummary();

  const [parent, setParent] = useState<ApiParent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs State
  const [activeTab, setActiveTab] = useState<"students" | "fees" | "communication">("students");

  // Live Attendance Summary State (Part 9)
  const [attendanceSummaries, setAttendanceSummaries] = useState<Record<string, any>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Live Fees Summary State (Part 7, 8)
  const [feesSummaries, setFeesSummaries] = useState<Record<string, any>>({});
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Modals
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
  const [phoneError, setPhoneError] = useState("");

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
      } else {
        setError(data.message || "Access denied to parent record");
      }
    } catch (err: any) {
      console.error("Failed to fetch parent details:", err);
      setError(err.message || "Failed to load parent information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (parentId) {
      fetchParentDetails();
    }
  }, [parentId]);

  // Load attendance and fees dynamically for linked students
  useEffect(() => {
    if (!parent?.children || parent.children.length === 0) return;

    const loadStudentData = async () => {
      setAttendanceLoading(true);
      setFeesLoading(true);
      try {
        // 1. Fetch Attendance (academic year range: 2026-06-01 to 2027-05-31)
        const summary = await fetchSummary("2026-06-01", "2027-05-31", "student");
        if (summary) {
          setAttendanceSummaries(summary);
        }

        // 2. Fetch Fees and Payments
        const feesObj: Record<string, any> = {};
        const allPayments: any[] = [];

        await Promise.all(
          (parent.children || []).map(async (child) => {
            // Fetch fee ledger summary
            const feeRes = await fetch(`/api/fees?student_id=${child._id}`, { headers: getAuthHeaders() });
            const feeData = await feeRes.json();
            if (feeData.success && feeData.data?.students?.[0]) {
              feesObj[child._id] = feeData.data.students[0];
            }

            // Fetch payment receipts history
            const payRes = await fetch(`/api/fees/payments?student_id=${child._id}`, { headers: getAuthHeaders() });
            const payData = await payRes.json();
            if (payData.success && payData.data?.payments) {
              allPayments.push(...payData.data.payments);
            }
          })
        );

        setFeesSummaries(feesObj);
        // Sort payments by date descending
        allPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
        setPaymentsList(allPayments);
      } catch (err) {
        console.error("Failed to load student attendance and fees", err);
      } finally {
        setAttendanceLoading(false);
        setFeesLoading(false);
      }
    };

    loadStudentData();
  }, [parent, fetchSummary]);

  const handlePhoneChange = (value: string) => {
    setFormPhone(value);
    if (value && !/^\d{10}$/.test(value)) {
      setPhoneError("Phone number must be exactly 10 digits");
    } else {
      setPhoneError("");
    }
  };

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
    if (phoneError) return;
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

  const getAttendancePct = (childId: string) => {
    const summary = attendanceSummaries[childId];
    if (!summary) return "—";
    const total = (summary.present || 0) + (summary.absent || 0) + (summary.late || 0) + (summary.half_day || 0);
    if (total === 0) return "100%";
    const attended = (summary.present || 0) + (summary.late || 0) + (summary.half_day || 0) * 0.5;
    return `${Math.round((attended / total) * 100)}%`;
  };

  // Aggregated Fees Computations
  const totalFeesAssigned = Object.values(feesSummaries).reduce((sum, f) => sum + (f.totalFees || 0), 0);
  const totalFeesPaid = Object.values(feesSummaries).reduce((sum, f) => sum + (f.totalPaid || 0), 0);
  const totalFeesPending = Object.values(feesSummaries).reduce((sum, f) => sum + (f.balanceAmount || 0), 0);

  // Calculate Overdue amounts (balance sum for kids with "Overdue" status)
  const totalFeesOverdue = Object.values(feesSummaries)
    .filter(f => f.dueStatus === "Overdue")
    .reduce((sum, f) => sum + (f.balanceAmount || 0), 0);

  const getClassName = (child: ApiStudent) => {
    if (child.class_id) {
      const name = child.class_id.name || "";
      const section = child.class_id.section || "";
      return name ? `${name} ${section}`.trim() : "—";
    }
    return "—";
  };

  const printReceipt = () => {
    if (!selectedReceipt) return;
    PrintService.print("printable-receipt-modal");
  };

  // Error boundary access block (Part 13)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[450px] p-6 text-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md shadow-xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            {error}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-[14px] font-medium">Loading parent details...</span>
        </div>
      </div>
    );
  }

  if (!parent) return null;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Parent Details</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            {activeRole !== "parent" ? (
              <Link href="/guardians" className="hover:text-primary">Parents</Link>
            ) : (
              <span>Profile</span>
            )}
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Details</span>
          </div>
        </div>

        {/* Action Controls - Restricted from Parents themselves */}
        {activeRole !== "parent" && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-205 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer"
            >
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
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-550 hover:bg-rose-600 text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer font-sans"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Reset Password</span>
            </button>
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* LEFT COLUMN: Bio Card */}
        <div className="w-full xl:w-[320px] flex-shrink-0 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-left">
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <img
                src={getAvatar(parent.name, parent.photo_url)}
                className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm mb-4"
                alt="Avatar"
              />
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold mb-3
                ${parent.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${parent.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                {parent.is_active ? "Active" : "Inactive"}
              </span>
              <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{parent.name}</h2>
              <p className="text-[12px] text-primary font-bold mt-1">GUARDIAN ID: {parent._id.slice(-6).toUpperCase()}</p>
            </div>

            <div className="py-4 space-y-4 text-[12px]">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Relationship</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[13px] capitalize">{parent.relation || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Occupation</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[13px]">{parent.occupation || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Date Joined</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[13px]">{formatDate(parent.createdAt)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 text-[12px]">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Contact details</h4>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 block">Mobile</p>
                  <p className="text-[13px] text-slate-800 dark:text-slate-200 font-semibold">{parent.phone || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 block">Email</p>
                  <p className="text-[13px] text-slate-800 dark:text-slate-200 font-semibold truncate">{parent.email || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 block">Address</p>
                  <p className="text-[12px] text-slate-800 dark:text-slate-350 font-semibold leading-relaxed">{parent.address || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tabs Area */}
        <div className="flex-1 w-full min-w-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden text-left">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/30 px-4">
              <button
                onClick={() => setActiveTab("students")}
                className={`px-4 py-3.5 text-[13px] font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer
                  ${activeTab === "students" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                <Users className="w-4 h-4" />
                <span>Linked Students</span>
              </button>
              <button
                onClick={() => setActiveTab("fees")}
                className={`px-4 py-3.5 text-[13px] font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer
                  ${activeTab === "fees" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Fees & Payments</span>
              </button>
              <button
                onClick={() => setActiveTab("communication")}
                className={`px-4 py-3.5 text-[13px] font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer
                  ${activeTab === "communication" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                <Send className="w-4 h-4" />
                <span>Communication</span>
              </button>
            </div>

            {/* TAB CONTENT: Linked Students */}
            {activeTab === "students" && (
              <div className="p-6">
                {(!parent.children || parent.children.length === 0) ? (
                  <div className="text-center py-12 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-rose-500" />
                    <p className="text-[14px]">No linked children found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {parent.children.map((child) => {
                      const childAttendance = attendanceSummaries[child._id];
                      return (
                        <div key={child._id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-primary/45 transition-colors flex flex-col justify-between bg-white dark:bg-slate-850 shadow-xs text-left">
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-bold text-primary font-sans text-[13px]">
                              {child.admission_no || `AD${child._id.slice(-6).toUpperCase()}`}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold
                              ${child.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${child.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                              {child.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mb-4">
                            <img
                              src={getAvatar(child.name)}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                              alt="Child"
                            />
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-[14px]">
                                {child.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-semibold">{getClassName(child)}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Year: {child.academic_year || "—"}</p>
                            </div>
                          </div>

                          {/* Dynamic Attendance Summary (Part 9) */}
                          <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50 space-y-2 mb-4 text-[12px]">
                            <div className="flex items-center justify-between font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                              <span>Attendance metrics</span>
                              <span className="text-primary">{getAttendancePct(child._id)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-[12px] font-bold">
                              <div className="bg-emerald-500/10 text-emerald-550 rounded py-1 px-1.5">
                                <div className="text-[10px] font-normal text-slate-400">Present</div>
                                <div>{childAttendance?.present || 0}d</div>
                              </div>
                              <div className="bg-rose-500/10 text-rose-550 rounded py-1 px-1.5">
                                <div className="text-[10px] font-normal text-slate-400">Absent</div>
                                <div>{childAttendance?.absent || 0}d</div>
                              </div>
                              <div className="bg-yellow-500/10 text-yellow-550 rounded py-1 px-1.5">
                                <div className="text-[10px] font-normal text-slate-400">Late</div>
                                <div>{childAttendance?.late || 0}d</div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-auto">
                            <button
                              onClick={() => {
                                setActiveTab("fees");
                              }}
                              className="flex-grow py-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px] font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                              <span>View Fees</span>
                            </button>
                            <button
                              onClick={() => router.push(`/students/${child._id}`)}
                              className="flex-grow py-2 rounded-lg bg-primary hover:bg-[var(--primary-hover)] text-white text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>View Profile</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Fees & Payments (Part 7, 8) */}
            {activeTab === "fees" && (
              <div className="p-6 space-y-6">
                {feesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                    <span className="card-subtitle text-[13px]">Loading dynamic fee ledgers...</span>
                  </div>
                ) : (
                  <>
                    {/* Key Metric Blocks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-850 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-slate-450">Total Fees</p>
                          <h4 className="text-[17px] font-bold text-slate-900 dark:text-white">₹{totalFeesAssigned.toLocaleString("en-IN")}</h4>
                        </div>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-850 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-slate-450">Paid Amount</p>
                          <h4 className="text-[17px] font-bold text-slate-900 dark:text-white">₹{totalFeesPaid.toLocaleString("en-IN")}</h4>
                        </div>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-850 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-slate-450">Pending Amount</p>
                          <h4 className="text-[17px] font-bold text-slate-900 dark:text-white">₹{totalFeesPending.toLocaleString("en-IN")}</h4>
                        </div>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-850 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-slate-450">Overdue Amount</p>
                          <h4 className="text-[17px] font-bold text-slate-900 dark:text-white">₹{totalFeesOverdue.toLocaleString("en-IN")}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Outstanding Installments */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Outstanding Installments</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        {Object.values(feesSummaries).every(f => f.balanceAmount === 0) ? (
                          <div className="text-[12px] font-semibold text-emerald-555 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> No outstanding installments for linked children.
                          </div>
                        ) : (
                          Object.values(feesSummaries)
                            .filter(f => f.balanceAmount > 0)
                            .map((f: any) => (
                              <div key={f._id} className="flex justify-between items-center text-[13px] font-semibold">
                                <span className="text-slate-800 dark:text-slate-200">{f.name} ({f.class_name})</span>
                                <span className="text-rose-500 font-sans">₹{f.balanceAmount.toLocaleString("en-IN")}</span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    {/* Payment History & Transactions */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Payment Receipts History</h4>
                        <span className="text-[11px] font-semibold text-slate-400">Total Payments: {paymentsList.length}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="erp-table text-[12px] whitespace-nowrap">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-350">Receipt Number</th>
                              <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-350">Payment Date</th>
                              <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-350">Student</th>
                              <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-350">Method</th>
                              <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-350 font-sans text-right">Amount</th>
                              <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-350">Collected By</th>
                              <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-350 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {paymentsList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-semibold">
                                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-500" />
                                  <span>No transaction payments found.</span>
                                </td>
                              </tr>
                            ) : (
                              paymentsList.map((payment) => (
                                <tr key={payment._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="px-4 py-3 text-primary font-sans font-bold">{payment.receipt_number}</td>
                                  <td className="px-4 py-3 text-slate-650">{formatDate(payment.payment_date)}</td>
                                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{payment.student_id?.name || "—"}</td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{payment.payment_method}</td>
                                  <td className="px-4 py-3 text-emerald-500 text-right font-sans font-bold">₹{payment.amount_paid.toLocaleString("en-IN")}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{payment.collected_by?.name || "Self Portal"}</td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => setSelectedReceipt(payment)}
                                      className="px-2.5 py-1 text-[11px] font-bold bg-primary hover:bg-[var(--primary-hover)] text-white rounded transition-colors cursor-pointer"
                                    >
                                      View Receipt
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB CONTENT: Communication Structure (Part 10) */}
            {activeTab === "communication" && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SMS logs */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900/30 text-left">
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <span>SMS Dispatch History</span>
                    </h4>
                    <div className="text-center py-8 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/10 rounded-xl">
                      No SMS messages dispatched to {parent.phone || "the parent's mobile"}.
                    </div>
                  </div>

                  {/* Email logs */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900/30 text-left">
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-500" />
                      <span>Email Delivery Logs</span>
                    </h4>
                    <div className="text-center py-8 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/10 rounded-xl">
                      No email communication recorded.
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900/30 text-left">
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <span>App Notifications</span>
                    </h4>
                    <div className="text-center py-8 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/10 rounded-xl">
                      No alerts triggered.
                    </div>
                  </div>

                  {/* Meeting Request scheduling */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900/30 text-left">
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-rose-500" />
                      <span>Meeting Requests</span>
                    </h4>
                    <div className="text-center py-8 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/10 rounded-xl">
                      No parent-teacher consultations scheduled.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Receipt Preview Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReceipt(null)}
          title="Payment Receipt Details"
          size="md"
        >
          <div className="space-y-6 text-left">
            {/* Printable Area Wrapper (Part 8 Print/PDF) */}
            <div id="printable-receipt-modal" className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm space-y-4">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-[16px] text-slate-900">MySchoolLife ERP</h3>
                  <p className="text-[11px] text-slate-400">Payment Transaction Receipt</p>
                </div>
                <div className="text-right">
                  <h4 className="font-sans font-bold text-primary text-[14px]">{selectedReceipt.receipt_number}</h4>
                  <p className="text-[11px] text-slate-450">Date: {formatDate(selectedReceipt.payment_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[12px]">
                <div>
                  <span className="text-slate-400 block">Student Name</span>
                  <span className="font-bold text-slate-800 text-[13px]">{selectedReceipt.student_id?.name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Class / Section</span>
                  <span className="font-bold text-slate-800 text-[13px]">{selectedReceipt.student_id?.class_id?.name || "—"} {selectedReceipt.student_id?.class_id?.section || ""}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Method</span>
                  <span className="font-bold text-slate-800 text-[13px]">{selectedReceipt.payment_method}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Collected By</span>
                  <span className="font-bold text-slate-800 text-[13px]">{selectedReceipt.collected_by?.name || "Self Portal"}</span>
                </div>
              </div>

              {/* Fee Breakdown itemization */}
              <div className="border border-slate-150 rounded-lg overflow-hidden bg-slate-50/50 mt-4 text-[12px]">
                <div className="grid grid-cols-2 px-3 py-2 border-b border-slate-150 bg-slate-100 font-bold">
                  <span>Fee Category Description</span>
                  <span className="text-right">Paid Amount</span>
                </div>
                <div className="divide-y divide-slate-150 font-medium">
                  {selectedReceipt.fee_breakdown && selectedReceipt.fee_breakdown.length > 0 ? (
                    selectedReceipt.fee_breakdown.map((item: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-2 px-3 py-2 text-slate-700">
                        <span>{item.name}</span>
                        <span className="text-right font-sans">₹{item.amount_paid.toLocaleString("en-IN")}</span>
                      </div>
                    ))
                  ) : (
                    <div className="grid grid-cols-2 px-3 py-2 text-slate-700">
                      <span>General School Fees</span>
                      <span className="text-right font-sans">₹{selectedReceipt.amount_paid.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[14px] font-bold text-slate-900">
                <span>Total Amount Paid</span>
                <span className="font-sans text-emerald-600">₹{selectedReceipt.amount_paid.toLocaleString("en-IN")}</span>
              </div>

              {selectedReceipt.remarks && (
                <div className="text-[11px] text-slate-400 mt-2 bg-slate-50 rounded p-2 italic">
                  Remarks: {selectedReceipt.remarks}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 border border-slate-200 text-[13px] font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-sm"
              >
                Close View
              </button>
              <button
                onClick={printReceipt}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-bold rounded-lg text-white shadow-sm transition-colors cursor-pointer"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Print Receipt / PDF</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Parent Modal - Restricted from parent role self */}
      {isEditOpen && (
        <Modal isOpen={true} onClose={() => setIsEditOpen(false)} title="Edit Parent Profile" size="md">
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

            {/* Photo preview upload */}
            <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-left">
              {uploadingPhoto ? (
                <div className="w-16 h-16 rounded-xl border-2 border-slate-350 flex items-center justify-center bg-white dark:bg-slate-900">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : formPhoto ? (
                <img src={formPhoto} className="w-16 h-16 rounded-xl object-cover border border-slate-200" alt="Avatar Preview" />
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-white dark:bg-slate-900">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Change Photo
                  </button>
                  {formPhoto && (
                    <button
                      type="button"
                      onClick={() => setFormPhoto("")}
                      className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#E2E8F0] cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">JPG, PNG (Max 5MB)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500">Full Name *</label>
                <input
                  required
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Relationship *</label>
                  <select
                    required
                    value={formRelation}
                    onChange={e => setFormRelation(e.target.value)}
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Occupation</label>
                  <input
                    type="text"
                    value={formOccupation}
                    onChange={e => setFormOccupation(e.target.value)}
                    placeholder="e.g. Business Owner"
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Phone Number *</label>
                  <input
                    required
                    type="tel"
                    value={formPhone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className={`px-3.5 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none transition-all shadow-sm
                      ${phoneError ? "border-rose-500 focus:border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-primary/50"}`}
                  />
                  {phoneError && <span className="text-[11px] text-rose-500 mt-0.5">{phoneError}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g. parent@email.com"
                    className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500">Address</label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  placeholder="Street details..."
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-[13px] outline-none focus:border-primary/50 transition-all shadow-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input id="formIsActive" type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-350 accent-primary cursor-pointer" />
                <label htmlFor="formIsActive" className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Active Profile Status</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 border border-slate-205 dark:border-slate-800 text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-205 cursor-pointer shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || uploadingPhoto}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold rounded-lg text-white shadow-sm transition-colors cursor-pointer disabled:opacity-70"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal - Admin only */}
      <ResetPasswordModal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        userId={resetPassTarget?.userId}
        userName={resetPassTarget?.name || ""}
        userEmail={resetPassTarget?.email || ""}
        onSuccess={() => fetchParentDetails()}
      />

      {/* Login Details Modal */}
      <LoginDetailsModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        parent={parent}
        target="parent"
      />
    </div>
  );
}

// Inline Printer icon replacement helper
function PrinterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
