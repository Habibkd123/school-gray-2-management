import React from "react";
import { Star, Award, Trophy, Bookmark } from "lucide-react";
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

export default async function StudentLifeAchievementsPage() {
  const sl = await getStudentLifeData();
  const achievements = sl?.achievements ?? [];
  const heroImage = sl?.hero_image_url;

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section className="relative py-28 bg-white">
        <div className="absolute inset-0">
          <img src={heroImage || "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?q=80&w=1920&auto=format&fit=crop"} alt="Achievements" className="w-full h-full object-cover" style={{ filter: "blur(3px)", transform: "scale(1.05)" }} />
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundColor: "color-mix(in oklab, #ffffff6b 90%, transparent)" }} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Our Pride</span>
          <h1 className="text-5xl md:text-6xl  font-bold text-[#231F20] font-sans font-black leading-tight">Accolades & Achievements</h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Trophy className="w-12 h-12 text-[#F59E0B] mx-auto mb-4" />
            <h2 className="text-3xl font-serif font-bold text-[#0F172A] mb-3">Celebrating Excellence</h2>
            <p className="text-slate-600 text-[14px]">
              We take immense pride in the achievements of our students across academic, sporting, and creative domains. Here are some of our milestone accomplishments.
            </p>
          </div>

          {achievements.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {achievements.map((item: any, idx: number) => (
                <div key={item._id ?? idx} className="bg-slate-50 border border-slate-200 rounded-sm p-8 hover:bg-white/5 hover:border-primary/50 hover:shadow-xl transition-all duration-300 relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Award className="w-16 h-16 text-[#F59E0B]" />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-[#F59E0B]/10 text-[#F59E0B] text-[11px] font-bold tracking-widest rounded-full uppercase">
                      {item.year || "Award"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#0F172A] mb-3 line-clamp-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-slate-600 text-[13px] leading-relaxed whitespace-pre-line">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-sm">
              <Star className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-[14px]">Achievements and accolades details will appear here. Add accomplishments in the admin panel under <strong>Website → Student Life → Achievements</strong>.</p>
            </div>
          )}

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
