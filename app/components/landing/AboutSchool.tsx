import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface AboutData {
  hero_tagline?: string;
  history?: string;
  history_image_url?: string;
  vision?: string;
  mission?: string;
  founded_year?: number;
  infrastructure?: string;
  infrastructure_image_url?: string;
  management_team?: Array<{
    _id?: string;
    name: string;
    position: string;
    bio: string;
    photo_url: string;
  }>;
}

const DEFAULT_POINTS = [
  "Strict adherence to CBSE curriculum & guidelines",
  "Integration of traditional Indian values with global standards",
  "Dedicated foundation coaching for IIT-JEE & NEET",
  "State-of-the-art infrastructure for holistic development",
];

export function AboutSchool({ data }: { data?: AboutData | null }) {
  const history = data?.history || "";
  const tagline = data?.hero_tagline || "Nurturing Excellence, Rooted in Tradition";
  const foundedYear = data?.founded_year;
  const infrastructure = data?.infrastructure || "";

  // Build dynamic points from available data
  const points = infrastructure
    ? [
        ...(history ? [history.slice(0, 120) + (history.length > 120 ? "..." : "")] : []),
        ...(data?.vision ? [`Vision: ${data.vision.slice(0, 80)}...`] : []),
        ...(infrastructure ? [infrastructure.slice(0, 120) + (infrastructure.length > 120 ? "..." : "")] : []),
      ].filter(Boolean).slice(0, 4)
    : DEFAULT_POINTS;

  const displayPoints = points.length >= 2 ? points : DEFAULT_POINTS;
  const yearsLegacy = foundedYear
    ? `${new Date().getFullYear() - foundedYear}+`
    : "25+";

  return (
    <section id="about" className="py-24 bg-slate-50 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-full sm:w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Image Grid */}
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-[120%] h-[120%] bg-[var(--sidebar-bg)]/5 rounded-full -z-10 border border-[var(--sidebar-bg)]/10" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <img
                src={data?.history_image_url || "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop"}
                alt="School Building"
                className="w-full h-[320px] object-cover rounded-sm shadow-xl"
              />
              <div className="flex flex-col gap-4 pt-12">
                <img
                  src={data?.infrastructure_image_url || "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1000&auto=format&fit=crop"}
                  alt="Students studying"
                  className="w-full h-[200px] object-cover rounded-sm shadow-xl"
                />
                {/* Year Badge */}
                <div className="bg-[var(--sidebar-bg)] text-white p-6 rounded-sm shadow-xl flex flex-col items-center justify-center h-[104px] border-b-4 border-primary">
                  <span className="text-3xl font-serif font-black text-primary">{yearsLegacy}</span>
                  <span className="text-[11px] font-bold opacity-90 uppercase tracking-widest mt-1">Years Legacy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="max-w-xl">
            <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">
              {process.env.NEXT_PUBLIC_SCHOOL_NAME || "About Our School"}
            </h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
              {tagline}
            </h3>
            <p className="text-[15px] text-slate-600 leading-relaxed mb-8">
              {history ||
                "Welcome to our school, a premier institution committed to providing a transformative educational experience that combines rigorous academic standards with rich cultural values, preparing our students to excel in a rapidly changing world."}
            </p>

            <ul className="space-y-4 mb-10">
              {displayPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-700 font-medium text-[14px]">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <a
              href="#contact"
              className="px-8 py-3.5 rounded-sm bg-primary text-white font-bold text-[14px] hover:bg-[var(--primary-hover)] shadow-xl transition-all duration-300 flex items-center gap-2 uppercase tracking-wide w-fit"
            >
              Learn More <ArrowRight className="w-4 h-4 text-primary" />
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
