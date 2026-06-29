"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Newspaper, CheckCircle2, AlertCircle, FileText, Megaphone, Award } from "lucide-react";
import { FileUploadField } from "../../../components/ui/FileUploadField";

type NewsType = "announcement" | "circular" | "result";

interface NewsItem {
  _id?: string;
  type: NewsType;
  title: string;
  content: string;
  pdf_url: string;
  published_at: string;
  is_published: boolean;
}

const typeConfig: Record<NewsType, { label: string; color: string; icon: React.ReactNode }> = {
  announcement: { label: "Announcement", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <Megaphone className="w-3.5 h-3.5" /> },
  circular: { label: "Circular", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <FileText className="w-3.5 h-3.5" /> },
  result: { label: "Result", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <Award className="w-3.5 h-3.5" /> },
};

const makeEmpty = (): NewsItem => ({
  type: "announcement",
  title: "",
  content: "",
  pdf_url: "",
  published_at: new Date().toISOString().slice(0, 10),
  is_published: true,
});

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data?.news_notices) {
            setItems(res.data.news_notices.map((n: NewsItem) => ({
              ...n,
              published_at: n.published_at ? new Date(n.published_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            })));
          }
          if (res.data?.news?.hero_image_url) {
            setHeroImageUrl(res.data.news.hero_image_url);
          }
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
        body: JSON.stringify({
          section: "raw",
          data: {
            news_notices: items,
            news: { hero_image_url: heroImageUrl }
          }
        }),
      });
      setStatus((await res.json()).success ? "success" : "error");
    } catch { setStatus("error"); }
    finally { setSaving(false); setTimeout(() => setStatus("idle"), 3000); }
  };

  const addItem = () => setItems((p) => [makeEmpty(), ...p]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof NewsItem, value: unknown) =>
    setItems((p) => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/website" className="p-2 rounded-lg hover:bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400 dark:hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center"><Newspaper className="w-5 h-5 text-rose-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">News & Notices</h1>
            <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px]">Announcements, circulars (PDF) and result news</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={addItem} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-750 text-white text-[13px] font-semibold hover:bg-slate-700 transition-colors">
            <Plus className="w-4 h-4" /> Add News
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {status === "success" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium"><CheckCircle2 className="w-4 h-4" /> Saved!</div>}
      {status === "error" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium"><AlertCircle className="w-4 h-4" /> Failed.</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(["announcement", "circular", "result"] as NewsType[]).map((t) => {
          const count = items.filter((i) => i.type === t).length;
          const cfg = typeConfig[t];
          return (
            <div key={t} className={`p-4 rounded-xl border ${cfg.color} bg-opacity-10`}>
              <div className={`flex items-center gap-2 ${cfg.color.split(" ")[1]} mb-1`}>
                {cfg.icon}
                <span className="text-[11px] font-semibold uppercase tracking-wider">{cfg.label}s</span>
              </div>
              <p className="text-2xl font-black text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* News Hero settings */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">News Page Settings</h2>
        <FileUploadField
          label="Hero Banner Image"
          value={heroImageUrl}
          onChange={setHeroImageUrl}
          accept="image/*"
          placeholder="Upload or paste image URL for News page hero banner..."
        />
      </div>

      {/* News Items */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
          <Newspaper className="w-12 h-12 text-slate-600 mx-auto mb-3 dark:text-slate-700 dark:text-slate-300" />
          <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 font-semibold">No news or notices yet</p>
          <p className="text-slate-600 dark:text-slate-500 text-[12px] mt-1 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">Click "Add News" to create your first announcement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const cfg = typeConfig[item.type];
            return (
              <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
                {/* Row 1: Type + Date + Toggle + Delete */}
                <div className="flex items-center gap-3 flex-wrap">
                  <select value={item.type} onChange={(e) => updateItem(idx, "type", e.target.value)}
                    className="bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all">
                    <option value="announcement">📢 Announcement</option>
                    <option value="circular">📄 Circular</option>
                    <option value="result">🏆 Result News</option>
                  </select>
                  <input type="date" value={item.published_at} onChange={(e) => updateItem(idx, "published_at", e.target.value)}
                    className="bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
                  <button onClick={() => updateItem(idx, "is_published", !item.is_published)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${item.is_published ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-500 border-slate-200 dark:border-slate-750"} dark:text-slate-600 dark:text-slate-500 dark:text-slate-400`}>
                    {item.is_published ? "● Published" : "○ Draft"}
                  </button>
                  <button onClick={() => removeItem(idx)} className="ml-auto p-1.5 text-slate-600 dark:text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors dark:text-slate-600 dark:text-slate-500 dark:text-slate-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</label>
                  <input type="text" value={item.title} onChange={(e) => updateItem(idx, "title", e.target.value)} placeholder="e.g. Annual Sports Day 2024 – Date Announced"
                    className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Content / Body</label>
                  <textarea value={item.content} onChange={(e) => updateItem(idx, "content", e.target.value)} rows={3} placeholder="Details of the news or notice..."
                    className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />
                </div>

                {/* PDF URL */}
                <FileUploadField
                  label="PDF Attachment (optional)"
                  value={item.pdf_url}
                  onChange={(v) => updateItem(idx, "pdf_url", v)}
                  accept="application/pdf"
                  placeholder="https://... (link to circular PDF or upload)"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pb-6">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save News & Notices"}
        </button>
      </div>
    </div>
  );
}
