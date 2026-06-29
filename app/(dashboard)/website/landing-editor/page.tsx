"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Globe, CheckCircle2, AlertCircle,
  Plus, Trash2, Image, HelpCircle, Star, Sparkles, Trophy, Video
} from "lucide-react";
import { FileUploadField } from "../../../components/ui/FileUploadField";

interface HighlightItem {
  _id?: string;
  value: string;
  label: string;
  icon: string;
}

interface FeatureItem {
  _id?: string;
  title: string;
  desc: string;
  icon: string;
}

interface FacilityItem {
  _id?: string;
  title: string;
  icon: string;
}

interface TestimonialItem {
  _id?: string;
  name: string;
  role: string;
  content: string;
  img: string;
}

interface FAQItem {
  _id?: string;
  question: string;
  answer: string;
}

interface HeroStatItem {
  _id?: string;
  value: string;
  label: string;
  icon: string;
}

interface EditorData {
  hero_tagline: string;
  hero_description: string;
  hero_image_url: string;
  hero_side_image_url: string;
  hero_video_url: string;
  founded_year: number;
  // School Info — shown in Hero & Footer
  hero_stats: HeroStatItem[];
  affiliation_name: string;
  affiliation_number: string;
  school_code: string;
  recognition_tags: string;
  admission_year_label: string;
  // Sections
  highlights: HighlightItem[];
  why_choose_us: FeatureItem[];
  facilities: FacilityItem[];
  testimonials: TestimonialItem[];
  faqs: FAQItem[];
}

const defaultData: EditorData = {
  hero_tagline: "",
  hero_description: "",
  hero_image_url: "",
  hero_side_image_url: "",
  hero_video_url: "",
  founded_year: 0,
  hero_stats: [],
  affiliation_name: "",
  affiliation_number: "",
  school_code: "",
  recognition_tags: "",
  admission_year_label: "",
  highlights: [],
  why_choose_us: [],
  facilities: [],
  testimonials: [],
  faqs: [],
};

const SUGGESTED_ICONS = ["Monitor", "Users", "FlaskConical", "Trophy", "Laptop", "ShieldCheck", "MonitorPlay", "TestTube2", "Library", "Bus", "Mic2", "Music", "Presentation", "BookOpen", "GraduationCap", "Heart", "Star", "Target"];

