import React from "react";
import { ArrowRight, Play } from "lucide-react";

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

<<<<<<< Updated upstream
export function Hero({ data }: { data?: HeroData | null }) {
  const tagline = data?.about?.hero_tagline || "Excellence in Education & Character";
  const description = data?.about?.hero_description || "A premium CBSE institution fostering holistic development, academic rigor, and cultural values to shape the global leaders of tomorrow.";
  const foundedYear = data?.about?.founded_year;
  const sinceLabel = foundedYear
    ? `Empowering Minds Since ${foundedYear}`
    : "Empowering Minds Since 1999";
  const applyUrl = data?.admissions?.apply_url || "#admissions";
  const admissionOpen = data?.admissions?.admission_open ?? true;
=======
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
>>>>>>> Stashed changes

  const sectionStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
<<<<<<< Updated upstream
    <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[#0F172A]">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/90 to-transparent z-10" />
        <img 
          src={data?.about?.hero_image_url || "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=1920&auto=format&fit=crop"} 
          alt="Majestic School Campus" 
          className="w-full h-full object-cover opacity-50"
        />
=======
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
>>>>>>> Stashed changes
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Content */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[#F59E0B]/20 text-[#FDBA74] font-bold text-[13px] mb-8 border border-[#F59E0B]/30 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
            {sinceLabel}
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-serif font-bold text-white leading-[1.15] mb-6">
            {tagline.includes("&") || tagline.includes(" ") ? (
              <>
                {tagline.split(" ").slice(0, Math.ceil(tagline.split(" ").length / 2)).join(" ")} <br/>
                <span className="text-[#F59E0B]">
                  {tagline.split(" ").slice(Math.ceil(tagline.split(" ").length / 2)).join(" ")}
                </span>
              </>
            ) : (
              <span className="text-[#F59E0B]">{tagline}</span>
            )}
          </h1>
          
          <p className="text-lg text-slate-300 mb-10 leading-relaxed font-medium max-w-lg border-l-4 border-[#F59E0B] pl-4">
            {description}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {admissionOpen ? (
              <a
                href={applyUrl}
                className="w-full sm:w-auto px-8 py-4 rounded-sm bg-[#F59E0B] text-white font-bold text-[15px] hover:bg-[#D97706] shadow-xl shadow-[#F59E0B]/20 transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                Apply For Admission <ArrowRight className="w-5 h-5" />
              </a>
            ) : (
              <span className="w-full sm:w-auto px-8 py-4 rounded-sm bg-slate-700 text-slate-400 font-bold text-[15px] flex items-center justify-center gap-2 uppercase tracking-wide cursor-not-allowed">
                Admissions Closed
              </span>
            )}
            <a
              href={data?.about?.hero_video_url || "/gallery/videos"}
              target={data?.about?.hero_video_url ? "_blank" : undefined}
              rel={data?.about?.hero_video_url ? "noopener noreferrer" : undefined}
              className="w-full sm:w-auto px-8 py-4 rounded-sm bg-white/10 text-white font-bold text-[15px] border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Play className="w-5 h-5 text-[#F59E0B]" fill="currentColor" /> Virtual Tour
            </a>
          </div>
        </div>
        
        {/* Right Image/Badge Overlay */}
        <div className="relative hidden lg:block">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#F59E0B] rounded-full blur-[100px] opacity-30" />
          <div className="relative border-8 border-white/10 rounded-sm overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500 shadow-2xl">
            <img 
              src={data?.about?.hero_side_image_url || "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1200&auto=format&fit=crop"} 
              alt="Indian students studying" 
              className="w-full h-[500px] object-cover"
            />
          </div>
        </div>
        
      </div>
    </section>
  );
}
