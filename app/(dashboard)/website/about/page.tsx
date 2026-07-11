"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Globe,
  CheckCircle2, AlertCircle, User
} from "lucide-react";
import { FileUploadField } from "../../../components/ui/FileUploadField";

interface ManagementMember {
  _id?: string;
  name: string;
  position: string;
  bio: string;
  photo_url: string;
}

interface AboutData {
  hero_tagline: string;
  hero_image_url: string;
  hero_side_image_url: string;
  history: string;
  history_image_url: string;
  vision: string;
  mission: string;
  founded_year: number;
  infrastructure: string;
  infrastructure_image_url: string;
  management_team: ManagementMember[];
}

const defaultAbout: AboutData = {
  hero_tagline: "",
  hero_image_url: "",
  hero_side_image_url: "",
  history: "",
  history_image_url: "",
  vision: "",
  mission: "",
  founded_year: 2000,
  infrastructure: "",
  infrastructure_image_url: "",
  management_team: [],
};

function InputField({
  label, value, onChange, placeholder = "", required = false, type = "text"
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
      />
    </div>
  );
}

function TextareaField({
  label, value, onChange, placeholder = "", rows = 4, required = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all resize-none"
      />
    </div>
  );
}

export default function AboutPage() {
  const [data, setData] = useState<AboutData>(defaultAbout);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.about) {
          setData({ ...defaultAbout, ...res.data.about });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const token = localStorage.getItem("sm_access_token");
      const res = await fetch("/api/landing", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ section: "about", data }),
      });
      const json = await res.json();
      setStatus(json.success ? "success" : "error");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const updateField = (key: keyof AboutData) => (val: string) =>
    setData((prev) => ({ ...prev, [key]: key === "founded_year" ? parseInt(val) || 0 : val }));

  const addMember = () =>
    setData((prev) => ({
      ...prev,
      management_team: [
        ...prev.management_team,
        { name: "", position: "", bio: "", photo_url: "" },
      ],
    }));

  const removeMember = (idx: number) =>
    setData((prev) => ({
      ...prev,
      management_team: prev.management_team.filter((_, i) => i !== idx),
    }));

  const updateMember = (idx: number, field: keyof ManagementMember, val: string) =>
    setData((prev) => ({
      ...prev,
      management_team: prev.management_team.map((m, i) =>
        i === idx ? { ...m, [field]: val } : m
      ),
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/website" className="p-2 rounded-lg hover:bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">About Us</h1>
            <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px]">School history, vision, mission & management team</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Status Banner */}
      {status === "success" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium">
          <CheckCircle2 className="w-4 h-4" /> Changes saved successfully!
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium">
          <AlertCircle className="w-4 h-4" /> Failed to save. Please try again.
        </div>
      )}

      {/* ── Section 1: Hero & Basic Info ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField
            label="Hero Tagline"
            value={data.hero_tagline}
            onChange={updateField("hero_tagline")}
            placeholder="e.g. Nurturing Excellence, Rooted in Tradition"
          />
          <InputField
            label="Founded Year"
            value={data.founded_year}
            onChange={updateField("founded_year")}
            type="number"
            placeholder="e.g. 1998"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FileUploadField
            label="Homepage Hero Background Image"
            value={data.hero_image_url}
            onChange={updateField("hero_image_url")}
            accept="image/*"
            placeholder="Upload or paste image for homepage background..."
          />
          <FileUploadField
            label="Homepage Hero Side Image"
            value={data.hero_side_image_url}
            onChange={updateField("hero_side_image_url")}
            accept="image/*"
            placeholder="Upload or paste image for homepage side image..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <TextareaField
            label="Our History"
            value={data.history}
            onChange={updateField("history")}
            placeholder="Tell the story of how the school was founded..."
            rows={6}
          />
          <FileUploadField
            label="History Section Image"
            value={data.history_image_url}
            onChange={updateField("history_image_url")}
            accept="image/*"
            placeholder="Upload or paste image URL for History section..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <TextareaField
            label="Infrastructure"
            value={data.infrastructure}
            onChange={updateField("infrastructure")}
            placeholder="Describe the school's facilities, buildings, labs, sports complex..."
            rows={6}
          />
          <FileUploadField
            label="Infrastructure Section Image"
            value={data.infrastructure_image_url}
            onChange={updateField("infrastructure_image_url")}
            accept="image/*"
            placeholder="Upload or paste image URL for Infrastructure section..."
          />
        </div>
      </div>

      {/* ── Section 2: Vision & Mission ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Vision & Mission</h2>
        <TextareaField
          label="Our Vision"
          value={data.vision}
          onChange={updateField("vision")}
          placeholder="The long-term aspiration and desired future for the school..."
          rows={4}
        />
        <TextareaField
          label="Our Mission"
          value={data.mission}
          onChange={updateField("mission")}
          placeholder="The school's purpose and how it serves students and community..."
          rows={4}
        />
      </div>

      {/* ── Section 3: Management Team ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Management Team</h2>
          <button
            onClick={addMember}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Member
          </button>
        </div>

        {data.management_team.length === 0 ? (
          <div className="card-subtitle text-center py-8 text-slate-600 dark: text-[13px] dark:text-slate-600 dark:">
            No team members yet. Click "Add Member" to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {data.management_team.map((member, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-500 dark:text-slate-400">
                    <User className="w-4 h-4" />
                    <span className="text-[12px] font-semibold">Member #{idx + 1}</span>
                  </div>
                  <button
                    onClick={() => removeMember(idx)}
                    className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors dark:text-slate-600 dark:text-slate-500 dark:text-slate-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Full Name"
                    value={member.name}
                    onChange={(v) => updateMember(idx, "name", v)}
                    placeholder="e.g. Dr. Rajesh Kumar"
                  />
                  <InputField
                    label="Position / Designation"
                    value={member.position}
                    onChange={(v) => updateMember(idx, "position", v)}
                    placeholder="e.g. Principal"
                  />
                </div>
                <FileUploadField
                  label="Photo"
                  value={member.photo_url}
                  onChange={(v) => updateMember(idx, "photo_url", v)}
                  accept="image/*"
                  placeholder="https://..."
                />
                <TextareaField
                  label="Short Bio"
                  value={member.bio}
                  onChange={(v) => updateMember(idx, "bio", v)}
                  placeholder="Brief description of the person's background..."
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Bottom */}
      <div className="flex justify-end pb-6">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save About Us"}
        </button>
      </div>
    </div>
  );
}
