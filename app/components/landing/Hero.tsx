import React from "react";
import { ArrowRight, Play } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface HeroData {
  about?: {
    hero_tagline?: string;
    hero_description?: string;
    hero_image_url?: string;
    hero_side_image_url?: string;
    hero_video_url?: string;
    founded_year?: number;
    hero_stats?: Array<{ value: string; label: string; icon: string }>;
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
  if (IconComponent) return <IconComponent className="w-5 h-5" />;
  // If it's an emoji or other character, just render as text
  return <span className="text-lg leading-none">{iconName}</span>;
}

export function Hero({ data, backgroundImage }: { data?: HeroData | null; backgroundImage?: string }) {
  const about = data?.about;
  const admissions = data?.admissions;

  const tagline = about?.hero_tagline;
  const description = about?.hero_description;
  const foundedYear = about?.founded_year;
  const applyUrl = admissions?.apply_url || "#admissions";
  const admissionOpen = admissions?.admission_open;
  const heroStats = about?.hero_stats?.filter(s => s.value && s.label) ?? [];
  const affiliationName = about?.affiliation_name?.trim();
  const affiliationNumber = about?.affiliation_number?.trim();
  const schoolCode = about?.school_code?.trim();
  const recognitionTags = (about?.recognition_tags ?? []).filter(Boolean);
  const admissionYearLabel = about?.admission_year_label?.trim();
  const videoUrl = about?.hero_video_url?.trim();
  const sideImageUrl = about?.hero_side_image_url?.trim();

  // If tagline is empty, nothing to show in hero heading
  const taglineWords = tagline ? tagline.split(" ") : [];
  const splitIndex = Math.max(1, taglineWords.length - 3);
  const firstLine = taglineWords.slice(0, splitIndex).join(" ");
  const secondLine = taglineWords.slice(splitIndex).join(" ");

  const showAffiliationBadge = sideImageUrl && (affiliationName || affiliationNumber || schoolCode);
  const showBottomBar = recognitionTags.length > 0;
  const showHeroBadge = (admissionOpen || foundedYear || admissionYearLabel);

  const sectionStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-white"
      style={sectionStyle}
    >
      {/* Semi-transparent white overlay to keep text highly readable if bg image exists */}
      {backgroundImage && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundColor: "color-mix(in oklab, #ffffff6b 90%, transparent)" }}
        />
      )}

      {/* ── Red Top Accent Bar ─────────────────────────── */}
      <div className="relative z-10 w-full h-1 bg-[var(--primary)]" />

      {/* ── Main Hero Grid ─────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">

        {/* Left — Text Content */}
        <div className="max-w-2xl">

          {/* Top Badge — only if at least one piece of info is available */}
          {showHeroBadge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 border border-[#E0E0E0] bg-[var(--section-alt)] rounded-sm">
              {admissionOpen && (
                <span className="w-2 h-2 rounded-full bg-[#1FC16B] animate-pulse" />
              )}
              <span className="text-[11px] font-bold text-[#5C5D5D] uppercase tracking-widest">
                {admissionOpen && "Admissions Open"}
                {admissionOpen && (foundedYear || admissionYearLabel) && " · "}
                {admissionYearLabel
                  ? admissionYearLabel
                  : foundedYear
                  ? `Est. ${foundedYear}`
                  : ""}
              </span>
            </div>
          )}

          {/* Heading — only if tagline exists */}
          {tagline && (
            <h1 className="text-4xl lg:text-6xl font-black text-[#231F20] leading-[1.1] mb-6">
              {firstLine}
              <br />
              <span className="text-[var(--primary)]">{secondLine}</span>
            </h1>
          )}

          {/* Description */}
          {description && (
            <p className="text-[15px] text-[#666666] mb-8 leading-relaxed font-medium max-w-lg border-l-4 border-[var(--primary)] pl-4">
              {description}
            </p>
          )}

          {/* CTA Buttons */}
          {(admissionOpen || videoUrl) && (
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
              {admissionOpen && (
                <a
                  href={applyUrl}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-sm bg-[var(--primary)] text-white font-bold text-[14px] hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary)]/20 transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  Apply For Admission <ArrowRight className="w-5 h-5" />
                </a>
              )}
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-sm border-2 border-[#231F20] text-[#231F20] font-bold text-[14px] hover:bg-[#231F20] hover:text-white transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <Play className="w-4 h-4 text-[#FFD700]" fill="currentColor" /> Virtual Tour
                </a>
              )}
            </div>
          )}

          {/* Stats Row — only from DB */}
          {heroStats.length > 0 && (
            <div className={`grid grid-cols-${Math.min(heroStats.length, 4)} gap-4 border-t border-[#E0E0E0] pt-8`}>
              {heroStats.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center mb-1 text-[var(--primary)]">
                    {renderStatIcon(s.icon)}
                  </div>
                  <div className="text-[22px] font-black text-[#231F20]">{s.value}</div>
                  <div className="text-[11px] font-bold text-[#828283] uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Image with decorative frame (only if side image uploaded) */}
        {sideImageUrl && (
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
                src={sideImageUrl}
                alt="School campus"
                loading="lazy"
                className="w-full h-[480px] object-cover"
              />
              {/* Bottom caption badge — only if affiliation/school data exists */}
              {showAffiliationBadge && (
                <div className="absolute bottom-0 left-0 right-0 bg-[#231F20] text-white px-6 py-4 flex items-center justify-between">
                  {(affiliationName || affiliationNumber) && (
                    <div>
                      {affiliationName && (
                        <div className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-widest mb-0.5">
                          {affiliationName} Affiliated
                        </div>
                      )}
                      {affiliationNumber && (
                        <div className="text-[15px] font-black text-white">No. {affiliationNumber}</div>
                      )}
                    </div>
                  )}
                  {(affiliationName || affiliationNumber) && schoolCode && (
                    <div className="w-px h-10 bg-[#5C5D5D]" />
                  )}
                  {schoolCode && (
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-[#999999] uppercase tracking-widest mb-0.5">School Code</div>
                      <div className="text-[15px] font-black text-white">{schoolCode}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
