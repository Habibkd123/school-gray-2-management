import React from "react";
import { Star, Quote } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    { name: "Rajesh Sharma", role: "Parent of Class X Student", content: "The focus on both academics and values is what makes MySchoolLife stand out. My son's transformation has been incredible, and the board results speak for themselves.", img: "https://i.pravatar.cc/150?u=1" },
    { name: "Priya Patel", role: "Alumni (Batch of 2018)", content: "The foundation I received at MySchoolLife helped me crack the JEE exams. The teachers here are true mentors who guide you beyond the syllabus.", img: "https://i.pravatar.cc/150?u=2" },
    { name: "Amit Verma", role: "Parent of Class VI Student", content: "From state-of-the-art sports facilities to strict security measures, the school provides an environment where children can thrive safely.", img: "https://i.pravatar.cc/150?u=3" },
  ];

  return (
    <section className="py-24 bg-white relative border-b border-slate-200">
      <div className="absolute top-0 right-0 w-full sm:w-[600px] h-[600px] bg-[#F59E0B]/5 rounded-full blur-[120px] -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Parent & Alumni Stories</h2>
          <h3 className="text-4xl md:text-5xl font-serif font-bold text-[#0F172A] leading-tight">
            Trusted by Families
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((test, idx) => (
            <div key={idx} className="bg-slate-50 p-10 rounded-sm border border-slate-200 relative group hover:border-[#0F172A] hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <Quote className="w-12 h-12 text-[#F59E0B]/20 absolute top-8 right-8 group-hover:text-[#F59E0B]/40 transition-colors" fill="currentColor" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-[#F59E0B]" fill="currentColor" />
                ))}
              </div>
              
              <p className="text-slate-600 leading-relaxed mb-8 text-[15px] italic">
                "{test.content}"
              </p>
              
              <div className="flex items-center gap-4 pt-6 border-t border-slate-200">
                <img src={test.img} alt={test.name} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover" />
                <div>
                  <h4 className="font-bold text-[#0F172A] text-[15px]">{test.name}</h4>
                  <p className="text-[#F59E0B] text-[12px] font-bold uppercase tracking-wider">{test.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
