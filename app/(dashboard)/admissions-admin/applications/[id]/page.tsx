"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils/session";
import { useClasses } from "@/app/hooks/useClasses";
import {
  ArrowLeft, FileText, CheckCircle, XCircle, Clock, Calendar, MessageSquare,
  Printer, Loader2, AlertCircle, FileDown, Plus, ChevronRight, User, Eye, UserCheck, GraduationCap
} from "lucide-react";
import { PrintService } from "@/app/lib/print-service";

interface AppDetail {
  _id: string;
  application_no: string;
  status: string;
  academic_year: string;
  class_id?: { _id: string; name: string; section?: string; stream?: string };
  student_name?: string;
  first_name: string;
  last_name: string;
  gender: string;
  dob: string;
  blood_group?: string;
  prev_school?: string;
  prev_class?: string;
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  guardian_relation?: string;
  guardian_occupation?: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  emergency_contact?: string;
  remarks?: string;
  photo?: { name: string; url: string };
  birth_certificate?: { name: string; url: string };
  transfer_certificate?: { name: string; url: string };
  aadhaar?: { name: string; url: string };
  report_card?: { name: string; url: string };
  other_documents?: { name: string; url: string };
  rejection_reason?: string;
  interview_date?: string;
  internal_notes: Array<{ note: string; author: string; date: string }>;
  status_history: Array<{ status: string; updated_by: string; date: string; remarks?: string }>;
  submission_date: string;
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Dialog triggers
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);

  // Approve dialog states
  const [assignClassId, setAssignClassId] = useState("");
  const [approving, setApproving] = useState(false);
  const [credentials, setCredentials] = useState<{ loginId: string; password_plain: string; admission_no: string } | null>(null);

  // Reject/Interview states
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { classes } = useClasses();

  const fetchApplication = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admissions/${id}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setApp(json.data);
        setAssignClassId(json.data.class_id?._id || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || submittingNote) return;

    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/admissions/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ note: noteText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Note added successfully", "success");
        setNoteText("");
        fetchApplication();
      }
    } catch {
      showToast("Failed to add note", "error");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUpdateStatus = async (status: string, payload: Record<string, any>, successMsg: string, callback?: () => void) => {
    try {
      const res = await fetch(`/api/admissions/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status, ...payload }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(successMsg, "success");
        fetchApplication();
        if (callback) callback();
      }
    } catch {
      showToast("Update failed", "error");
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/admissions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ class_id: assignClassId }),
      });
      const json = await res.json();
      if (json.success) {
        setCredentials({
          loginId: json.credentials?.loginId || "",
          password_plain: json.credentials?.password || "",
          admission_no: json.credentials?.admission_no || "",
        });
        showToast("Admission approved & Student created!", "success");
        fetchApplication();
      } else {
        showToast(json.message || "Approval failed", "error");
      }
    } catch {
      showToast("Approve error", "error");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setRejecting(true);
    await handleUpdateStatus(
      "Rejected",
      { rejection_reason: rejectionReason, remarks: `Rejected: ${rejectionReason}` },
      "Application has been rejected",
      () => {
        setIsRejectOpen(false);
        setRejectionReason("");
        setRejecting(false);
      }
    );
  };

  const handleScheduleInterview = async () => {
    if (!interviewDate) return;
    setScheduling(true);
    await handleUpdateStatus(
      "Interview Scheduled",
      { interview_date: interviewDate, remarks: `Interview scheduled on ${new Date(interviewDate).toLocaleDateString()}` },
      "Interview details updated",
      () => {
        setIsInterviewOpen(false);
        setInterviewDate("");
        setScheduling(false);
      }
    );
  };

  const handlePrint = () => {
    PrintService.print("printable-application", { pageSize: "A4" });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-48 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span>Loading application details...</span>
      </div>
    );
  }

  if (!app) {
    return <div className="p-12 text-center text-slate-500 font-bold">Application not found.</div>;
  }

  const labelSpan = "text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block";
  const valSpan = "text-[14px] font-bold text-slate-800 dark:text-slate-200 block mt-1";

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-[80] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold transition-all ${
          toast.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Approve Student Creator Dialog */}
      {isApproveOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/60 z-[60] backdrop-blur-sm" onClick={() => { if (!credentials) setIsApproveOpen(false); }} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-[460px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[70] p-8 text-left animate-in fade-in zoom-in-95 duration-200">
            {!credentials ? (
              <div className="space-y-5">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-905 dark:text-slate-100">Approve Student Enrollment</h2>
                  <p className="text-[12px] text-slate-500 mt-1">Select class mappings below to finalize the student record creation.</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Assign Class</label>
                    <select
                      value={assignClassId}
                      onChange={e => setAssignClassId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-border rounded-lg px-3 py-2.5 text-[13.5px]"
                    >
                      {classes.map(c => (
                        <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button onClick={() => setIsApproveOpen(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
                  <button onClick={handleApprove} disabled={approving} className="px-6 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-2">
                    {approving && <Loader2 className="w-4 h-4 animate-spin" />} Approve Enrollment
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enrollment Completed!</h2>
                  <p className="text-[12px] text-slate-500 mt-1">Student and Guardian login credentials have been provisioned.</p>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3.5 text-left border border-border">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Admission Number</span>
                    <div className="text-[15px] font-bold text-primary">{credentials.admission_no}</div>
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Student Username / Email</span>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{credentials.loginId}</div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Student Initial Password</span>
                    <div className="text-[13px] font-mono font-bold text-slate-850 dark:text-slate-200">{credentials.password_plain}</div>
                  </div>
                </div>

                <button
                  onClick={() => { setIsApproveOpen(false); setCredentials(null); }}
                  className="w-full py-3 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer uppercase tracking-wider"
                >
                  Done & Close
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Reject Dialog */}
      {isRejectOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/60 z-[60] backdrop-blur-sm" onClick={() => setIsRejectOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[70] p-8 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-905 dark:text-slate-100">Reject Application</h2>
              <p className="text-[12px] text-slate-500">Please provide the rejection reason for the history timeline.</p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-border rounded-xl p-3.5 text-[13.5px] outline-none resize-none"
              />
              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button onClick={() => setIsRejectOpen(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
                <button onClick={handleReject} disabled={rejecting || !rejectionReason.trim()} className="px-5 py-2.5 bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-2">
                  {rejecting && <Loader2 className="w-4 h-4 animate-spin" />} Reject Application
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Interview Dialog */}
      {isInterviewOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/60 z-[60] backdrop-blur-sm" onClick={() => setIsInterviewOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[70] p-8 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-905 dark:text-slate-100">Schedule Interview</h2>
              <p className="text-[12px] text-slate-500">Select the date and time for the student interview/interaction.</p>
              <input
                type="datetime-local"
                value={interviewDate}
                onChange={e => setInterviewDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-border rounded-xl p-3.5 text-[13.5px] outline-none"
              />
              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button onClick={() => setIsInterviewOpen(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
                <button onClick={handleScheduleInterview} disabled={scheduling || !interviewDate} className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-2">
                  {scheduling && <Loader2 className="w-4 h-4 animate-spin" />} Schedule
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admissions-admin/applications")}
            className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Application detail <span className="text-primary font-mono text-[16px]">({app.application_no})</span>
            </h1>
            <p className="text-[12px] text-slate-500 mt-1">Submitted on {new Date(app.submission_date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button onClick={handlePrint} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>

          {app.status !== "Admission Completed" && (
            <>
              <button
                onClick={() => handleUpdateStatus("Under Review", { remarks: "Application transitioned to Under Review status." }, "Status updated to Under Review")}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Under Review
              </button>
              <button
                onClick={() => handleUpdateStatus("Documents Pending", { remarks: "Requesting additional documents from parent." }, "Status updated to Documents Pending")}
                className="px-4 py-2 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                Request Docs
              </button>
              <button
                onClick={() => setIsInterviewOpen(true)}
                className="px-4 py-2 bg-indigo-500/10 text-indigo-505 text-xs font-semibold rounded-lg hover:bg-indigo-500/20 transition-colors cursor-pointer"
              >
                Schedule Interview
              </button>
              <button
                onClick={() => setIsRejectOpen(true)}
                className="px-4 py-2 bg-rose-500/10 text-rose-500 text-xs font-semibold rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                Reject Application
              </button>
              <button
                onClick={() => setIsApproveOpen(true)}
                className="px-5 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
              >
                Approve Admission
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid Detail */}
      <div id="printable-application" className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Student detail */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> Student Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {app.photo?.url && (
                <div className="sm:col-span-3 pb-4">
                  <span className={labelSpan}>Student Photo</span>
                  <img src={app.photo.url} alt="StudentPhoto" className="w-24 h-24 rounded-xl object-cover mt-2 border border-slate-700/50" />
                </div>
              )}
              <div>
                <span className={labelSpan}>Student Name</span>
                <span className={valSpan}>{app.student_name || `${app.first_name} ${app.last_name}`.trim()}</span>
              </div>
              <div>
                <span className={labelSpan}>Class Applying</span>
                <span className={valSpan}>{app.class_id ? `${app.class_id.name}${app.class_id.section ? ` - ${app.class_id.section}` : ""}` : "Unassigned"}</span>
              </div>
              <div>
                <span className={labelSpan}>Gender</span>
                <span className={valSpan}>{app.gender}</span>
              </div>
              <div>
                <span className={labelSpan}>Date of Birth</span>
                <span className={valSpan}>{new Date(app.dob).toLocaleDateString()}</span>
              </div>
              <div>
                <span className={labelSpan}>Blood Group</span>
                <span className={valSpan}>{app.blood_group || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Previous School</span>
                <span className={valSpan}>{app.prev_school || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Previous Class</span>
                <span className={valSpan}>{app.prev_class || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Academic Session</span>
                <span className={valSpan}>{app.academic_year}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Parent detail */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Parents & Guardian Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className={labelSpan}>Father Name</span>
                <span className={valSpan}>{app.father_name || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Mother Name</span>
                <span className={valSpan}>{app.mother_name || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Guardian Name</span>
                <span className={valSpan}>{app.guardian_name || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Relation</span>
                <span className={valSpan}>{app.guardian_relation || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Occupation</span>
                <span className={valSpan}>{app.guardian_occupation || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Guardian Phone</span>
                <span className={valSpan}>{app.phone}</span>
              </div>
              <div>
                <span className={labelSpan}>Alternate Contact</span>
                <span className={valSpan}>{app.alt_phone || "—"}</span>
              </div>
              <div>
                <span className={labelSpan}>Email Address</span>
                <span className={valSpan}>{app.email || "—"}</span>
              </div>
              <div className="sm:col-span-3">
                <span className={labelSpan}>Full Residential Address</span>
                <span className={valSpan}>
                  {app.address}{app.city ? `, ${app.city}` : ""}{app.state ? `, ${app.state}` : ""}{app.country ? `, ${app.country}` : ""}{app.pin_code ? ` - ${app.pin_code}` : ""}
                </span>
              </div>
              <div>
                <span className={labelSpan}>Emergency Contact</span>
                <span className={valSpan}>{app.emergency_contact || "—"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className={labelSpan}>Application Remarks</span>
                <span className={valSpan}>{app.remarks || "—"}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Uploaded Documents */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Submitted Documents
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Birth Certificate", file: app.birth_certificate },
                { label: "Transfer Certificate", file: app.transfer_certificate },
                { label: "Previous Rpt Card", file: app.report_card },
                { label: "Aadhaar Card Proof", file: app.aadhaar },
                { label: "Other Documents", file: app.other_documents },
              ].map((d, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-850 border border-border rounded-xl">
                  <div>
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{d.label}</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">{d.file ? "Attached" : "Not Provided"}</span>
                  </div>
                  {d.file?.url && (
                    <a
                      href={d.file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-xs font-bold text-primary hover:underline hover:bg-primary/5 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Notes & Timeline */}
        <div className="space-y-6">
          {/* Timeline status history */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Status History Timeline
            </h2>

            <div className="space-y-4">
              {app.status_history.map((h, i) => (
                <div key={i} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 pb-2">
                  <div className="absolute -left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>{new Date(h.date).toLocaleDateString()}</span>
                    <span>{h.updated_by}</span>
                  </div>
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 block mt-1">{h.status}</span>
                  {h.remarks && <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">{h.remarks}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes ledger */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Internal Notes
            </h2>

            <div className="space-y-4 max-h-60 overflow-y-auto">
              {app.internal_notes.length === 0 ? (
                <p className="text-[12px] text-slate-400 text-center py-4">No internal review notes added.</p>
              ) : (
                app.internal_notes.map((n, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-border">
                    <p className="text-[12.5px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{n.note}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-bold">
                      <span>{n.author}</span>
                      <span>{new Date(n.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddNote} className="space-y-3 pt-3 border-t border-border">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Type note to append..."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-border rounded-xl p-3 text-[13px] outline-none resize-none"
              />
              <button
                type="submit"
                disabled={submittingNote || !noteText.trim()}
                className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-[var(--primary-hover)] transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Note
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
