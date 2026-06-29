"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Phone, CheckCircle2, AlertCircle, MapPin, Mail, Globe } from "lucide-react";
import { FileUploadField } from "../../../components/ui/FileUploadField";

const YoutubeIcon = () => (
  <svg className="w-3.5 h-3.5 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);

// Inline SVG social icons (lucide-react version doesn't include these)
const FacebookIcon = () => (
  <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const TwitterIcon = () => (
  <svg className="w-3.5 h-3.5 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg className="w-3.5 h-3.5 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

interface ContactData {
  address: string;
  phone: string;
  email: string;
  website: string;
  map_embed_url: string;
  hero_image_url: string;
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
  };
}

const defaultData: ContactData = {
  address: "",
  phone: "",
  email: "",
  website: "",
  map_embed_url: "",
  hero_image_url: "",
  social: { facebook: "", twitter: "", instagram: "", youtube: "" },
};

function InputField({ label, value, onChange, placeholder = "", type = "text", icon }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        {icon} {label}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all" />
    </div>
  );
}

export default function ContactPage() {
  const [data, setData] = useState<ContactData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data?.contact) setData({ ...defaultData, ...res.data.contact, social: { ...defaultData.social, ...res.data.contact.social } }); })
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
        body: JSON.stringify({ section: "contact", data }),
      });
      setStatus((await res.json()).success ? "success" : "error");
    } catch { setStatus("error"); }
    finally { setSaving(false); setTimeout(() => setStatus("idle"), 3000); }
  };

  const upd = (key: keyof Omit<ContactData, "social">) => (v: string) => setData((p) => ({ ...p, [key]: v }));
  const updSocial = (key: keyof ContactData["social"]) => (v: string) => setData((p) => ({ ...p, social: { ...p.social, [key]: v } }));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/website" className="p-2 rounded-lg hover:bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:text-slate-600 dark:text-slate-500 dark:text-slate-400 dark:hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><Phone className="w-5 h-5 text-indigo-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Contact Us</h1>
            <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400 text-[12px]">School address, phone, email, map & social links</p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {status === "success" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium"><CheckCircle2 className="w-4 h-4" /> Saved!</div>}
      {status === "error" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium"><AlertCircle className="w-4 h-4" /> Failed.</div>}

      {/* Contact Details */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Contact Details</h2>
        <FileUploadField
          label="Hero Banner Image"
          value={data.hero_image_url || ""}
          onChange={upd("hero_image_url")}
          accept="image/*"
          placeholder="Upload or paste image URL for Contact page hero banner..."
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Address
          </label>
          <textarea value={data.address} onChange={(e) => setData((p) => ({ ...p, address: e.target.value }))} rows={3}
            placeholder="e.g. 123 Education Lane, Knowledge Nagar, New Delhi - 110001"
            className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField label="Phone Number" value={data.phone} onChange={upd("phone")} placeholder="+91 98765 43210" type="tel" icon={<Phone className="w-3.5 h-3.5" />} />
          <InputField label="Email Address" value={data.email} onChange={upd("email")} placeholder="info@yourschool.edu.in" type="email" icon={<Mail className="w-3.5 h-3.5" />} />
          <InputField label="Website URL" value={data.website} onChange={upd("website")} placeholder="https://yourschool.edu.in" type="url" icon={<Globe className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* Google Maps Embed */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Google Maps Embed</h2>
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-[11px] text-slate-600 dark:text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-700 dark:text-slate-300">How to get embed URL:</strong><br />
          1. Open Google Maps → Search your school<br />
          2. Click Share → Embed a map → Copy the src URL from the iframe code
        </div>
        <InputField label="Google Maps Embed URL" value={data.map_embed_url} onChange={upd("map_embed_url")} placeholder="https://www.google.com/maps/embed?pb=..." type="url" icon={<MapPin className="w-3.5 h-3.5" />} />
        {data.map_embed_url && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-48">
            <iframe src={data.map_embed_url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}
      </div>

      {/* Social Links */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-slate-900 dark:text-white font-bold text-[14px] border-b border-slate-200 dark:border-slate-700 pb-3">Social Media Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FacebookIcon /> Facebook
            </label>
            <input type="url" value={data.social.facebook} onChange={(e) => updSocial("facebook")(e.target.value)} placeholder="https://facebook.com/yourschool"
              className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TwitterIcon /> Twitter / X
            </label>
            <input type="url" value={data.social.twitter} onChange={(e) => updSocial("twitter")(e.target.value)} placeholder="https://twitter.com/yourschool"
              className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <InstagramIcon /> Instagram
            </label>
            <input type="url" value={data.social.instagram} onChange={(e) => updSocial("instagram")(e.target.value)} placeholder="https://instagram.com/yourschool"
              className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <YoutubeIcon /> YouTube
            </label>
            <input type="url" value={data.social.youtube} onChange={(e) => updSocial("youtube")(e.target.value)} placeholder="https://youtube.com/@yourschool"
              className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Contact Info"}
        </button>
      </div>
    </div>
  );
}
