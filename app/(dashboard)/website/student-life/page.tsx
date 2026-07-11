"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Trophy, CheckCircle2, AlertCircle } from "lucide-react";
import { FileUploadField } from "../../../components/ui/FileUploadField";

interface Achievement {
  _id?: string;
  title: string;
  year: number;
  description: string;
}

interface StudentLifeData {
  sports: string;
  sports_image_url: string;
  cultural_activities: string;
  cultural_image_url: string;
  clubs_societies: string;
  clubs_image_url: string;
  hero_image_url: string;
  achievements: Achievement[];
}

const defaultData: StudentLifeData = {
  sports: "",
  sports_image_url: "",
  cultural_activities: "",
  cultural_image_url: "",
  clubs_societies: "",
  clubs_image_url: "",
  hero_image_url: "",
  achievements: [],
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

export default function StudentLifePage() {
  const [data, setData] = useState<StudentLifeData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data?.student_life) setData({ ...defaultData, ...res.data.student_life }); })
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
        body: JSON.stringify({ section: "student_life", data }),
      });
      setStatus((await res.json()).success ? "success" : "error");
    } catch { setStatus("error"); }
    finally { setSaving(false); setTimeout(() => setStatus("idle"), 3000); }
  };

  const addAchievement = () => setData((p) => ({ ...p, achievements: [...p.achievements, { title: "", year: new Date().getFullYear(), description: "" }] }));
  const removeAchievement = (i: number) => setData((p) => ({ ...p, achievements: p.achievements.filter((_, idx) => idx !== i) }));
  const updateAchievement = (i: number, f: keyof Achievement, v: string) =>
    setData((p) => ({ ...p, achievements: p.achievements.map((a, idx) => idx === i ? { ...a, [f]: f === "year" ? parseInt(v) || 0 : v } : a) }));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/website" className="p-2 rounded-lg hover:bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400 dark:hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Trophy className="w-5 h-5 text-purple-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Life</h1>
            <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px]">Sports, cultural activities, clubs & achievements</p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {status === "success" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium"><CheckCircle2 className="w-4 h-4" /> Saved!</div>}
      {status === "error" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium"><AlertCircle className="w-4 h-4" /> Failed.</div>}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Activities & Layout</h2>
        <FileUploadField
          label="Hero Banner Image"
          value={data.hero_image_url || ""}
          onChange={(v) => setData((p) => ({ ...p, hero_image_url: v }))}
          accept="image/*"
          placeholder="Upload or paste image URL for Student Life page hero banner..."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <TextareaField label="Sports & Athletics" value={data.sports} onChange={(v) => setData((p) => ({ ...p, sports: v }))}
            placeholder="Cricket, Football, Basketball, Kabaddi, Swimming, Athletics... Describe facilities, teams, inter-school competitions..." rows={5} />
          <FileUploadField
            label="Sports Section Image"
            value={data.sports_image_url || ""}
            onChange={(v) => setData((p) => ({ ...p, sports_image_url: v }))}
            accept="image/*"
            placeholder="Upload or paste image URL for Sports section..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <TextareaField label="Cultural Activities" value={data.cultural_activities} onChange={(v) => setData((p) => ({ ...p, cultural_activities: v }))}
            placeholder="Annual Day, Republic Day celebrations, Diwali Mela, Classical dance, Drama, Music..." rows={5} />
          <FileUploadField
            label="Cultural Section Image"
            value={data.cultural_image_url || ""}
            onChange={(v) => setData((p) => ({ ...p, cultural_image_url: v }))}
            accept="image/*"
            placeholder="Upload or paste image URL for Cultural section..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <TextareaField label="Clubs & Societies" value={data.clubs_societies} onChange={(v) => setData((p) => ({ ...p, clubs_societies: v }))}
            placeholder="Science Club, Eco Club, Literary Society, Debate Club, Art Club, Robotics Club..." rows={5} />
          <FileUploadField
            label="Clubs Section Image"
            value={data.clubs_image_url || ""}
            onChange={(v) => setData((p) => ({ ...p, clubs_image_url: v }))}
            accept="image/*"
            placeholder="Upload or paste image URL for Clubs section..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Achievements</h2>
          <button onClick={addAchievement} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Achievement
          </button>
        </div>
        {data.achievements.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-500 text-[13px] text-center py-4 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">No achievements yet. Click "Add Achievement" to highlight school accomplishments.</p>
        ) : (
          <div className="space-y-4">
            {data.achievements.map((a, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px] font-semibold">Achievement #{idx + 1}</span>
                  <button onClick={() => removeAchievement(idx)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors dark:text-slate-600 dark:text-slate-500 dark:text-slate-400"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</label>
                    <input type="text" value={a.title} onChange={(e) => updateAchievement(idx, "title", e.target.value)} placeholder="e.g. State Level Science Olympiad Winner"
                      className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Year</label>
                    <input type="number" value={a.year} onChange={(e) => updateAchievement(idx, "year", e.target.value)} placeholder="2024"
                      className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea value={a.description} onChange={(e) => updateAchievement(idx, "description", e.target.value)} placeholder="Brief description of the achievement..." rows={2}
                    className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all resize-none" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Student Life"}
        </button>
      </div>
    </div>
  );
}
