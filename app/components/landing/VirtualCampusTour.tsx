import React from "react";
import { Play } from "lucide-react";

export function VirtualCampusTour() {
  return (
    <section className="py-24 bg-[#0F172A] relative overflow-hidden text-white">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Explore MySchoolLife</h2>
        <h3 className="text-4xl md:text-5xl font-serif font-bold mb-6 leading-tight">
          Virtual Campus Tour
        </h3>
        <p className="text-[15px] text-slate-300 leading-relaxed max-w-2xl mx-auto mb-16">
          Take a 360° virtual walkthrough of our lush green 20-acre campus, featuring smart classrooms, international-standard sports facilities, and advanced laboratories.
        </p>

        <div className="relative max-w-5xl mx-auto rounded-sm overflow-hidden shadow-2xl border-4 border-white/10 group cursor-pointer">
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=1920&auto=format&fit=crop" 
            alt="Campus Video Thumbnail" 
            className="w-full h-[300px] md:h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
          />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-[#F59E0B] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.5)] group-hover:scale-110 transition-transform duration-300">
              <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-2" fill="currentColor" />
            </div>
          </div>
          
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-sm border border-white/20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-[13px] font-bold tracking-widest uppercase">360° View Available</span>
          </div>
        </div>
      </div>
    </section>
  );
}
