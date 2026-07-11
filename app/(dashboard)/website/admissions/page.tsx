"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, BookOpen, Plus,
  CheckCircle2, AlertCircle, X, ToggleLeft, ToggleRight
} from "lucide-react";
import { FileUploadField } from "../../../components/ui/FileUploadField";

interface AdmissionsData {
  how_to_apply: string;
  admission_open: boolean;
  apply_url: string;
  hero_image_url: string;
  documents_required: string[];
}

const defaultData: AdmissionsData = {
  how_to_apply: "",
  admission_open: false,
  apply_url: "",
  hero_image_url: "",
  documents_required: [],
};

function TextareaField({ label, value, onChange, placeholder = "", rows = 4 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all resize-none" />
    </div>
  );
}

function InputField({ label, value, onChange, placeholder = "", type = "text" }: { label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all" />
    </div>
  );
}

export default function AdmissionsPage() {
  const [data, setData] = useState<AdmissionsData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [newDoc, setNewDoc] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data?.admissions) setData({ ...defaultData, ...res.data.admissions }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setStatus("idle");
    try {
      const token = localStorage.getItem("sm_access_token");
      const res = await fetch("/api/landing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ section: "admissions", data }),
      });
      const json = await res.json();
      setStatus(json.success ? "success" : "error");
    } catch { setStatus("error"); }
    finally { setSaving(false); setTimeout(() => setStatus("idle"), 3000); }
  };

  const addDoc = () => {
    if (newDoc.trim()) {
      setData((p) => ({ ...p, documents_required: [...p.documents_required, newDoc.trim()] }));
      setNewDoc("");
    }
  };

  const removeDoc = (i: number) => setData((p) => ({ ...p, documents_required: p.documents_required.filter((_, idx) => idx !== i) }));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/website" className="p-2 rounded-lg hover:bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admissions</h1>
            <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px]">How to apply, fee structure & required documents</p>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {status === "success" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium"><CheckCircle2 className="w-4 h-4" /> Saved!</div>}
      {status === "error" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium"><AlertCircle className="w-4 h-4" /> Failed to save.</div>}

      {/* Admission Status Toggle */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Admission Status</h2>
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-white font-semibold text-[14px]">Admissions Open</p>
            <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px] mt-0.5">
              {data.admission_open ? "Admissions are currently open on your website." : "Admissions are currently closed on your website."}
            </p>
          </div>
          <button onClick={() => setData((p) => ({ ...p, admission_open: !p.admission_open }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${data.admission_open ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-750"}`}>
            {data.admission_open ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {data.admission_open ? "Open" : "Closed"}
          </button>
        </div>
        <FileUploadField
          label="Hero Banner Image"
          value={data.hero_image_url || ""}
          onChange={(v) => setData((p) => ({ ...p, hero_image_url: v }))}
          accept="image/*"
          placeholder="Upload or paste image URL for Admissions page hero banner..."
        />
        <FileUploadField
          label="Online Application Form / Document"
          value={data.apply_url}
          onChange={(v) => setData((p) => ({ ...p, apply_url: v }))}
          accept="application/pdf,image/*"
          placeholder="https://yourschool.com/apply (link to form or upload PDF/image)"
        />
      </div>

      {/* How to Apply */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">How to Apply</h2>
        <TextareaField label="Application Process" value={data.how_to_apply} onChange={(v) => setData((p) => ({ ...p, how_to_apply: v }))}
          placeholder="Step 1: Download the application form from our website or collect it from the school office..." rows={6} />
      </div>

      {/* Documents Required */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Documents Required</h2>
        <div className="flex gap-2">
          <input type="text" value={newDoc} onChange={(e) => setNewDoc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDoc()}
            placeholder="e.g. Birth Certificate" className="flex-1 bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          <button onClick={addDoc} className="px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[13px] font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {data.documents_required.length === 0 ? (
          <p className="card-subtitle text-slate-600 dark: text-[13px] text-center py-4 dark:text-slate-600 dark:">No documents added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.documents_required.map((doc, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 text-[12px] font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {doc}
                <button onClick={() => removeDoc(i)} className="ml-1 text-slate-600 dark:text-slate-500 hover:text-rose-400 transition-colors dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Admissions"}
        </button>
      </div>
    </div>
  );
}
