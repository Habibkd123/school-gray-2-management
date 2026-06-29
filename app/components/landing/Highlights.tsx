"use client";

import React from "react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";

interface HighlightItem {
  value: string;
  label: string;
  icon: string;
}

interface LandingData {
  highlights?: HighlightItem[];
}

function renderStatIcon(iconName: string) {
  const IconComponent = (LucideIcons as any)[iconName];
  if (IconComponent) return <IconComponent className="w-8 h-8" />;
  return <span className="text-3xl leading-none">{iconName}</span>;
}

export function Highlights({ data }: { data?: LandingData | null }) {
  const highlights = (data?.highlights ?? []).filter(
    (h) => h.value?.trim() && h.label?.trim()
  );

  if (highlights.length === 0) return null;

  return (
    <section className="py-20 relative bg-[var(--section-alt)] overflow-hidden">
      {/* Decorative gradient background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 dark:bg-primary/10 rounded-full blur-[80px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/20 dark:bg-primary/10 rounded-full blur-[80px] opacity-60 pointer-events-none translate-y-1/2 -translate-x-1/4" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {highlights.map((item, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              key={idx} 
              className="group flex flex-col items-center justify-center text-center p-8 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 transition-transform duration-300"
            >
              {item.icon && (
                <div className="mb-4 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] bg-primary/10 dark:bg-white/5 p-4 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  {renderStatIcon(item.icon)}
                </div>
              )}
              <h3 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-2">
                {item.value}
              </h3>
              <p className="font-bold text-muted-text uppercase tracking-widest text-xs">
                {item.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
