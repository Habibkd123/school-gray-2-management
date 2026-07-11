"use client";

import React, { useState, useEffect } from "react";
import { Play, ChevronLeft, ChevronRight, Map } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    if (videos.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % videos.length);
    }, 6000);
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
    <section className="py-24 bg-background relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 rounded-lg bg-primary/10 dark:bg-white/5 border border-primary/20 dark:border-white/10"
          >
            <span className="text-xs font-bold text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] uppercase tracking-widest flex items-center gap-2">
              <Map className="w-4 h-4" /> Explore {schoolName}
            </span>
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="page-title md:text-5xl mb-6 leading-tight"
          >
            Virtual Campus Tour
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-text max-w-2xl mx-auto"
          >
            Experience our state-of-the-art facilities from the comfort of your home. Discover where our students learn, play, and grow.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/20 group bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative w-full h-[300px] md:h-[600px]">
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
                key={currentVideo.url}
                src={currentVideo.url}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <Play className="w-16 h-16 mb-4 opacity-50" />
                <p className="card-title">No video available</p>
              </div>
            )}
          </div>

          {videos.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/60 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/30 backdrop-blur-md border border-slate-200 dark:border-white/20 text-foreground dark:text-white flex items-center justify-center transition-all duration-300 z-20 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 shadow-md"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              <button 
                onClick={handleNext}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/60 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/30 backdrop-blur-md border border-slate-200 dark:border-white/20 text-foreground dark:text-white flex items-center justify-center transition-all duration-300 z-20 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 shadow-md"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {currentVideo?.title && (
            <div className="absolute bottom-8 left-8 right-8 z-20 flex justify-between items-end pointer-events-none">
              <div className="flex items-center gap-4 bg-white/90 dark:bg-black/80 backdrop-blur-xl px-6 py-3 rounded-lg border border-slate-200 dark:border-white/20 shadow-xl pointer-events-auto">
                <span className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_10px_var(--primary)]" />
                <span className="text-sm font-bold tracking-wide text-foreground dark:text-white line-clamp-1">{currentVideo.title}</span>
              </div>
            </div>
          )}
        </motion.div>

        {videos.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${activeIndex === i ? "w-10 bg-primary shadow-[0_0_8px_var(--primary)]" : "w-3 bg-slate-300 dark:bg-white/20 hover:bg-slate-400"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
