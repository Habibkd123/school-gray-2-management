"use client";

import React from "react";
import { motion } from "framer-motion";
import { Flag, Eye, Building2, Users, GraduationCap } from "lucide-react";

interface AboutData {
  hero_tagline?: string;
  history?: string;
  history_image_url?: string;
  vision?: string;
  mission?: string;
  founded_year?: number;
  infrastructure?: string;
  infrastructure_image_url?: string;
  management_team?: Array<{
    _id?: string;
    name: string;
    position: string;
    bio: string;
    photo_url: string;
  }>;
}

export function AboutSchool({ data }: { data?: AboutData | null }) {
  const history = data?.history;
  const tagline = data?.hero_tagline || "Learning Journey";
  const foundedYear = data?.founded_year;
  const infrastructure = data?.infrastructure;
  const vision = data?.vision;
  const mission = data?.mission;
  const managementTeam = data?.management_team ?? [];
  const historyImageUrl = data?.history_image_url;
  const infrastructureImageUrl = data?.infrastructure_image_url;

  const timelineItems = [
    {
      id: "foundation",
      title: "Our Foundation",
      description: history,
      icon: <Flag className="w-6 h-6 text-primary dark:text-white" />,
      image: historyImageUrl,
      badge: foundedYear ? `Est. ${foundedYear}` : undefined,
    },
    {
      id: "vision",
      title: "Vision & Mission",
      description: [vision, mission].filter(Boolean).join("\n\n"),
      icon: <Eye className="w-6 h-6 text-primary dark:text-white" />,
      image: null,
    },
    {
      id: "infrastructure",
      title: "Campus Infrastructure",
      description: infrastructure,
      icon: <Building2 className="w-6 h-6 text-primary dark:text-white" />,
      image: infrastructureImageUrl,
    },
    {
      id: "leadership",
      title: "Leadership",
      description: managementTeam.length > 0 ? "Guided by an experienced team of educators committed to excellence." : undefined,
      icon: <Users className="w-6 h-6 text-primary dark:text-white" />,
      image: null,
      customContent: managementTeam.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {managementTeam.slice(0, 4).map((member) => (
            <div key={member.name} className="flex items-center gap-3 bg-slate-100/50 dark:bg-white/5 p-3 rounded-lg border border-slate-200/50 dark:border-white/10">
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.name} className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-white/20" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-white/5 flex items-center justify-center border border-primary/20 dark:border-white/10">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <p className="font-bold text-foreground text-sm">{member.name}</p>
                <p className="text-primary text-[10px] uppercase tracking-wider">{member.position}</p>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ].filter(item => item.description || item.customContent);

  if (timelineItems.length === 0) return null;

  return (
    <section id="about" className="py-24 bg-background relative overflow-hidden">
      
      {/* Background styling */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 dark:opacity-10" />
      <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-foreground mb-4"
          >
            {tagline}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-text max-w-2xl mx-auto"
          >
            Trace our journey of excellence and discover what makes our institution unique.
          </motion.p>
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/30 via-[var(--primary-hover)]/30 to-transparent -translate-x-1/2 rounded-full hidden md:block" />
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/30 via-[var(--primary-hover)]/30 to-transparent rounded-full md:hidden" />

          <div className="space-y-12 md:space-y-24">
            {timelineItems.map((item, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className={`relative flex flex-col md:flex-row gap-8 md:gap-0 ${isEven ? 'md:flex-row-reverse' : ''}`}
                >
                  
                  {/* Timeline Dot */}
                  <div className="absolute left-8 md:left-1/2 top-6 -translate-x-1/2 md:translate-x-0 md:-ml-[22px] z-10 w-11 h-11 rounded-full bg-background dark:bg-slate-900 border-4 border-primary flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                    {item.icon}
                  </div>

                  {/* Spacer for alternating sides */}
                  <div className="hidden md:block md:w-1/2" />

                  {/* Content Card */}
                  <div className="md:w-1/2 pl-20 md:pl-0">
                    <div className={`bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 md:p-8 rounded-xl shadow-lg hover:bg-white/80 dark:hover:bg-white/10 transition-colors duration-300 ${isEven ? 'md:mr-12' : 'md:ml-12'}`}>
                      
                      {item.badge && (
                        <span className="inline-block px-3 py-1 bg-primary/10 dark:bg-white/5 border border-primary/20 dark:border-white/10 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] text-xs font-bold uppercase tracking-wider rounded-lg mb-4">
                          {item.badge}
                        </span>
                      )}
                      
                      <h3 className="text-2xl font-bold text-foreground mb-3">{item.title}</h3>
                      
                      {item.description && (
                        <p className="text-muted-text leading-relaxed whitespace-pre-line text-sm md:text-base">
                          {item.description}
                        </p>
                      )}

                      {item.image && (
                        <div className="mt-6 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 h-48 w-full relative">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {item.customContent}

                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
