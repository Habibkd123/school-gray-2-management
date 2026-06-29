import React from "react";
import { Music, Palette, Theater, Mic, Sparkles } from "lucide-react";
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

export default async function StudentLifeCulturalPage() {
  const sl = await getStudentLifeData();
  const culturalText = sl?.cultural_activities;
  const culturalImage = sl?.cultural_image_url;
  const heroImage = sl?.hero_image_url;

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section className="relative py-28 bg-[var(--sidebar-bg)]">
        <div className="absolute inset-0">
          <img src={heroImage || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1920&auto=format&fit=crop"} alt="Cultural Activities" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 to-[#0F172A]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-primary/20 border border-primary/30 text-[#FCA5A5] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Creative Expression</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">Cultural Activities</h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            {/* Left/Middle Column: Details */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 rounded-sm">
                  <Music className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-[12px] font-bold text-purple-500 uppercase tracking-wider">Arts & Performance</h2>
                  <h3 className="text-2xl font-serif font-bold text-foreground">Nurturing Creative Talents</h3>
                </div>
              </div>

              {culturalText ? (
                <div className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-line border-l-2 border-slate-200 pl-6 py-2 dark:text-slate-300 dark:border-slate-800">
                  {culturalText}
                </div>
              ) : (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-sm dark:bg-slate-800/50 dark:border-slate-800">
                  <p className="text-slate-500 text-[14px]">Cultural program details will appear here. Add details in the admin panel under <strong>Website → Student Life</strong>.</p>
                </div>
              )}

              {/* Cultural Highlights */}
              <div className="grid sm:grid-cols-3 gap-6 pt-6">
                <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-sm text-center">
                  <Palette className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                  <h4 className="font-bold text-foreground mb-1 text-[14px]">Fine Arts</h4>
                  <p className="text-slate-500 text-[12px] leading-relaxed">Painting, sketching, pottery, and craft studios.</p>
                </div>
                <div className="p-5 bg-pink-50/50 border border-pink-100 rounded-sm text-center">
                  <Theater className="w-8 h-8 text-pink-500 mx-auto mb-3" />
                  <h4 className="font-bold text-foreground mb-1 text-[14px]">Performing Arts</h4>
                  <p className="text-slate-500 text-[12px] leading-relaxed">Contemporary & classical dance, theatre workshops.</p>
                </div>
                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-sm text-center">
                  <Mic className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                  <h4 className="font-bold text-foreground mb-1 text-[14px]">Music & Vocals</h4>
                  <p className="text-slate-500 text-[12px] leading-relaxed">Instrumental classes, choir, and recording facility.</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="bg-[var(--sidebar-bg)] text-white p-8 rounded-sm shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-[70px] opacity-20" />
                <h4 className="text-lg font-serif font-bold mb-4 relative z-10 text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Annual Fest & Events
                </h4>
                <p className="text-slate-400 text-[13px] leading-relaxed mb-4 relative z-10">
                  Every year, our students organize and host inter-school cultural festivals, art exhibitions, and musical performances that attract participation from all across the region.
                </p>
                <div className="text-[12px] text-primary font-bold tracking-wide border-t border-white/10 pt-4 relative z-10">
                  CHORUS &bull; ART MEETS &bull; DEBATE CHAMPIONSHIPS
                </div>
              </div>

              <img src={culturalImage || "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=600&auto=format&fit=crop"} alt="Students Performing" className="w-full h-48 object-cover rounded-sm shadow-md" />
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-100 text-center dark:border-slate-800/50">
            <Link href="/student-life" className="inline-flex items-center gap-2 text-primary font-bold text-[14px] hover:text-[var(--primary-hover)] transition-colors">
              &larr; Back to Student Life
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
