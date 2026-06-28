import React from "react";
import { Users, Code, BookOpen, Compass, Heart } from "lucide-react";
import Link from "next/link";

async function getStudentLifeData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.student_life : null;
  } catch { return null; }
}

export default async function StudentLifeClubsPage() {
  const sl = await getStudentLifeData();
  const clubsText = sl?.clubs_societies;
  const clubsImage = sl?.clubs_image_url;
  const heroImage = sl?.hero_image_url;

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section className="relative py-28 bg-white">
        <div className="absolute inset-0">
          <img src={heroImage || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1920&auto=format&fit=crop"} alt="Clubs & Societies" className="w-full h-full object-cover" style={{ filter: "blur(3px)", transform: "scale(1.05)" }} />
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundColor: "color-mix(in oklab, #ffffff6b 90%, transparent)" }} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Student Groups</span>
          <h1 className="text-5xl md:text-6xl  font-bold text-[#231F20] font-sans font-black leading-tight">Clubs & Societies</h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            {/* Left/Middle Column: Details */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-sm">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-[12px] font-bold text-blue-500 uppercase tracking-wider">Extracurricular Interest</h2>
                  <h3 className="text-2xl font-serif font-bold text-[#0F172A]">Clubs and Societies</h3>
                </div>
              </div>

              {clubsText ? (
                <div className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-line border-l-2 border-slate-200 pl-6 py-2">
                  {clubsText}
                </div>
              ) : (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-sm">
                  <p className="text-slate-500 text-[14px]">Clubs and societies details will appear here. Add details in the admin panel under <strong>Website → Student Life</strong>.</p>
                </div>
              )}

              {/* Club categories list */}
              <div className="grid sm:grid-cols-2 gap-6 pt-6">
                <div className="flex gap-4 p-5 bg-slate-50 border border-slate-100 rounded-sm">
                  <div className="shrink-0 w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                    <Code className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A] text-[14px] mb-1">Coding & Tech Club</h4>
                    <p className="text-slate-500 text-[12px] leading-relaxed">Fostering programmatic logic, web creation, and artificial intelligence exploration.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-slate-50 border border-slate-100 rounded-sm">
                  <div className="shrink-0 w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A] text-[14px] mb-1">Literary & Debate Society</h4>
                    <p className="text-slate-500 text-[12px] leading-relaxed">Promoting public speaking, declamation, poetry, and creative writing.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-slate-50 border border-slate-100 rounded-sm">
                  <div className="shrink-0 w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                    <Compass className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A] text-[14px] mb-1">Eco Club</h4>
                    <p className="text-slate-500 text-[12px] leading-relaxed">Leading environmental awareness drives, tree plantation, and waste audits.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-slate-50 border border-slate-100 rounded-sm">
                  <div className="shrink-0 w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A] text-[14px] mb-1">Social Service Guild</h4>
                    <p className="text-slate-500 text-[12px] leading-relaxed">Organizing community outreach, donation drives, and teaching assistance programs.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="bg-white text-white p-8 rounded-sm shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[70px] opacity-20" />
                <h4 className="text-lg font-serif font-bold mb-4 relative z-10 text-white">Join a Club</h4>
                <p className="text-slate-600 text-[13px] leading-relaxed mb-6 relative z-10">
                  Every student is encouraged to participate in at least one club to build specialized skills, network with peers, and follow their passions outside of textbooks.
                </p>
                <div className="text-[12px] text-[#F59E0B] font-bold tracking-wide border-t border-white/10 pt-4 relative z-10">
                  WEEKLY SESSIONS &bull; SKILL SHARING &bull; COMPETITIONS
                </div>
              </div>

              <img src={clubsImage || "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=600&auto=format&fit=crop"} alt="Clubs Meeting" className="w-full h-48 object-cover rounded-sm shadow-md" />
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-100 text-center">
            <Link href="/student-life" className="inline-flex items-center gap-2 text-[#F59E0B] font-bold text-[14px] hover:text-[#D97706] transition-colors">
              &larr; Back to Student Life
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
