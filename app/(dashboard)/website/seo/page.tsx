"use client";

import React, { useEffect, useState } from "react";
import {
  Search, ShieldCheck, Globe, Image, Star,
  Loader2, CheckCircle2, AlertCircle, Info, ExternalLink, Save, Upload,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface SeoForm {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image: string;
  favicon_url: string;
  canonical_url: string;
  google_site_verification: string;
  google_analytics_id: string;
}

const EMPTY_FORM: SeoForm = {
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  og_image: "",
  favicon_url: "",
  canonical_url: "",
  google_site_verification: "",
  google_analytics_id: "",
};

function CharCounter({ current, max }: { current: number; max: number }) {
  const over = current > max;
  return (
    <span className={`text-[11px] font-mono tabular-nums ${over ? "text-amber-500 font-bold" : "text-slate-400"}`}>
      {current}/{max}
    </span>
  );
}

export default function WebsiteSeoPage() {
  const [form, setForm] = useState<SeoForm>(EMPTY_FORM);
  const [schoolName, setSchoolName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [uploadingOg, setUploadingOg] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "og_image" | "favicon_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "og_image") setUploadingOg(true);
    else setUploadingFavicon(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setForm((prev) => ({ ...prev, [field]: data.url }));
      } else {
        alert(data.message || "Failed to upload file.");
      }
    } catch {
      alert("Failed to upload file. Please try again.");
    } finally {
      if (field === "og_image") setUploadingOg(false);
      else setUploadingFavicon(false);
      e.target.value = "";
    }
  };

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }

    fetch("/api/school/meta-config", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setSchoolName(d.school_name || "");
          setSubdomain(d.subdomain || "");
          setForm({
            meta_title:               d.meta_title               || "",
            meta_description:         d.meta_description         || "",
            meta_keywords:            d.meta_keywords            || "",
            og_image:                 d.og_image                 || "",
            favicon_url:              d.favicon_url              || "",
            canonical_url:            d.canonical_url            || "",
            google_site_verification: d.google_site_verification || "",
            google_analytics_id:      d.google_analytics_id      || "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const res = await fetch("/api/school/meta-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          meta_title:               form.meta_title.trim(),
          meta_description:         form.meta_description.trim(),
          meta_keywords:            form.meta_keywords.trim(),
          og_image:                 form.og_image.trim(),
          favicon_url:              form.favicon_url.trim(),
          canonical_url:            form.canonical_url.trim(),
          google_site_verification: form.google_site_verification.trim(),
          google_analytics_id:      form.google_analytics_id.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save SEO settings");
      }
      setSuccess("SEO settings saved! Changes will appear in search results within 1-3 days.");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = form.canonical_url
    || (subdomain ? `https://${subdomain}.${ROOT_DOMAIN}` : `https://${ROOT_DOMAIN}`);
  const previewTitle = form.meta_title || (schoolName ? `${schoolName} | Official Website` : "School Name | Official Website");
  const previewDesc  = form.meta_description || (schoolName ? `Welcome to ${schoolName}. Explore admissions, academics, news, and more.` : "School description goes here...");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Search className="w-5 h-5 text-teal-500" />
            SEO & Google Verification
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-[13px] mt-1">
            Control how your school appears in Google Search results. Changes take 1-3 days to reflect.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          id="seo-save-btn"
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save SEO Settings
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 text-rose-600 dark:text-rose-400 text-[13px] font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Google SERP Preview */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-500" />
            Google Search Snippet Preview
          </h2>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 px-2.5 py-1 rounded-full">
            Live Preview
          </span>
        </div>
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-1">
          <p className="text-[12px] text-slate-500 truncate">{previewUrl}</p>
          <p className="text-[18px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer line-clamp-1">
            {previewTitle}
          </p>
          <p className="text-[13px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {previewDesc}
          </p>
        </div>
      </div>

      {/* Basic SEO */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <h2 className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Basic SEO Metadata</h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seo-meta-title" className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Page Title (Meta Title)
              </label>
              <CharCounter current={form.meta_title.length} max={60} />
            </div>
            <input
              id="seo-meta-title"
              type="text"
              value={form.meta_title}
              onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
              placeholder={schoolName ? `${schoolName} | Official Website & Admissions` : "e.g. Your School Name | Official Website"}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 transition-all bg-white dark:bg-slate-950"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              Appears as the blue link title in Google. Keep under 60 characters.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seo-meta-desc" className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Meta Description
              </label>
              <CharCounter current={form.meta_description.length} max={160} />
            </div>
            <textarea
              id="seo-meta-desc"
              value={form.meta_description}
              onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
              placeholder={schoolName ? `Welcome to ${schoolName}. Explore admissions, academics, news, gallery and more.` : "Describe your school in 1-2 sentences..."}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 transition-all bg-white dark:bg-slate-950 resize-none leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              Shown below the title in search results. Keep under 160 characters.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="seo-keywords" className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Search Keywords <span className="font-normal text-slate-400">(comma-separated)</span>
            </label>
            <input
              id="seo-keywords"
              type="text"
              value={form.meta_keywords}
              onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
              placeholder={schoolName ? `${schoolName.toLowerCase()}, school admissions, cbse school, myschoollife` : "e.g. school name, cbse school, school admissions 2026"}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 transition-all bg-white dark:bg-slate-950"
            />
            {form.meta_keywords && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.meta_keywords.split(",").map((kw, i) => {
                  const tag = kw.trim();
                  if (!tag) return null;
                  return (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200/50">
                      #{tag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Social Sharing */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Image className="w-4 h-4 text-purple-500" />
          <h2 className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Social Sharing & Branding</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* OG Image */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seo-og-image" className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Social Sharing Image (OG Image)
              </label>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-md cursor-pointer transition-colors">
                {uploadingOg ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingOg}
                  className="hidden"
                  onChange={(e) => handleUploadImage(e, "og_image")}
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="seo-og-image"
                type="url"
                value={form.og_image}
                onChange={(e) => setForm({ ...form, og_image: e.target.value })}
                placeholder="Upload image or paste URL"
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] outline-none focus:border-teal-500/50 transition-all bg-white dark:bg-slate-950"
              />
              {form.og_image && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, og_image: "" })}
                  className="text-[11px] text-rose-500 hover:text-rose-600 shrink-0 font-medium px-2 py-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            {form.og_image ? (
              <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.og_image} alt="OG Preview" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLElement).style.display = "none")} />
              </div>
            ) : (
              <div className="w-full h-20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[12px]">
                Image preview will appear here
              </div>
            )}
            <p className="text-[11px] text-slate-400">Recommended: 1200x630px. Shown on WhatsApp, Facebook, Twitter links.</p>
          </div>

          {/* Favicon */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seo-favicon" className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Custom Favicon
              </label>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-md cursor-pointer transition-colors">
                {uploadingFavicon ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Icon</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.ico"
                  disabled={uploadingFavicon}
                  className="hidden"
                  onChange={(e) => handleUploadImage(e, "favicon_url")}
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="seo-favicon"
                type="url"
                value={form.favicon_url}
                onChange={(e) => setForm({ ...form, favicon_url: e.target.value })}
                placeholder="Upload favicon or paste URL (.ico / .png)"
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] outline-none focus:border-teal-500/50 transition-all bg-white dark:bg-slate-950"
              />
              {form.favicon_url && (
                <div className="w-10 h-10 shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-center p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.favicon_url} alt="Favicon" className="w-full h-full object-contain" onError={(e) => ((e.target as HTMLElement).style.display = "none")} />
                </div>
              )}
              {form.favicon_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, favicon_url: "" })}
                  className="text-[11px] text-rose-500 hover:text-rose-600 shrink-0 font-medium px-2 py-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Custom browser tab icon. Use .ico or 32x32 PNG.</p>
          </div>
        </div>
      </div>

      {/* Google Search Console */}
      <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <h2 className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Google Search Console Verification</h2>
          </div>
          <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            Open Search Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="seo-gsc-token" className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Verification Token
            </label>
            <input
              id="seo-gsc-token"
              type="text"
              value={form.google_site_verification}
              onChange={(e) => setForm({ ...form, google_site_verification: e.target.value.trim() })}
              placeholder="e.g. abc123XYZ_myverificationcode"
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white dark:bg-slate-950 font-mono"
            />
            <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3 space-y-1.5 text-[12px]">
              <p className="font-semibold text-indigo-700 dark:text-indigo-400">How to get this token:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>Go to Google Search Console and add your subdomain as a property</li>
                <li>Choose HTML tag verification method</li>
                <li>Copy only the content="..." value (the token string)</li>
                <li>Paste it here and save. Your site will be verified automatically.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>


      {/* Bottom Save */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All SEO Settings
        </button>
      </div>
    </form>
  );
}