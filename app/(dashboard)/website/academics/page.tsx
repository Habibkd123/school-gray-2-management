"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, GraduationCap,
  CheckCircle2, AlertCircle, User
} from "lucide-react";
import { FileUploadField } from "../../../components/ui/FileUploadField";

interface FacultyMember {
  _id?: string;
  name: string;
  subject: string;
  qualification: string;
  photo_url: string;
}

interface ProgramItem {
  _id?: string;
  title: string;
  age: string;
  desc: string;
  img: string;
}

interface AcademicsData {
  curriculum_overview: string;
  class_structure: string;
  academic_calendar: string;
  hero_image_url: string;
  programs: ProgramItem[];
  faculty: FacultyMember[];
}

const defaultData: AcademicsData = {
  curriculum_overview: "",
  class_structure: "",
  academic_calendar: "",
  hero_image_url: "",
  programs: [
    { title: "Pre-Primary", age: "Nursery – UKG", desc: "Play-based learning, socialization & foundational skills.", img: "https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=600&auto=format&fit=crop" },
    { title: "Primary", age: "Classes I – V", desc: "Core subjects with emphasis on curiosity and creativity.", img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" },
    { title: "Middle School", age: "Classes VI – VIII", desc: "Advanced concepts, critical thinking and project work.", img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop" },
    { title: "Secondary", age: "Classes IX – X", desc: "CBSE Board prep, career counseling, leadership building.", img: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=600&auto=format&fit=crop" },
    { title: "Senior Secondary", age: "Classes XI – XII", desc: "Science (PCM/PCB), Commerce & Humanities streams.", img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop" },
  ],
  faculty: [],
};

function InputField({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all" />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder = "", rows = 4 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all resize-none" />
    </div>
  );
}

export default function AcademicsPage() {
  const [data, setData] = useState<AcademicsData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.academics) {
          const academics = res.data.academics;
          setData({
            ...defaultData,
            ...academics,
            programs: academics.programs && academics.programs.length > 0 
              ? academics.programs 
              : defaultData.programs,
            faculty: academics.faculty ?? []
          });
        }
      })
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
        body: JSON.stringify({ section: "academics", data }),
      });
      const json = await res.json();
      setStatus(json.success ? "success" : "error");
    } catch { setStatus("error"); }
    finally { setSaving(false); setTimeout(() => setStatus("idle"), 3000); }
  };

  const addProgram = () => setData((p) => ({ ...p, programs: [...p.programs, { title: "", age: "", desc: "", img: "" }] }));
  const removeProgram = (i: number) => setData((p) => ({ ...p, programs: p.programs.filter((_, idx) => idx !== i) }));
  const updateProgram = (i: number, f: keyof ProgramItem, v: string) =>
    setData((p) => ({ ...p, programs: p.programs.map((m, idx) => idx === i ? { ...m, [f]: v } : m) }));

  const addFaculty = () => setData((p) => ({ ...p, faculty: [...p.faculty, { name: "", subject: "", qualification: "", photo_url: "" }] }));
  const removeFaculty = (i: number) => setData((p) => ({ ...p, faculty: p.faculty.filter((_, idx) => idx !== i) }));
  const updateFaculty = (i: number, f: keyof FacultyMember, v: string) =>
    setData((p) => ({ ...p, faculty: p.faculty.map((m, idx) => idx === i ? { ...m, [f]: v } : m) }));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/website" className="p-2 rounded-lg hover:bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Academics</h1>
            <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px]">Curriculum, faculty, class structure & academic calendar</p>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {status === "success" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium"><CheckCircle2 className="w-4 h-4" /> Saved successfully!</div>}
      {status === "error" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium"><AlertCircle className="w-4 h-4" /> Failed to save.</div>}

      {/* Curriculum & Structure */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Curriculum & Structure</h2>
        <FileUploadField
          label="Hero Banner Image"
          value={data.hero_image_url || ""}
          onChange={(v) => setData((p) => ({ ...p, hero_image_url: v }))}
          accept="image/*"
          placeholder="Upload or paste image URL for Academics page hero banner..."
        />
        <TextareaField label="Curriculum Overview" value={data.curriculum_overview} onChange={(v) => setData((p) => ({ ...p, curriculum_overview: v }))} placeholder="Describe the curriculum board (CBSE, ICSE, State Board), key subjects, teaching approach..." rows={5} />
        <TextareaField label="Class Structure" value={data.class_structure} onChange={(v) => setData((p) => ({ ...p, class_structure: v }))} placeholder="e.g. Pre-Primary (Nursery–KG2), Primary (Class 1–5), Middle School (6–8), Secondary (9–10), Senior Secondary (11–12)..." rows={4} />
        <TextareaField label="Academic Calendar" value={data.academic_calendar} onChange={(v) => setData((p) => ({ ...p, academic_calendar: v }))} placeholder="Describe the academic year schedule, term dates, holiday periods, exam schedule..." rows={4} />
      </div>

      {/* Programs */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Academic Programs</h2>
          <button onClick={addProgram} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Program
          </button>
        </div>
        {data.programs.length === 0 ? (
          <div className="card-subtitle text-center py-8 text-slate-600 dark: text-[13px] dark:text-slate-600 dark:">No programs defined. Click "Add Program" to get started.</div>
        ) : (
          <div className="space-y-4">
            {data.programs.map((program, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-500 dark:text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-[12px] font-semibold">Program #{idx + 1}</span>
                  </div>
                  <button onClick={() => removeProgram(idx)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Program Title" value={program.title} onChange={(v) => updateProgram(idx, "title", v)} placeholder="e.g. Primary School" />
                  <InputField label="Age Group / Classes" value={program.age} onChange={(v) => updateProgram(idx, "age", v)} placeholder="e.g. Classes I – V or Age 6 - 11" />
                  <div className="md:col-span-2">
                    <InputField label="Description" value={program.desc} onChange={(v) => updateProgram(idx, "desc", v)} placeholder="Brief overview of the program focus..." />
                  </div>
                  <div className="md:col-span-2">
                    <FileUploadField
                      label="Image"
                      value={program.img}
                      onChange={(v) => updateProgram(idx, "img", v)}
                      accept="image/*"
                      placeholder="https://... (link to program image or upload)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Faculty */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Faculty Members</h2>
          <button onClick={addFaculty} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Faculty
          </button>
        </div>
        {data.faculty.length === 0 ? (
          <div className="card-subtitle text-center py-8 text-slate-600 dark: text-[13px] dark:text-slate-600 dark:">No faculty members yet. Click "Add Faculty" to get started.</div>
        ) : (
          <div className="space-y-4">
            {data.faculty.map((member, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-500 dark:text-slate-400">
                    <User className="w-4 h-4" />
                    <span className="text-[12px] font-semibold">Faculty #{idx + 1}</span>
                  </div>
                  <button onClick={() => removeFaculty(idx)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Full Name" value={member.name} onChange={(v) => updateFaculty(idx, "name", v)} placeholder="e.g. Mrs. Priya Sharma" />
                  <InputField label="Subject" value={member.subject} onChange={(v) => updateFaculty(idx, "subject", v)} placeholder="e.g. Mathematics" />
                  <InputField label="Qualification" value={member.qualification} onChange={(v) => updateFaculty(idx, "qualification", v)} placeholder="e.g. M.Sc, B.Ed" />
                  <FileUploadField
                    label="Photo"
                    value={member.photo_url}
                    onChange={(v) => updateFaculty(idx, "photo_url", v)}
                    accept="image/*"
                    placeholder="https://... (link to photo or upload)"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Academics"}
        </button>
      </div>
    </div>
  );
}
