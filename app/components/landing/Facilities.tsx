"use client";

import React from "react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";

interface FacilityItem {
  icon: string;
  title: string;
}

interface FacilitiesProps {
  data?: {
    facilities?: FacilityItem[];
  } | null;
}

export function Facilities({ data }: FacilitiesProps) {
  const facilities = data?.facilities && data.facilities.length > 0 ? data.facilities : [];

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-8 h-8" />;
    }
    return <LucideIcons.Star className="w-8 h-8" />;
  };

  if (facilities.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <section id="activities" className="py-24 bg-background relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 rounded-lg bg-primary/10 dark:bg-white/5 border border-primary/20 dark:border-white/10"
          >
            <span className="text-xs font-bold text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] uppercase tracking-widest flex items-center gap-2">
              <LucideIcons.Users className="w-4 h-4" /> Extracurriculars
            </span>
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight"
          >
            Clubs & Activities
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-text leading-relaxed"
          >
            Discover your passion beyond academics. Join our diverse range of clubs and activities to develop new skills and build lasting friendships.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {facilities.map((fac, idx) => (
            <motion.div 
              key={idx} 
              variants={itemVariants}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-white/85 hover:border-primary/30 dark:hover:bg-white/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer group shadow-lg"
            >
              <div className="w-16 h-16 rounded-lg bg-primary/10 dark:bg-white/5 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-primary/20 dark:border-white/10">
                {renderIcon(fac.icon)}
              </div>
              <h4 className="text-[15px] font-bold text-foreground tracking-wide">{fac.title}</h4>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
