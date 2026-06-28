import React from "react";
import { ArrowRight, Play, Users, BookOpen, Trophy, Star } from "lucide-react";

interface HeroData {
  about?: {
    hero_tagline?: string;
    hero_description?: string;
    hero_image_url?: string;
    hero_side_image_url?: string;
    hero_video_url?: string;
    founded_year?: number;
  };
  admissions?: {
    admission_open?: boolean;
    apply_url?: string;
  };
}

export function Hero({ data }: { data?: HeroData | null }) {
  const tagline = data?.about?.hero_tagline || "Excellence in Education & Character";
  const description = data?.about?.hero_description || "A premier institution fostering holistic development, academic rigor, and cultural values to shape the global leaders of tomorrow.";
  const foundedYear = data?.about?.founded_year;
  const sinceLabel = foundedYear ? `Est. ${foundedYear}` : "Est. 1999";
  const applyUrl = data?.admissions?.apply_url || "#admissions";
  const admissionOpen = data?.admissions?.admission_open ?? true;

  const stats = [
    { icon: <Users className="w-5 h-5" />, value: "3500+", label: "Students" },
    { icon: <BookOpen className="w-5 h-5" />, value: "150+", label: "Teachers" },
    { icon: <Trophy className="w-5 h-5" />, value: "98%", label: "Pass Rate" },
    { icon: <Star className="w-5 h-5" />, value: "25+", label: "Years" },
  ];

  return (
    <section id="home" className="relative bg-[#FFFFFF] overflow-hidden">
      
      {/* ── Red Top Accent Bar ─────────────────────────── */}
      <div className="w-full h-1 bg-[var(--primary)]" />

      {/* ── Main Hero Grid ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">

        {/* Left — Text Content */}
        <div className="max-w-2xl">
          
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 border border-[#E0E0E0] bg-[var(--section-alt)] rounded-sm">
            <span className="w-2 h-2 rounded-full bg-[#1FC16B] animate-pulse" />
            <span className="text-[11px] font-bold text-[#5C5D5D] uppercase tracking-widest">
              Admissions Open · {sinceLabel}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl lg:text-6xl font-black text-[#231F20] leading-[1.1] mb-6">
            {tagline.split(" ").slice(0, Math.ceil(tagline.split(" ").length / 2)).join(" ")}
            <br />
            <span className="text-[var(--primary)]">
              {tagline.split(" ").slice(Math.ceil(tagline.split(" ").length / 2)).join(" ")}
            </span>
          </h1>

          {/* Red left-border description */}
          <p className="text-[15px] text-[#666666] mb-8 leading-relaxed font-medium max-w-lg border-l-4 border-[var(--primary)] pl-4">
            {description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
            {admissionOpen ? (
              <a
                href={applyUrl}
                className="w-full sm:w-auto px-8 py-3.5 rounded-sm bg-[var(--primary)] text-white font-bold text-[14px] hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary)]/20 transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                Apply For Admission <ArrowRight className="w-5 h-5" />
              </a>
            ) : (
              <span className="w-full sm:w-auto px-8 py-3.5 rounded-sm bg-[#EFEFEF] text-[#999999] font-bold text-[14px] flex items-center justify-center gap-2 uppercase tracking-wide cursor-not-allowed">
                Admissions Closed
              </span>
            )}
            <a
              href={data?.about?.hero_video_url || "/gallery/videos"}
              target={data?.about?.hero_video_url ? "_blank" : undefined}
              rel={data?.about?.hero_video_url ? "noopener noreferrer" : undefined}
              className="w-full sm:w-auto px-8 py-3.5 rounded-sm border-2 border-[#231F20] text-[#231F20] font-bold text-[14px] hover:bg-[#231F20] hover:text-white transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Play className="w-4 h-4 text-[#FFD700]" fill="currentColor" /> Virtual Tour
            </a>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4 border-t border-[#E0E0E0] pt-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-1 text-[var(--primary)]">{s.icon}</div>
                <div className="text-[22px] font-black text-[#231F20]">{s.value}</div>
                <div className="text-[11px] font-bold text-[#828283] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Image with decorative frame */}
        <div className="relative hidden lg:block">
          {/* Background shape */}
          <div className="absolute -top-6 -right-6 w-full h-full bg-[#EFEFEF] rounded-sm z-0" />
          {/* Red corner accent */}
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[var(--primary)] z-0" />
          {/* Gold dot pattern */}
          <div className="absolute top-4 right-4 w-16 h-16 z-10 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
            ))}
          </div>
          {/* Main Image */}
          <div className="relative z-10 border-4 border-[#FFFFFF] shadow-2xl rounded-sm overflow-hidden">
            <img
              src={data?.about?.hero_side_image_url || "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1200&auto=format&fit=crop"}
              alt="Students studying"
              className="w-full h-[480px] object-cover"
            />
            {/* Bottom caption badge */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#231F20] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-widest mb-0.5">CBSE Affiliated</div>
                <div className="text-[15px] font-black text-white">No. 1234567</div>
              </div>
              <div className="w-px h-10 bg-[#5C5D5D]" />
              <div className="text-right">
                <div className="text-[11px] font-bold text-[#999999] uppercase tracking-widest mb-0.5">School Code</div>
                <div className="text-[15px] font-black text-white">98765</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Bottom Grey Section Divider ────────────────── */}
      <div className="w-full bg-[var(--section-alt)] py-4 border-t border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <span className="text-[12px] font-bold text-[#828283] uppercase tracking-widest">
            Recognized by:
          </span>
          <div className="flex items-center gap-8 text-[12px] font-semibold text-[#5C5D5D] uppercase tracking-wider">
            {["CBSE Board", "ISO Certified", "NAAC Accredited", "Govt. Recognized"].map((tag) => (
              <span key={tag} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
