import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";

export function AboutSchool() {
  const points = [
    "Strict adherence to CBSE curriculum & guidelines",
    "Integration of traditional Indian values with global standards",
    "Dedicated foundation coaching for IIT-JEE & NEET",
    "State-of-the-art infrastructure for holistic development"
  ];

  return (
    <section id="about" className="py-24 bg-slate-50 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-full sm:w-[500px] h-[500px] bg-[#F59E0B]/5 rounded-full blur-[100px] -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Image Grid */}
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full sm:w-[120%] h-[120%] bg-[#0F172A]/5 rounded-full -z-10 border border-[#0F172A]/10" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <img 
                src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1000&auto=format&fit=crop" 
                alt="School Building" 
                className="w-full h-[320px] object-cover rounded-sm shadow-xl"
              />
              <div className="flex flex-col gap-4 pt-12">
                <img 
                  src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1000&auto=format&fit=crop" 
                  alt="Students studying" 
                  className="w-full h-[200px] object-cover rounded-sm shadow-xl"
                />
                {/* Year Badge */}
                <div className="bg-[#0F172A] text-white p-6 rounded-sm shadow-xl flex flex-col items-center justify-center h-[104px] border-b-4 border-[#F59E0B]">
                  <span className="text-3xl font-serif font-black text-[#F59E0B]">25+</span>
                  <span className="text-[11px] font-bold opacity-90 uppercase tracking-widest mt-1">Years Legacy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="max-w-xl">
            <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">About MySchoolLife</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-[#0F172A] mb-6 leading-tight">
              Nurturing Excellence, <br />Rooted in Tradition
            </h3>
            <p className="text-[15px] text-slate-600 leading-relaxed mb-8">
              Welcome to MySchoolLife Public School, a premier institution affiliated with the Central Board of Secondary Education (CBSE), New Delhi. We are committed to providing a transformative educational experience that combines rigorous academic standards with rich cultural values, preparing our students to excel in a rapidly changing world.
            </p>
            
            <ul className="space-y-4 mb-10">
              {points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-700 font-medium text-[14px]">
                  <CheckCircle2 className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <button className="px-8 py-3.5 rounded-sm bg-[#0F172A] text-white font-bold text-[14px] hover:bg-slate-800 shadow-xl transition-all duration-300 flex items-center gap-2 uppercase tracking-wide">
              Read Chairman's Message <ArrowRight className="w-4 h-4 text-[#F59E0B]" />
            </button>
          </div>
          
        </div>
      </div>
    </section>
  );
}
