import React from "react";
import { CheckCircle2, Calendar, MapPin, Eye, Target, Users } from "lucide-react";

async function getAboutData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function AboutPage() {
  const data = await getAboutData();
  const about = data?.about;

  const tagline = about?.hero_tagline || "Nurturing Excellence, Rooted in Tradition";
  const history = about?.history || "";
  const vision = about?.vision || "";
  const mission = about?.mission || "";
  const foundedYear = about?.founded_year;
  const infrastructure = about?.infrastructure || "";
  const team = about?.management_team ?? [];
  const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Our School";
  const yearsLegacy = foundedYear ? new Date().getFullYear() - foundedYear : null;

  return (
    <main className="w-full">

      {/* ── Hero Banner ── */}
      <section className="relative py-32 bg-[var(--sidebar-bg)] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={about?.hero_image_url || "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1920&auto=format&fit=crop"}
            alt="School Building"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 to-[#0F172A]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-primary/20 border border-primary/30 text-[#FCA5A5] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">
            About Us
          </span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight mb-4">
            {tagline}
          </h1>
          {foundedYear && (
            <p className="text-slate-400 text-[15px] mt-4 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Established in {foundedYear} · {yearsLegacy}+ Years of Excellence
            </p>
          )}
        </div>
      </section>

      {/* ── Our Story ── */}
      {history && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Our Story</h2>
                <h3 className="text-4xl font-serif font-bold text-foreground mb-6">Our History</h3>
                <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{history}</p>
              </div>
              <div className="relative">
                <img
                  src={about?.history_image_url || "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop"}
                  alt="School History"
                  className="w-full h-[400px] object-cover rounded-sm shadow-xl"
                />
                {foundedYear && (
                  <div className="absolute -bottom-6 -left-6 bg-[var(--sidebar-bg)] text-white p-6 rounded-sm shadow-xl border-b-4 border-primary">
                    <span className="text-4xl font-serif font-black text-primary block">{foundedYear}</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Year Founded</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Vision & Mission ── */}
      {(vision || mission) && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Our Purpose</h2>
              <h3 className="text-4xl font-serif font-bold text-foreground">Vision & Mission</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              {vision && (
                <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-md border-t-4 border-t-primary">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <Eye className="w-7 h-7 text-primary" />
                  </div>
                  <h4 className="text-2xl font-serif font-bold text-foreground mb-4">Our Vision</h4>
                  <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{vision}</p>
                </div>
              )}
              {mission && (
                <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-md border-t-4 border-t-[#0F172A]">
                  <div className="w-14 h-14 bg-[var(--sidebar-bg)]/10 rounded-full flex items-center justify-center mb-6">
                    <Target className="w-7 h-7 text-foreground" />
                  </div>
                  <h4 className="text-2xl font-serif font-bold text-foreground mb-4">Our Mission</h4>
                  <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{mission}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Infrastructure ── */}
      {infrastructure && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 lg:order-1">
                <img
                  src={about?.infrastructure_image_url || "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=800&auto=format&fit=crop"}
                  alt="School Infrastructure"
                  className="w-full h-[400px] object-cover rounded-sm shadow-xl"
                />
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Our Campus</h2>
                <h3 className="text-4xl font-serif font-bold text-foreground mb-6">Infrastructure</h3>
                <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{infrastructure}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Management Team ── */}
      {team.length > 0 && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Leadership</h2>
              <h3 className="text-4xl font-serif font-bold text-foreground">Management Team</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map((member: any, idx: number) => (
                <div key={member._id ?? idx} className="bg-white rounded-sm border border-slate-200 shadow-md overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-64 overflow-hidden bg-slate-100 relative">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-16 h-16 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
                  </div>
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-foreground">{member.name}</h4>
                    <p className="text-primary text-[12px] font-bold uppercase tracking-widest mb-3">{member.position}</p>
                    {member.bio && (
                      <p className="text-slate-500 text-[13px] leading-relaxed">{member.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Fallback when no data ── */}
      {!history && !vision && !mission && !infrastructure && team.length === 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Content Coming Soon</h2>
            <p className="text-slate-500">
              About content is being updated. Please visit the admin panel under{" "}
              <strong>Website → About</strong> to add your school details.
            </p>
          </div>
        </section>
      )}

    </main>
  );
}
