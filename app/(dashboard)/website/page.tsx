"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe, BookOpen, GraduationCap, Users, Trophy,
  Newspaper, Image, Phone, ChevronRight, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, Eye
} from "lucide-react";
import { useAuth } from "../../context/auth";

interface Section {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  fields: string[];
}

const SECTIONS: Section[] = [
  {
    id: "home_hero",
    label: "Landing Page Editor",
    description: "Manage homepage main titles, taglines, stats highlights, features, facilities, testimonials, and FAQs",
    icon: <Globe className="w-6 h-6" />,
    href: "/website/landing-editor",
    color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
    fields: ["Hero Settings", "Highlights", "Why Choose Us", "Facilities", "Testimonials", "FAQs"],
  },
  {
    id: "about",
    label: "About Us",
    description: "School history, vision, mission, management team & infrastructure",
    icon: <Globe className="w-6 h-6" />,
    href: "/website/about",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    fields: ["History", "Vision & Mission", "Management Team", "Infrastructure"],
  },
  {
    id: "academics",
    label: "Academics",
    description: "Curriculum overview, faculty, class structure & academic calendar",
    icon: <GraduationCap className="w-6 h-6" />,
    href: "/website/academics",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    fields: ["Curriculum", "Faculty Members", "Class Structure", "Academic Calendar"],
  },
  {
    id: "admissions",
    label: "Admissions",
    description: "How to apply, fee structure, documents required & online form link",
    icon: <BookOpen className="w-6 h-6" />,
    href: "/website/admissions",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    fields: ["How to Apply", "Fee Structure", "Documents Required", "Online Form"],
  },
  {
    id: "student_life",
    label: "Student Life",
    description: "Sports, cultural activities, clubs & school achievements",
    icon: <Trophy className="w-6 h-6" />,
    href: "/website/student-life",
    color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    fields: ["Sports & Athletics", "Cultural Activities", "Clubs & Societies", "Achievements"],
  },
  {
    id: "news_notices",
    label: "News & Notices",
    description: "School announcements, circulars, PDFs and result news",
    icon: <Newspaper className="w-6 h-6" />,
    href: "/website/news",
    color: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
    fields: ["Announcements", "Circulars (PDF)", "Results News"],
  },
  {
    id: "gallery",
    label: "Gallery",
    description: "Photo albums and video gallery for the school",
    icon: <Image className="w-6 h-6" />,
    href: "/website/gallery",
    color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    fields: ["Photo Albums", "Video Gallery"],
  },
  {
    id: "contact",
    label: "Contact Us",
    description: "School address, phone, email, map location & social links",
    icon: <Phone className="w-6 h-6" />,
    href: "/website/contact",
    color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
    fields: ["Address", "Phone & Email", "Map Location", "Social Links"],
  },
];

