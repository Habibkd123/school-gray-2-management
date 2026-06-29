import React from "react";
import { Star, Quote } from "lucide-react";

interface TestimonialItem {
  name: string;
  role: string;
  content: string;
  img: string;
}

interface TestimonialsProps {
  data?: {
    testimonials?: TestimonialItem[];
  } | null;
}

export function Testimonials({ data }: TestimonialsProps) {
  const defaultTestimonials = [
    { name: "Rajesh Sharma", role: "Parent of Class X Student", content: "The focus on both academics and values is what makes the school stand out. My son's transformation has been incredible, and the board results speak for themselves.", img: "https://i.pravatar.cc/150?u=1" },
    { name: "Priya Patel", role: "Alumni (Batch of 2018)", content: "The foundation I received here helped me crack the JEE exams. The teachers here are true mentors who guide you beyond the syllabus.", img: "https://i.pravatar.cc/150?u=2" },
    { name: "Amit Verma", role: "Parent of Class VI Student", content: "From state-of-the-art sports facilities to strict security measures, the school provides an environment where children can thrive safely.", img: "https://i.pravatar.cc/150?u=3" },
  ];

  const testimonials = data?.testimonials && data.testimonials.length > 0
    ? data.testimonials
    : defaultTestimonials;

  return (
    <section className="py-20 bg-[var(--section-alt)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-block mb-3">
            <span className="text-[12px] font-bold text-primary uppercase tracking-[0.15em]">Parent & Alumni Stories</span>
            <div className="h-0.5 bg-primary mt-1 w-full" />
          </div>
          <h3 className="text-4xl font-black text-[#231F20] leading-tight">
            Trusted by Thousands of Families
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((test, idx) => (
            <div key={idx} className="bg-[#FFFFFF] p-8 border border-[#E0E0E0] relative group hover:shadow-lg hover:border-primary transition-all duration-300">
              <Quote className="w-10 h-10 text-[#CCCCCC] absolute top-6 right-6 group-hover:text-primary/30 transition-colors" fill="currentColor" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-[#FFD700]" fill="currentColor" />
                ))}
              </div>
              
              <p className="text-slate-600 leading-relaxed mb-8 text-[15px] italic dark:text-slate-300">
                "{test.content}"
              </p>
              
              <div className="flex items-center gap-4 pt-5 border-t border-[#E0E0E0]">
                <img src={test.img} alt={test.name} className="w-11 h-11 rounded-full border-2 border-primary object-cover" />
                <div>
                  <h4 className="font-bold text-[#231F20] text-[14px]">{test.name}</h4>
                  <p className="text-[#828283] text-[11px] font-semibold uppercase tracking-wider">{test.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
