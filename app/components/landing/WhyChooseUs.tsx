"use client";

import React from "react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";

interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

interface WhyChooseUsProps {
  data?: {
    why_choose_us?: FeatureItem[];
  } | null;
}

export function WhyChooseUs({ data }: WhyChooseUsProps) {
  const reasons = (data?.why_choose_us ?? []).filter(
    (r) => r.title?.trim() || r.desc?.trim()
  );

  if (reasons.length === 0) return null;

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-8 h-8 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)]" />;
    }
    return <LucideIcons.Monitor className="w-8 h-8 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)]" />;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section className="py-24 bg-[var(--section-alt)] relative overflow-hidden">
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-primary/20 to-[var(--primary-hover)]/20 dark:from-primary/10 dark:to-[var(--primary-hover)]/10 blur-[100px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-primary/20 to-info/20 dark:from-primary/10 dark:to-info/10 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 rounded-lg bg-primary/10 dark:bg-white/5 border border-primary/20 dark:border-white/10"
          >
            <span className="text-xs font-bold text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] uppercase tracking-widest flex items-center gap-2">
              <LucideIcons.Cpu className="w-4 h-4" /> Smart Classrooms
            </span>
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="page-title md:text-5xl mb-6 leading-tight"
          >
            Modern Learning Environment
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-text"
          >
            We blend traditional values with cutting-edge technology to provide an unparalleled educational experience.
          </motion.p>
        </div>

        {/* Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {reasons.map((item, idx) => (
            <motion.div 
              key={idx} 
              variants={itemVariants}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 p-8 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group"
            >
              {item.icon && (
                <div className="w-16 h-16 rounded-lg bg-primary/10 dark:bg-white/5 border border-primary/20 dark:border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <span className="group-hover:text-white transition-colors duration-300">
                    {renderIcon(item.icon)}
                  </span>
                </div>
              )}
              {item.title && (
                <h4 className="text-xl font-bold text-foreground mb-3">
                  {item.title}
                </h4>
              )}
              {item.desc && (
                <p className="text-muted-text leading-relaxed text-sm">
                  {item.desc}
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
