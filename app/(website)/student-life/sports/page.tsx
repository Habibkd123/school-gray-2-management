import React from "react";
import { Trophy, Activity, Medal, Target, Shield } from "lucide-react";
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

export default async function StudentLifeSportsPage() {
  const sl = await getStudentLifeData();
  const sportsText = sl?.sports;
  const sportsImage = sl?.sports_image_url;
  const heroImage = sl?.hero_image_url;

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section className="relative py-28 bg-[#0F172A]">
        <div className="absolute inset-0">
          <img src={heroImage || "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1920&auto=format&fit=crop"} alt="Sports & Athletics" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 to-[#0F172A]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-[#1E3A5F]/20 border border-[#1E3A5F]/30 text-[#FCA5A5] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Athletic Program</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">Sports & Athletics</h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            {/* Left/Middle Column: Details */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#1E3A5F]/10 rounded-sm">
                  <Trophy className="w-6 h-6 text-[#1E3A5F]" />
                </div>
                <div>
                  <h2 className="text-[12px] font-bold text-[#1E3A5F] uppercase tracking-wider">Physical Development</h2>
                  <h3 className="text-2xl font-serif font-bold text-[#0F172A]">Sports at Our Campus</h3>
                </div>
              </div>

              {sportsText ? (
                <div className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-line border-l-2 border-slate-200 pl-6 py-2">
                  {sportsText}
                </div>
              ) : (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-sm">
                  <p className="text-slate-500 text-[14px]">Sports and athletics program details will appear here. Add details in the admin panel under <strong>Website → Student Life</strong>.</p>
                </div>
              )}

              {/* Extra visual highlights */}
              <div className="grid sm:grid-cols-2 gap-6 pt-6">
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-sm">
                  <Activity className="w-8 h-8 text-[#0F172A] mb-4" />
                  <h4 className="font-bold text-[#0F172A] mb-2 text-[15px]">State-of-the-Art Infrastructure</h4>
                  <p className="text-slate-600 text-[13px] leading-relaxed">Access to multi-sport courts, football turf, running tracks, and professional coaching staffs.</p>
                </div>
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-sm">
                  <Medal className="w-8 h-8 text-[#0F172A] mb-4" />
                  <h4 className="font-bold text-[#0F172A] mb-2 text-[15px]">Competitive Leagues</h4>
                  <p className="text-slate-600 text-[13px] leading-relaxed">Our teams regularly participate and win laurels in regional, state, and national level school meets.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Callouts */}
            <div className="space-y-6">
              <div className="bg-[#0F172A] text-white p-8 rounded-sm shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#1E3A5F] rounded-full blur-[70px] opacity-20" />
                <h4 className="text-lg font-serif font-bold mb-4 relative z-10 text-white">Our Athletic Philosophy</h4>
                <p className="text-slate-400 text-[13px] leading-relaxed mb-6 relative z-10">
                  We believe physical education and sports are integral to character building. Teamwork, discipline, resilience, and respect are cultivated on our sports fields daily.
                </p>
                <div className="space-y-3 relative z-10 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-3 text-[13px]">
                    <Target className="w-4 h-4 text-[#1E3A5F]" />
                    <span>Focus on Fitness & Wellness</span>
                  </div>
                  <div className="flex items-center gap-3 text-[13px]">
                    <Shield className="w-4 h-4 text-[#1E3A5F]" />
                    <span>Certified Physical Coaches</span>
                  </div>
                </div>
              </div>

              <img src={sportsImage || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=600&auto=format&fit=crop"} alt="Runners" className="w-full h-48 object-cover rounded-sm shadow-md" />
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-100 text-center">
            <Link href="/student-life" className="inline-flex items-center gap-2 text-[#1E3A5F] font-bold text-[14px] hover:text-[#162C47] transition-colors">
              &larr; Back to Student Life
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
