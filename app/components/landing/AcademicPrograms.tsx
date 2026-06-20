import React from "react";
import { ChevronRight } from "lucide-react";

export function AcademicPrograms() {
  const programs = [
    { title: "Pre-Primary", age: "Nursery - UKG", desc: "Play-based learning focusing on socialization and foundational skills.", img: "https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=600&auto=format&fit=crop" },
    { title: "Primary", age: "Classes I - V", desc: "Core subjects introduction with emphasis on curiosity and creativity.", img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" },
    { title: "Middle School", age: "Classes VI - VIII", desc: "Advanced concepts, critical thinking, and structured project work.", img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" },
    { title: "Secondary", age: "Classes IX - X", desc: "CBSE Board exam preparation, career counseling, and leadership building.", img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop" },
    { title: "Senior Secondary", age: "Classes XI - XII", desc: "Science (PCM/PCB), Commerce & Humanities streams for university readiness.", img: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=600&auto=format&fit=crop" },
  ];

  return (
    <section id="academics" className="py-24 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Our Curriculum</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-[#0F172A] leading-tight">
              Academic Programs
            </h3>
          </div>
          <button className="hidden md:flex items-center gap-2 font-bold text-[#0F172A] hover:text-[#F59E0B] transition-colors uppercase tracking-wider text-[13px]">
            View Syllabus <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Scroll/Grid */}
        <div className="flex overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-6 snap-x snap-mandatory hide-scrollbar">
          {programs.map((prog, idx) => (
            <div key={idx} className="min-w-full sm:w-[280px] sm:min-w-0 bg-white rounded-sm shadow-md border border-slate-200 overflow-hidden group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 snap-center flex flex-col">
              <div className="h-48 overflow-hidden relative">
                <img
                  src={prog.img}
                  alt={prog.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 bg-[#0F172A] text-white px-3 py-1 text-[11px] font-bold tracking-widest uppercase shadow-md">
                  {prog.age}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h4 className="text-xl font-bold text-[#0F172A] mb-2">{prog.title}</h4>
                <p className="text-slate-600 text-[13px] leading-relaxed mb-4 flex-1">{prog.desc}</p>
                <a href="#" className="inline-flex items-center gap-1 text-[13px] font-bold text-[#F59E0B] hover:text-[#D97706] uppercase tracking-wider">
                  Learn More <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
