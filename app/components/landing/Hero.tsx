"use client";

import React from "react";
import { ArrowRight, Play } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";

interface HeroStat {
  value: string;
  label: string;
  icon: string;
}

interface HeroData {
  about?: {
    hero_tagline?: string;
    hero_description?: string;
    hero_image_url?: string;
    hero_side_image_url?: string;
    hero_video_url?: string;
    founded_year?: number;
    hero_stats?: HeroStat[];
    affiliation_name?: string;
    affiliation_number?: string;
    school_code?: string;
    recognition_tags?: string[];
    admission_year_label?: string;
  };
  admissions?: {
    admission_open?: boolean;
    apply_url?: string;
  };
}

function renderStatIcon(iconName: string) {
  const IconComponent = (LucideIcons as any)[iconName];
  if (IconComponent) return <IconComponent className="w-6 h-6" />;
  return <span className="text-xl leading-none">{iconName}</span>;
}

export function Hero({ data }: { data?: HeroData | null }) {
  const about = data?.about;
  const admissions = data?.admissions;

  const tagline = about?.hero_tagline || "Welcome to Our School";
  const description = about?.hero_description;
  const foundedYear = about?.founded_year;
  const applyUrl = admissions?.apply_url || "#admissions";
  const admissionOpen = admissions?.admission_open;
  const heroStats = about?.hero_stats?.filter(s => s.value && s.label) ?? [];
  const admissionYearLabel = about?.admission_year_label?.trim();
  const videoUrl = about?.hero_video_url?.trim();
  const imageUrl = about?.hero_image_url?.trim() || "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop";

  const showHeroBadge = (admissionOpen || foundedYear || admissionYearLabel);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-sidebar">
      
      {/* Background Image / Video */}
      <div className="absolute inset-0 z-0">
        <img
          src={imageUrl}
          alt="Campus"
          className="w-full h-full object-cover opacity-60 scale-105"
        />
        {/* Dynamic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-sidebar/60 via-primary/40 to-sidebar/90" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32 flex flex-col items-center text-center">
        
        {showHeroBadge && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 px-6 py-2 mb-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl"
          >
            {admissionOpen && (
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_var(--success)]" />
            )}
            <span className="text-sm font-semibold text-white tracking-widest uppercase">
              {admissionOpen && "Admissions Open"}
              {admissionOpen && (foundedYear || admissionYearLabel) && " • "}
              {admissionYearLabel ? admissionYearLabel : foundedYear ? `Est. ${foundedYear}` : ""}
            </span>
          </motion.div>
        )}

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white mb-6 leading-tight max-w-4xl drop-shadow-sm"
        >
          {tagline}
        </motion.h1>

        {description && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl leading-relaxed font-light"
          >
            {description}
          </motion.p>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-6 mb-16"
        >
          {admissionOpen && (
            <a
              href={applyUrl}
              className="px-8 py-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-base hover:shadow-[0_0_20px_var(--primary)] transition-all duration-300 flex items-center justify-center gap-2"
            >
              Apply For Admission <ArrowRight className="w-5 h-5" />
            </a>
          )}
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-base hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Play className="w-4 h-4 text-white ml-1" fill="currentColor" />
              </div>
              Virtual Tour
            </a>
          )}
        </motion.div>

        {heroStats.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {heroStats.slice(0,4).map((s, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1 duration-300">
                <div className="flex justify-center mb-3 text-[color-mix(in_srgb,var(--primary)_40%,white)]">
                  {renderStatIcon(s.icon)}
                </div>
                <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs font-semibold text-white/70 uppercase tracking-wider text-center">{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

    </section>
  );
}
