"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star, Trophy, Medal, Award, Sparkles } from "lucide-react";

interface StudentLifeData {
  sports?: string;
  cultural_activities?: string;
  clubs_societies?: string;
  achievements?: Array<{
    _id?: string;
    title: string;
    year: number;
    description: string;
  }>;
}

const DEFAULT_ACHIEVEMENTS = [
  { number: "Top 1%", label: "CBSE National Rankers", icon: Star },
  { number: "50+", label: "IIT-JEE / NEET Selections", icon: Award },
  { number: "120+", label: "State Level Sports Medals", icon: Medal },
  { number: "No. 1", label: "Ranked School in District", icon: Trophy },
];

const ICONS = [Trophy, Star, Medal, Award];

export function Achievements({ data }: { data?: StudentLifeData | null }) {
  const apiAchievements = data?.achievements ?? [];
  const hasReal = apiAchievements.length > 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <section className="py-24 bg-[var(--section-alt)] relative overflow-hidden">
      
      {/* Decorative gradients */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--primary-hover)]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 rounded-lg bg-white/60 dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/20 shadow-sm"
          >
            <span className="text-xs font-bold text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Our Pride
            </span>
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight"
          >
            Student Achievements
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-text leading-relaxed"
          >
            {data?.sports || data?.cultural_activities || "Consistently producing academic toppers and sports champions at the state and national levels."}
          </motion.p>
        </div>

        {hasReal ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {apiAchievements.slice(0, 6).map((item, idx) => {
              const IconComp = ICONS[idx % ICONS.length];
              return (
                <motion.div 
                  key={item._id ?? idx} 
                  variants={itemVariants}
                  className="relative group bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 transition-colors duration-500 z-0" />
                  
                  <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto rounded-lg bg-primary/10 dark:bg-white/5 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm border border-primary/20 dark:border-white/10">
                      <IconComp className="w-10 h-10" />
                    </div>
                    <h4 className="text-2xl font-bold text-foreground mb-2">{item.year}</h4>
                    <h5 className="font-bold text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] text-lg mb-3">{item.title}</h5>
                    {item.description && (
                      <p className="text-muted-text text-sm leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          >
            {DEFAULT_ACHIEVEMENTS.map((item, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                className="relative group bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-2xl transition-all duration-300"
              >
                <div className="w-20 h-20 mx-auto rounded-lg bg-primary/10 dark:bg-white/5 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-primary/20 dark:border-white/10">
                  <item.icon className="w-10 h-10" />
                </div>
                <h4 className="text-3xl font-bold text-foreground mb-2">{item.number}</h4>
                <p className="text-muted-text font-bold text-xs uppercase tracking-widest">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
        
      </div>
    </section>
  );
}
