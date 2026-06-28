"use client";

import React, { useState, useEffect } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

interface VideoItem {
  url: string;
  title: string;
}

interface GalleryData {
  photos?: Array<{ url: string; caption: string; album: string }>;
  videos?: VideoItem[];
}

export function VirtualCampusTour({ data }: { data?: GalleryData | null }) {
  const videos = data?.videos ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Our School";

  // Auto scroll effect
  useEffect(() => {
    if (videos.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % videos.length);
    }, 6000); // Scroll every 6 seconds

    return () => clearInterval(interval);
  }, [videos.length, isPaused]);

  if (videos.length === 0) {
    return null;
  }

  const currentVideo = videos[activeIndex];
  const ytMatch = currentVideo?.url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  const embedId = ytMatch?.[1];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % videos.length);
  };

  return (
    <section className="py-24 bg-[var(--sidebar-bg)] relative overflow-hidden text-white">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        <SectionHeading
          eyebrow={`Explore ${schoolName}`}
          title="Virtual Campus Tour"
          description="Experience our campus through guided videos that highlight classrooms, labs, and student life."
          align="center"
        />
        <p className="text-[15px] text-slate-300 leading-relaxed max-w-2xl mx-auto mb-16">
          {currentVideo?.title ||
            "Take a virtual walkthrough of our campus, featuring smart classrooms, international-standard sports facilities, and advanced laboratories."}
        </p>

        {/* Video Slider Container */}
        <div 
          className="relative max-w-5xl mx-auto rounded-sm overflow-hidden shadow-2xl border-4 border-white/10 group bg-black"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Active Video Frame */}
          <div className="relative w-full h-[300px] md:h-[530px] transition-all duration-500 ease-in-out">
            {embedId ? (
              <iframe
                src={`https://www.youtube.com/embed/${embedId}?autoplay=0`}
                title={currentVideo?.title || "Campus Tour"}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : currentVideo?.url ? (
              <video
                key={currentVideo.url} // Change key to force reload and prevent video overlap on index change
                src={currentVideo.url}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <Play className="w-12 h-12 mb-2" />
                <p>No video available</p>
              </div>
            )}
          </div>

          {/* Navigation Controls (Only show if multiple videos exist) */}
          {videos.length > 1 && (
            <>
              {/* Prev Button */}
              <button 
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-sm bg-black/50 hover:bg-primary text-white flex items-center justify-center transition-colors duration-300 z-20 opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next Button */}
              <button 
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-sm bg-black/50 hover:bg-primary text-white flex items-center justify-center transition-colors duration-300 z-20 opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Video Title Overlay (Bottom left) */}
          {currentVideo?.title && (
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-sm border border-white/10 max-w-sm text-left">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>
              <span className="text-[12px] font-bold tracking-wide text-white line-clamp-1">{currentVideo.title}</span>
            </div>
          )}
        </div>

        {/* Indicator dots (Only show if multiple videos exist) */}
        {videos.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${activeIndex === i ? "w-8 bg-primary" : "w-2.5 bg-slate-600 hover:bg-slate-400"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