function SectionCard({ section, completeness }: { section: Section; completeness: number }) {
  const isComplete = completeness >= 80;
  const isPartial = completeness > 0 && completeness < 80;

  return (
    <Link href={section.href} className="group block">
      <div className={`relative rounded-2xl border bg-gradient-to-br ${section.color} p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20`}>
        {/* Status dot */}
        <div className="absolute top-4 right-4">
          {isComplete ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Complete
            </span>
          ) : isPartial ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" /> Partial
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-500/10 border border-slate-500/20 px-2.5 py-1 rounded-full">
              Empty
            </span>
          )}
        </div>

        {/* Icon */}
        <div className="mb-4 w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
          {section.icon}
        </div>

        {/* Title & Desc */}
        <h3 className="text-white font-bold text-[16px] mb-1.5 group-hover:text-white">
          {section.label}
        </h3>
        <p className="text-slate-400 text-[12px] leading-relaxed mb-4">
          {section.description}
        </p>

        {/* Fields */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {section.fields.map((f) => (
            <span key={f} className="text-[10px] font-medium text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              {f}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
            <span>Completeness</span>
            <span className={isComplete ? "text-success" : isPartial ? "text-primary" : ""}>{completeness}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 progress-fill ${isComplete ? "!bg-success" : isPartial ? "" : "!bg-slate-600"}`}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors">
            Edit Section →
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}

function calcCompleteness(data: Record<string, unknown> | null | undefined, sectionId: string): number {
  if (!data) return 0;

  if (sectionId === "home_hero") {
    const about = (data as any)["about"] || {};
    const heroKeys = ["hero_tagline", "hero_description", "hero_image_url", "hero_side_image_url", "hero_video_url", "founded_year"];
    let filled = 0;
    let total = heroKeys.length;
    heroKeys.forEach(k => {
      const val = about[k];
      if (typeof val === "string" && val.trim()) filled++;
      else if (typeof val === "number" && val > 0) filled++;
    });
    const arrayKeys = ["highlights", "why_choose_us", "facilities", "testimonials", "faqs"];
    arrayKeys.forEach(k => {
      total++;
      const arr = (data as any)[k];
      if (Array.isArray(arr) && arr.length > 0) filled++;
    });
    return Math.round((filled / total) * 100);
  }

  if (sectionId === "about") {
    const about = (data as any)["about"] || {};
    const aboutKeys = ["history", "history_image_url", "vision", "mission", "infrastructure", "infrastructure_image_url", "management_team"];
    let filled = 0;
    aboutKeys.forEach(k => {
      const val = about[k];
      if (typeof val === "string" && val.trim()) filled++;
      else if (Array.isArray(val) && val.length > 0) filled++;
    });
    return Math.round((filled / aboutKeys.length) * 100);
  }

  if (sectionId === "news_notices") {
    const arr = (data as any)["news_notices"];
    return Array.isArray(arr) && arr.length > 0 ? 100 : 0;
  }

  const section = (data as any)[sectionId];
  if (!section) return 0;

  let filled = 0;
  let total = 0;

  const check = (val: unknown) => {
    total++;
    if (typeof val === "string" && val.trim()) filled++;
    else if (typeof val === "number" && val > 0) filled++;
    else if (Array.isArray(val) && val.length > 0) filled++;
    else if (typeof val === "boolean" && val) filled++;
  };

  for (const [key, value] of Object.entries(section)) {
    if (key === "social") {
      for (const v of Object.values(value as object)) check(v);
    } else {
      check(value);
    }
  }

  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

export default function WebsitePage() {
  const { user } = useAuth();
  const [landingData, setLandingData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }

    fetch("/api/landing", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setLandingData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const overallCompleteness = SECTIONS.reduce((sum, s) => {
    return sum + calcCompleteness(landingData, s.id === "news_notices" ? "news_notices" : s.id);
  }, 0) / SECTIONS.length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Website Content Manager</h1>
          <p className="text-slate-400 text-[13px] mt-1">
            Manage your school's public landing page — what visitors see when they visit your site.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[13px] font-semibold hover:bg-primary/20 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview Site
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Overall Progress */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-bold text-[15px]">Overall Website Completeness</h2>
            <p className="text-slate-400 text-[12px] mt-0.5">
              Fill all sections to make your landing page fully informative.
            </p>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          ) : (
            <span className="text-3xl font-black text-white">{Math.round(overallCompleteness)}%</span>
          )}
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-1000"
            style={{ width: loading ? "0%" : `${overallCompleteness}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 mt-2">
          <span>0%</span>
          <span className="text-slate-400">{SECTIONS.length} sections total</span>
          <span>100%</span>
        </div>
      </div>

      {/* Section Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-slate-400 text-[13px]">Loading content...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {SECTIONS.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              completeness={calcCompleteness(
                landingData,
                section.id
              )}
            />
          ))}
        </div>
      )}

      {/* Quick Tips */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-6">
        <h3 className="text-white font-bold text-[14px] mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Quick Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { tip: "Start with About Us", detail: "First impression matters. Complete the About section first to establish credibility." },
            { tip: "Keep Admissions Updated", detail: "Update fee structure and admission status every academic year." },
            { tip: "Add Gallery Photos", detail: "Visual content increases trust. Upload at least 6-10 school photos." },
          ].map((item) => (
            <div key={item.tip} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <p className="text-white font-semibold text-[13px] mb-1">{item.tip}</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
