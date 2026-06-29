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

export function AboutSchool({ data }: { data?: AboutData | null }) {
  const history = data?.history;
  const tagline = data?.hero_tagline;
  const foundedYear = data?.founded_year;
  const infrastructure = data?.infrastructure;
  const vision = data?.vision;
  const mission = data?.mission;
  const managementTeam = data?.management_team ?? [];
  const historyImageUrl = data?.history_image_url;
  const infrastructureImageUrl = data?.infrastructure_image_url;

  const points = [
    ...(history ? [history.slice(0, 120) + (history.length > 120 ? "..." : "")] : []),
    ...(vision ? [`Vision: ${vision.slice(0, 80)}${vision.length > 80 ? "..." : ""}`] : []),
    ...(infrastructure ? [infrastructure.slice(0, 120) + (infrastructure.length > 120 ? "..." : "")] : []),
  ].filter(Boolean).slice(0, 4);

  const yearsLegacy = foundedYear ? `${new Date().getFullYear() - foundedYear}+` : undefined;

  if (!tagline && !history && !vision && !infrastructure && !managementTeam.length) {
    return null;
  }

  return (
    <section id="about" className="py-24 bg-slate-50 overflow-hidden relative dark:bg-slate-800/50">
      <div className="absolute top-0 right-0 w-full sm:w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Top Grid: School Images + Tagline & Story */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-[120%] h-[120%] bg-[var(--sidebar-bg)]/5 rounded-full -z-10 border border-[var(--sidebar-bg)]/10" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyImageUrl && (
                <img
                  src={historyImageUrl}
                  alt="School Building"
                  className="w-full h-[320px] object-cover rounded-sm shadow-xl"
                />
              )}
              <div className="flex flex-col gap-4 pt-12">
                {infrastructureImageUrl && (
                  <img
                    src={infrastructureImageUrl}
                    alt="School infrastructure"
                    className="w-full h-[200px] object-cover rounded-sm shadow-xl"
                  />
                )}
                {yearsLegacy && (
                  <div className="bg-[var(--sidebar-bg)] text-white p-6 rounded-sm shadow-xl flex flex-col items-center justify-center h-[104px] border-b-4 border-primary">
                    <span className="text-3xl font-serif font-black text-primary">{yearsLegacy}</span>
                    <span className="text-[11px] font-bold opacity-90 uppercase tracking-widest mt-1">Years Legacy</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-xl">
            {tagline && (
              <h3 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
                {tagline}
              </h3>
            )}
            {history && (
              <p className="text-[15px] text-slate-600 leading-relaxed mb-8 dark:text-slate-300">
                {history}
              </p>
            )}
            {points.length > 0 && (
              <ul className="space-y-4">
                {points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-700 font-medium text-[14px] dark:text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom Section: Vision & Mission side-by-side */}
        {(vision || mission) && (
          <div className="grid md:grid-cols-2 gap-8 border-t border-slate-200 dark:border-slate-800 pt-12 mb-16">
            {vision && (
              <div className="bg-white p-8 rounded-sm border border-slate-200 shadow-md border-t-4 border-t-primary dark:bg-slate-900 dark:border-slate-800">
                <h4 className="text-xl font-serif font-bold text-foreground mb-3">Our Vision</h4>
                <p className="text-[15px] text-slate-600 leading-relaxed dark:text-slate-300">{vision}</p>
              </div>
            )}
            {mission && (
              <div className="bg-white p-8 rounded-sm border border-slate-200 shadow-md border-t-4 border-t-[var(--sidebar-bg)] dark:bg-slate-900 dark:border-slate-800">
                <h4 className="text-xl font-serif font-bold text-foreground mb-3">Our Mission</h4>
                <p className="text-[15px] text-slate-600 leading-relaxed dark:text-slate-300">{mission}</p>
              </div>
            )}
          </div>
        )}

        {/* Leadership Team: full width with up to 3 columns */}
        {(managementTeam?.length ?? 0) > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-12">
            <h4 className="text-2xl font-serif font-bold text-foreground text-center mb-10">Leadership Team</h4>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {managementTeam.map((member) => (
                <div key={member._id?.toString() ?? member.name} className="bg-white rounded-sm p-6 border border-slate-200 shadow-md hover:shadow-lg transition-shadow dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center gap-4 mb-4">
                    {member.photo_url && (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-primary shrink-0"
                      />
                    )}
                    <div>
                      <p className="font-bold text-foreground leading-snug">{member.name}</p>
                      <p className="text-primary text-[12px] font-bold uppercase tracking-wider mt-0.5">{member.position}</p>
                    </div>
                  </div>
                  <p className="text-slate-600 text-[13.5px] leading-relaxed dark:text-slate-300">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
