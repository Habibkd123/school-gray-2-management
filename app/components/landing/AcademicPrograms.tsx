import React from "react";
import { ChevronRight, BookOpen } from "lucide-react";

interface AcademicsData {
  curriculum_overview?: string;
  class_structure?: string;
  academic_calendar?: string;
  faculty?: Array<{
    _id?: string;
    name: string;
    subject: string;
    qualification: string;
    photo_url: string;
  }>;
}

const DEFAULT_PROGRAMS = [
  { title: "Pre-Primary", age: "Nursery - UKG", desc: "Play-based learning focusing on socialization and foundational skills.", img: "https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=600&auto=format&fit=crop" },
  { title: "Primary", age: "Classes I - V", desc: "Core subjects introduction with emphasis on curiosity and creativity.", img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" },
  { title: "Middle School", age: "Classes VI - VIII", desc: "Advanced concepts, critical thinking, and structured project work.", img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" },
  { title: "Secondary", age: "Classes IX - X", desc: "CBSE Board exam preparation, career counseling, and leadership building.", img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop" },
  { title: "Senior Secondary", age: "Classes XI - XII", desc: "Science (PCM/PCB), Commerce & Humanities streams for university readiness.", img: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=600&auto=format&fit=crop" },
];

const PROGRAM_IMGS = [
  "https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=600&auto=format&fit=crop",
];

export function AcademicPrograms({ data }: { data?: AcademicsData | null }) {
  const overview = data?.curriculum_overview;
  const classStructure = data?.class_structure;
  const faculty = data?.faculty ?? [];

  const hasFaculty = faculty.length > 0;
  const hasClassStructure = Boolean(classStructure);

  if (!hasFaculty && !hasClassStructure) {
    return null;
  }

  return (
    <section id="academics" className="py-24 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Our Curriculum</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
              Academic Programs
            </h3>
            {overview && (
              <p className="text-[14px] text-slate-600 mt-4 leading-relaxed max-w-xl">{overview}</p>
            )}
          </div>
          <a href="/academics" className="hidden md:flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors uppercase tracking-wider text-[13px]">
            View Syllabus <ChevronRight className="w-5 h-5" />
          </a>
        </div>

        {hasFaculty ? (
          <div className="flex overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 snap-x snap-mandatory">
            {faculty.slice(0, 8).map((member, idx) => (
              <div key={member._id ?? idx} className="min-w-[260px] sm:min-w-0 bg-white rounded-sm shadow-md border border-slate-200 overflow-hidden group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 snap-center flex flex-col">
                <div className="h-48 overflow-hidden relative">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-[var(--sidebar-bg)] text-white px-3 py-1 text-[11px] font-bold tracking-widest uppercase shadow-md">
                    {member.subject}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h4 className="text-xl font-bold text-foreground mb-1">{member.name}</h4>
                  <p className="text-slate-500 text-[12px] mb-3">{member.qualification}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          hasClassStructure ? (
            <p className="text-[14px] text-slate-600 mb-10 leading-relaxed max-w-2xl">{classStructure}</p>
          ) : null
        )}

      </div>
    </section>
  );
}
