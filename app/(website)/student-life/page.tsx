import React from "react";
import { Trophy, Music, Users, Star, ChevronRight } from "lucide-react";
import Link from "next/link";

async function getLanding() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export default async function StudentLifePage() {
  const data = await getLanding();
  const sl = data?.student_life;
  const sports = sl?.sports;
  const sportsImage = sl?.sports_image_url;
  const cultural = sl?.cultural_activities;
  const culturalImage = sl?.cultural_image_url;
  const clubs = sl?.clubs_societies;
  const clubsImage = sl?.clubs_image_url;
  const heroImage = sl?.hero_image_url;
  const achievements = sl?.achievements ?? [];

  return (
    <main className="w-full">
      {/* Hero */}
      <section className="relative py-28 bg-white">
        <div className="absolute inset-0">
          <img src={heroImage || "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=1920&auto=format&fit=crop"} alt="Student Life" className="w-full h-full object-cover" style={{ filter: "blur(3px)", transform: "scale(1.05)" }} />
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundColor: "color-mix(in oklab, #ffffff6b 90%, transparent)" }} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Campus Life</span>
          <h1 className="text-5xl md:text-6xl  font-bold text-[#231F20] font-sans font-black leading-tight">Student Life</h1>
        </div>
      </section>

      {/* Content Sections */}
      {sports && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-14 h-14 bg-[#F59E0B]/10 rounded-full flex items-center justify-center mb-6"><Trophy className="w-7 h-7 text-[#F59E0B]" /></div>
              <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Athletics</h2>
              <h3 className="text-3xl font-serif font-bold text-[#0F172A] mb-6">Sports & Athletics</h3>
              <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{sports}</p>
            </div>
            <img src={sportsImage || "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=800&auto=format&fit=crop"} alt="Sports" className="w-full h-72 object-cover rounded-sm shadow-xl" />
          </div>
        </section>
      )}

      {cultural && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
            <img src={culturalImage || "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=800&auto=format&fit=crop"} alt="Cultural" className="w-full h-72 object-cover rounded-sm shadow-xl order-2 lg:order-1" />
            <div className="order-1 lg:order-2">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-6"><Music className="w-7 h-7 text-purple-500" /></div>
              <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Arts</h2>
              <h3 className="text-3xl font-serif font-bold text-[#0F172A] mb-6">Cultural Activities</h3>
              <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{cultural}</p>
            </div>
          </div>
        </section>
      )}

      {clubs && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-6"><Users className="w-7 h-7 text-blue-500" /></div>
              <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Extracurriculars</h2>
              <h3 className="text-3xl font-serif font-bold text-[#0F172A] mb-6">Clubs & Societies</h3>
              <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{clubs}</p>
            </div>
            <img src={clubsImage || "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop"} alt="Clubs" className="w-full h-72 object-cover rounded-sm shadow-xl" />
          </div>
        </section>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Our Pride</h2>
              <h3 className="text-3xl font-serif font-bold text-white">Achievements</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((a: any, i: number) => (
                <div key={a._id ?? i} className="bg-white/5 border border-white/10 rounded-sm p-6 hover:bg-primary/10 hover:border-[var(--primary)]/20 transition-all">
                  <Star className="w-6 h-6 text-primary mb-3" />
                  <span className="text-primary text-[12px] font-bold uppercase tracking-widest">{a.year}</span>
                  <h4 className="text-white font-bold text-[15px] mt-1 mb-2">{a.title}</h4>
                  {a.description && <p className="text-slate-600 text-[13px] leading-relaxed">{a.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fallback + Quick Links */}
      {!sports && !cultural && !clubs && achievements.length === 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className="text-slate-600">Student life content will appear here. Add it from <strong>Admin → Website → Student Life</strong>.</p>
          </div>
        </section>
      )}

      <section className="py-14 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: "/student-life/sports", label: "Sports" },
              { href: "/student-life/cultural", label: "Cultural Activities" },
              { href: "/student-life/clubs", label: "Clubs & Societies" },
              { href: "/student-life/achievements", label: "Achievements" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-sm hover:border-[#F59E0B] hover:shadow-md transition-all group">
                <span className="text-[#0F172A] font-bold text-[14px]">{l.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#F59E0B]" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