export default function LandingEditorPage() {
  const [data, setData] = useState<EditorData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [tab, setTab] = useState<"hero" | "school_info" | "highlights" | "features" | "facilities" | "testimonials" | "faq">("hero");

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const doc = res.data;
          setData({
            hero_tagline: doc.about?.hero_tagline || "",
            hero_description: doc.about?.hero_description || "",
            hero_image_url: doc.about?.hero_image_url || "",
            hero_side_image_url: doc.about?.hero_side_image_url || "",
            hero_video_url: doc.about?.hero_video_url || "",
            founded_year: doc.about?.founded_year || 0,
            hero_stats: doc.about?.hero_stats && doc.about.hero_stats.length > 0 ? doc.about.hero_stats : [],
            affiliation_name: doc.about?.affiliation_name || "",
            affiliation_number: doc.about?.affiliation_number || "",
            school_code: doc.about?.school_code || "",
            recognition_tags: (doc.about?.recognition_tags || []).join(", "),
            admission_year_label: doc.about?.admission_year_label || "",
            highlights: doc.highlights && doc.highlights.length > 0 ? doc.highlights : [],
            why_choose_us: doc.why_choose_us && doc.why_choose_us.length > 0 ? doc.why_choose_us : [],
            facilities: doc.facilities && doc.facilities.length > 0 ? doc.facilities : [],
            testimonials: doc.testimonials && doc.testimonials.length > 0 ? doc.testimonials : [],
            faqs: doc.faqs && doc.faqs.length > 0 ? doc.faqs : [],
          });
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
        body: JSON.stringify({
          section: "raw",
          data: {
            "about.hero_tagline": data.hero_tagline,
            "about.hero_description": data.hero_description,
            "about.hero_image_url": data.hero_image_url,
            "about.hero_side_image_url": data.hero_side_image_url,
            "about.hero_video_url": data.hero_video_url,
            "about.founded_year": data.founded_year || undefined,
            "about.hero_stats": data.hero_stats,
            "about.affiliation_name": data.affiliation_name,
            "about.affiliation_number": data.affiliation_number,
            "about.school_code": data.school_code,
            "about.recognition_tags": data.recognition_tags
              ? data.recognition_tags.split(",").map((t) => t.trim()).filter(Boolean)
              : [],
            "about.admission_year_label": data.admission_year_label,
            highlights: data.highlights,
            why_choose_us: data.why_choose_us,
            facilities: data.facilities,
            testimonials: data.testimonials,
            faqs: data.faqs,
          }
        }),
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

  // State Helpers for arrays
  const addHeroStat = () => setData((p) => ({ ...p, hero_stats: [...p.hero_stats, { value: "", label: "", icon: "Users" }] }));
  const removeHeroStat = (i: number) => setData((p) => ({ ...p, hero_stats: p.hero_stats.filter((_, idx) => idx !== i) }));
  const updateHeroStat = (i: number, f: keyof HeroStatItem, v: string) =>
    setData((p) => ({ ...p, hero_stats: p.hero_stats.map((s, idx) => idx === i ? { ...s, [f]: v } : s) }));

  const addHighlight = () => setData((p) => ({ ...p, highlights: [...p.highlights, { value: "", label: "", icon: "Star" }] }));
  const removeHighlight = (i: number) => setData((p) => ({ ...p, highlights: p.highlights.filter((_, idx) => idx !== i) }));
  const updateHighlight = (i: number, f: keyof HighlightItem, v: string) =>
    setData((p) => ({ ...p, highlights: p.highlights.map((h, idx) => idx === i ? { ...h, [f]: v } : h) }));

  const addFeature = () => setData((p) => ({ ...p, why_choose_us: [...p.why_choose_us, { icon: "Sparkles", title: "", desc: "" }] }));
  const removeFeature = (i: number) => setData((p) => ({ ...p, why_choose_us: p.why_choose_us.filter((_, idx) => idx !== i) }));
  const updateFeature = (i: number, f: keyof FeatureItem, v: string) =>
    setData((p) => ({ ...p, why_choose_us: p.why_choose_us.map((fe, idx) => idx === i ? { ...fe, [f]: v } : fe) }));

  const addFacility = () => setData((p) => ({ ...p, facilities: [...p.facilities, { icon: "Star", title: "" }] }));
  const removeFacility = (i: number) => setData((p) => ({ ...p, facilities: p.facilities.filter((_, idx) => idx !== i) }));
  const updateFacility = (i: number, f: keyof FacilityItem, v: string) =>
    setData((p) => ({ ...p, facilities: p.facilities.map((fac, idx) => idx === i ? { ...fac, [f]: v } : fac) }));

  const addTestimonial = () => setData((p) => ({ ...p, testimonials: [...p.testimonials, { name: "", role: "", content: "", img: "" }] }));
  const removeTestimonial = (i: number) => setData((p) => ({ ...p, testimonials: p.testimonials.filter((_, idx) => idx !== i) }));
  const updateTestimonial = (i: number, f: keyof TestimonialItem, v: string) =>
    setData((p) => ({ ...p, testimonials: p.testimonials.map((t, idx) => idx === i ? { ...t, [f]: v } : t) }));

  const addFAQ = () => setData((p) => ({ ...p, faqs: [...p.faqs, { question: "", answer: "" }] }));
  const removeFAQ = (i: number) => setData((p) => ({ ...p, faqs: p.faqs.filter((_, idx) => idx !== i) }));
  const updateFAQ = (i: number, f: keyof FAQItem, v: string) =>
    setData((p) => ({ ...p, faqs: p.faqs.map((faq, idx) => idx === i ? { ...faq, [f]: v } : faq) }));

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
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Homepage Landing Editor</h1>
            <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px]">Manage all content displayed on your root landing page</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md shadow-primary/10"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>

      {/* Alert Indicators */}
      {status === "success" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" /> Homepage layout saved successfully!
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium animate-fadeIn">
          <AlertCircle className="w-4 h-4" /> Failed to save content edits.
        </div>
      )}

      {/* Dynamic Tab Bar */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-fit">
        {[
          { id: "hero", label: "Hero Banner" },
          { id: "school_info", label: "School Info" },
          { id: "highlights", label: "Stats Highlights" },
          { id: "features", label: "Why Choose Us" },
          { id: "facilities", label: "Facilities" },
          { id: "testimonials", label: "Testimonials" },
          { id: "faq", label: "FAQs" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${tab === t.id ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Hero Banner ── */}
      {tab === "hero" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
          <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Homepage Header Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hero Tagline</label>
              <input
                type="text"
                value={data.hero_tagline}
                onChange={(e) => setData({ ...data, hero_tagline: e.target.value })}
                placeholder="e.g. Excellence in Education & Character"
                className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Founded Year</label>
              <input
                type="number"
                value={data.founded_year || ""}
                onChange={(e) => setData({ ...data, founded_year: parseInt(e.target.value) || 0 })}
                placeholder="e.g. 1999 (leave blank to hide)"
                className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hero Description / Introduction</label>
            <textarea
              value={data.hero_description}
              onChange={(e) => setData({ ...data, hero_description: e.target.value })}
              placeholder="Brief description of the school..."
              rows={3}
              className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FileUploadField
              label="Background Image"
              value={data.hero_image_url}
              onChange={(v) => setData({ ...data, hero_image_url: v })}
              accept="image/*"
              placeholder="Background wallpaper for hero section..."
            />
            <FileUploadField
              label="Side Image Overlay"
              value={data.hero_side_image_url}
              onChange={(v) => setData({ ...data, hero_side_image_url: v })}
              accept="image/*"
              placeholder="Graphic/kids photo next to description..."
            />
          </div>
          <FileUploadField
            label="Virtual Campus Tour Video (Link or Upload)"
            value={data.hero_video_url}
            onChange={(v) => setData({ ...data, hero_video_url: v })}
            accept="video/*"
            placeholder="Pasted YouTube link or uploaded direct MP4..."
          />
        </div>
      )}

      {/* ── Tab: School Info (Hero Stats, Affiliation, Recognition) ── */}
      {tab === "school_info" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-6">
          <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">School Info (shown in Hero &amp; Footer)</h2>

          {/* Affiliation Details */}
          <div>
            <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Affiliation &amp; Recognition</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">Affiliation Board (e.g. CBSE)</label>
                <input type="text" value={data.affiliation_name}
                  onChange={(e) => setData({ ...data, affiliation_name: e.target.value })}
                  placeholder="e.g. CBSE (leave blank to hide)"
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">Affiliation Number</label>
                <input type="text" value={data.affiliation_number}
                  onChange={(e) => setData({ ...data, affiliation_number: e.target.value })}
                  placeholder="e.g. 1234567 (leave blank to hide)"
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">School Code</label>
                <input type="text" value={data.school_code}
                  onChange={(e) => setData({ ...data, school_code: e.target.value })}
                  placeholder="e.g. 98765 (leave blank to hide)"
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">Recognition Tags (comma separated — shown at bottom of hero)</label>
              <input type="text" value={data.recognition_tags}
                onChange={(e) => setData({ ...data, recognition_tags: e.target.value })}
                placeholder="e.g. CBSE Board, ISO Certified, NAAC Accredited (leave blank to hide)"
                className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">Admission Year Label (for Footer CTA)</label>
              <input type="text" value={data.admission_year_label}
                onChange={(e) => setData({ ...data, admission_year_label: e.target.value })}
                placeholder="e.g. 2025-26 (leave blank to hide)"
                className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>
          </div>

          {/* Hero Stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hero Stats (shown below description)</p>
              <button onClick={addHeroStat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Stat
              </button>
            </div>
            {data.hero_stats.length === 0 ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-500 text-[13px] border border-dashed border-slate-700/40 rounded-xl dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                No stats added — hero stats section will be hidden on landing page.
              </div>
            ) : (
              <div className="space-y-3">
                {data.hero_stats.map((s, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex gap-4 items-start">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</label>
                        <input type="text" value={s.value} onChange={(e) => updateHeroStat(i, "value", e.target.value)} placeholder="e.g. 3500+"
                          className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Label</label>
                        <input type="text" value={s.label} onChange={(e) => updateHeroStat(i, "label", e.target.value)} placeholder="e.g. Students"
                          className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Icon (Lucide Name)</label>
                        <input type="text" value={s.icon} onChange={(e) => updateHeroStat(i, "icon", e.target.value)} placeholder="e.g. Users or Trophy"
                          className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all" />
                      </div>
                    </div>
                    <button onClick={() => removeHeroStat(i)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 mt-6 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Stats Highlights ── */}
      {tab === "highlights" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Statistics & Highlights</h2>
            <button onClick={addHighlight} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Stat
            </button>
          </div>
          {data.highlights.length === 0 ? (
            <div className="text-center py-10 text-slate-600 dark:text-slate-500 text-[13px] dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">No highlights defined yet. Click "Add Stat" to create one.</div>
          ) : (
            <div className="space-y-4">
              {data.highlights.map((h, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex gap-4 items-start">
                  <div className="text-2xl pt-2 shrink-0">{h.icon || "📈"}</div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Icon (Lucide Name)</label>
                      <input type="text" value={h.icon} onChange={(e) => updateHighlight(i, "icon", e.target.value)} placeholder="e.g. Trophy or Users"
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value / Stat</label>
                      <input type="text" value={h.value} onChange={(e) => updateHighlight(i, "value", e.target.value)} placeholder="e.g. 2500+ or 100%"
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Label</label>
                      <input type="text" value={h.label} onChange={(e) => updateHighlight(i, "label", e.target.value)} placeholder="e.g. Happy Students"
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all" />
                    </div>
                  </div>
                  <button onClick={() => removeHighlight(i)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Why Choose Us (Features) ── */}
      {tab === "features" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Value Propositions (Why Choose Us)</h2>
            <button onClick={addFeature} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Feature
            </button>
          </div>
          {data.why_choose_us.length === 0 ? (
            <div className="text-center py-10 text-slate-600 dark:text-slate-500 text-[13px] dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">No features defined yet.</div>
          ) : (
            <div className="space-y-4">
              {data.why_choose_us.map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-500 dark:text-slate-400">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-[12px] font-semibold">Feature #{i + 1}</span>
                    </div>
                    <button onClick={() => removeFeature(i)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</label>
                      <input type="text" value={f.title} onChange={(e) => updateFeature(i, "title", e.target.value)} placeholder="e.g. Smart Classrooms"
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-[12px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Icon (e.g. Monitor, Users, Trophy, ShieldCheck)</label>
                      <select value={f.icon} onChange={(e) => updateFeature(i, "icon", e.target.value)}
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-[12px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 transition-all">
                        {SUGGESTED_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Short Description</label>
                      <input type="text" value={f.desc} onChange={(e) => updateFeature(i, "desc", e.target.value)} placeholder="Describe the feature..."
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-[12px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Facilities ── */}
      {tab === "facilities" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Campus Facilities</h2>
            <button onClick={addFacility} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Facility
            </button>
          </div>
          {data.facilities.length === 0 ? (
            <div className="text-center py-10 text-slate-600 dark:text-slate-500 text-[13px] dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">No facilities defined yet.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {data.facilities.map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex gap-3 items-center">
                  <Trophy className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input type="text" value={f.title} onChange={(e) => updateFacility(i, "title", e.target.value)} placeholder="e.g. Physics Labs"
                      className="bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none transition-all w-full" />
                    <select value={f.icon} onChange={(e) => updateFacility(i, "icon", e.target.value)}
                      className="bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none transition-all w-full">
                      {SUGGESTED_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                  <button onClick={() => removeFacility(i)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 5: Testimonials ── */}
      {tab === "testimonials" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Family & Alumni Testimonials</h2>
            <button onClick={addTestimonial} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Testimonial
            </button>
          </div>
          {data.testimonials.length === 0 ? (
            <div className="text-center py-10 text-slate-600 dark:text-slate-500 text-[13px] dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">No testimonials added.</div>
          ) : (
            <div className="space-y-4">
              {data.testimonials.map((t, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-500 dark:text-slate-400">
                      <Star className="w-4 h-4 text-primary" />
                      <span className="text-[12px] font-semibold">Testimonial #{i + 1}</span>
                    </div>
                    <button onClick={() => removeTestimonial(i)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
                      <input type="text" value={t.name} onChange={(e) => updateTestimonial(i, "name", e.target.value)} placeholder="e.g. Rajesh Kumar"
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role / Description</label>
                      <input type="text" value={t.role} onChange={(e) => updateTestimonial(i, "role", e.target.value)} placeholder="e.g. Parent of Class X student"
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none transition-all" />
                    </div>
                    <div className="md:col-span-2">
                      <FileUploadField
                        label="User Photo"
                        value={t.img}
                        onChange={(v) => updateTestimonial(i, "img", v)}
                        accept="image/*"
                        placeholder="https://... (photo URL or upload)"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Review Content</label>
                      <textarea value={t.content} onChange={(e) => updateTestimonial(i, "content", e.target.value)} placeholder="Type testimonial review text here..." rows={2}
                        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none transition-all resize-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 6: FAQs ── */}
      {tab === "faq" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-slate-900 dark:text-white font-bold text-[14px]">Frequently Asked Questions (FAQ)</h2>
            <button onClick={addFAQ} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          </div>
          {data.faqs.length === 0 ? (
            <div className="text-center py-10 text-slate-600 dark:text-slate-500 text-[13px] dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">No FAQs created.</div>
          ) : (
            <div className="space-y-4">
              {data.faqs.map((faq, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-500 dark:text-slate-400">
                      <HelpCircle className="w-4 h-4 text-indigo-400" />
                      <span className="text-[12px] font-semibold">FAQ #{i + 1}</span>
                    </div>
                    <button onClick={() => removeFAQ(i)} className="p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question</label>
                    <input type="text" value={faq.question} onChange={(e) => updateFAQ(i, "question", e.target.value)} placeholder="e.g. What are school hours?"
                      className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none transition-all" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Answer</label>
                    <textarea value={faq.answer} onChange={(e) => updateFAQ(i, "answer", e.target.value)} placeholder="Type answer details here..." rows={2}
                      className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none transition-all resize-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Bottom */}
      <div className="flex justify-end pb-6">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md shadow-primary/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>
    </div>
  );
}
