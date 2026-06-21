"use client";
import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Program {
  title: string;
  age: string;
  desc: string;
  img: string;
}

export default function ProgramsSlider({ programs }: { programs: Program[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // 1 card on mobile (< 640px), 2 on tablet (640px to 1023px), 3 on desktop (>= 1024px)
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setVisibleCount(3);
      } else if (window.innerWidth >= 640) {
        setVisibleCount(2);
      } else {
        setVisibleCount(1);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = Math.max(0, programs.length - visibleCount);

  // Guard index bounds if visibleCount changes on window resize
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  useEffect(() => {
    if (isHovered || maxIndex === 0) return;

    const timer = setInterval(() => {
      handleNext();
    }, 4500); // Auto-scroll every 4.5 seconds

    return () => clearInterval(timer);
  }, [isHovered, maxIndex, currentIndex]);

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slider Viewport */}
      <div className="overflow-hidden">
        <div 
          ref={sliderRef}
          className="flex transition-transform duration-500 ease-out -mx-4"
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
          }}
        >
          {programs.map((p, i) => (
            <div 
              key={i} 
              className="flex-shrink-0 px-4 w-full sm:w-1/2 lg:w-1/3 transition-all duration-300"
            >
              <div className="bg-white h-full rounded-sm border border-slate-200 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={p.img || "https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=600&auto=format&fit=crop"} 
                    alt={p.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute top-4 left-4 bg-[#0F172A] text-white px-3 py-1 text-[11px] font-bold tracking-widest uppercase shadow-md">
                    {p.age}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-widest">{p.age}</span>
                  <h4 className="text-xl font-bold text-[#0F172A] mt-1 mb-2">{p.title}</h4>
                  <p className="text-slate-500 text-[13px] leading-relaxed flex-1">{p.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide Navigation Buttons */}
      {maxIndex > 0 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all focus:outline-none z-10 hover:scale-105 active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all focus:outline-none z-10 hover:scale-105 active:scale-95"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {maxIndex > 0 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentIndex === idx 
                  ? "w-8 bg-[#F59E0B]" 
                  : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
