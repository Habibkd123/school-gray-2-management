import React from "react";
import { BookOpen, Users, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import ProgramsSlider from "@/app/components/landing/ProgramsSlider";

async function getLanding() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export default async function AcademicsPage() {
  const data = await getLanding();
  const academics = data?.academics;
  const overview = academics?.curriculum_overview;
  const classStructure = academics?.class_structure;
  const calendar = academics?.academic_calendar;
  const faculty = academics?.faculty ?? [];

  const defaultPrograms = [
    { title: "Pre-Primary", age: "Nursery – UKG", desc: "Play-based learning, socialization & foundational skills.", img: "https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=600&auto=format&fit=crop" },
    { title: "Primary", age: "Classes I – V", desc: "Core subjects with emphasis on curiosity and creativity.", img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" },
    { title: "Middle School", age: "Classes VI – VIII", desc: "Advanced concepts, critical thinking and project work.", img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop" },
    { title: "Secondary", age: "Classes IX – X", desc: "CBSE Board prep, career counseling, leadership building.", img: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=600&auto=format&fit=crop" },
    { title: "Senior Secondary", age: "Classes XI – XII", desc: "Science (PCM/PCB), Commerce & Humanities streams.", img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop" },
  ];

  const programs = academics?.programs && academics.programs.length > 0
    ? academics.programs
    : defaultPrograms;

  return (
    <main className="w-full">
      {/* Hero */}
      <section className="relative py-28 bg-[#0F172A]">
        <div className="absolute inset-0">
          <img src={academics?.hero_image_url || "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1920&auto=format&fit=crop"} alt="Academics" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 to-[#0F172A]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#FDBA74] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Our Curriculum</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">Academic Programs</h1>
        </div>
      </section>

      {/* Overview */}
      {overview && (
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Overview</h2>
            <h3 className="text-3xl font-serif font-bold text-[#0F172A] mb-6">Curriculum Overview</h3>
            <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{overview}</p>
          </div>
        </section>
      )}

      {/* Programs */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Programs</h2>
          <h3 className="text-3xl font-serif font-bold text-[#0F172A] mb-10">Classes & Programs</h3>
          <ProgramsSlider programs={programs} />
        </div>
      </section>

      {/* Faculty */}
      {faculty.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Our Teachers</h2>
            <h3 className="text-3xl font-serif font-bold text-[#0F172A] mb-10">Faculty</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {faculty.map((m: any, i: number) => (
                <div key={m._id ?? i} className="bg-slate-50 rounded-sm border border-slate-200 p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-white shadow-md" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-slate-400" /></div>
                  )}
                  <h4 className="font-bold text-[#0F172A] text-[15px]">{m.name}</h4>
                  <p className="text-[#F59E0B] text-[12px] font-bold uppercase tracking-wide mt-1">{m.subject}</p>
                  {m.qualification && <p className="text-slate-400 text-[12px] mt-1">{m.qualification}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="py-14 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: "/academics/curriculum", label: "Curriculum", icon: BookOpen },
              { href: "/academics/class-structure", label: "Class Structure", icon: Users },
              { href: "/academics/faculty", label: "Faculty", icon: Users },
              { href: "/academics/calendar", label: "Academic Calendar", icon: Calendar },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-3 p-5 bg-white/5 border border-white/10 rounded-sm hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/30 transition-all group">
                <l.icon className="w-5 h-5 text-[#F59E0B]" />
                <span className="text-white font-bold text-[14px]">{l.label}</span>
                <ChevronRight className="w-4 h-4 text-white/40 ml-auto group-hover:text-[#F59E0B]" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
