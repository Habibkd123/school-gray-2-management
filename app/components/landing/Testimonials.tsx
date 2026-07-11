"use client";

import React from "react";
import { motion } from "framer-motion";
import { Quote, BookOpen } from "lucide-react";

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
  const defaultTeachers = [
    { name: "Rajesh Sharma", role: "Head of Mathematics", content: "Education is not just about numbers; it's about teaching students how to think critically and solve real-world problems.", img: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop" },
    { name: "Priya Patel", role: "Senior Science Faculty", content: "I believe in hands-on learning. When students experiment and discover science themselves, the knowledge stays with them forever.", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop" },
    { name: "Amit Verma", role: "Literature & Arts", content: "Every child has a story to tell. My goal is to give them the vocabulary and confidence to share their unique voice with the world.", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop" },
  ];

  const teachers = data?.testimonials && data.testimonials.length > 0
    ? data.testimonials
    : defaultTeachers;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 rounded-lg bg-primary/10 dark:bg-white/5 border border-primary/20 dark:border-white/10"
          >
            <span className="text-xs font-bold text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Faculty
            </span>
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="page-title md:text-5xl mb-6 leading-tight"
          >
            Teacher Spotlight
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-text"
          >
            Meet the dedicated educators who inspire, mentor, and guide our students towards academic and personal excellence.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-3 gap-8"
        >
          {teachers.map((test, idx) => (
            <motion.div 
              key={idx} 
              variants={itemVariants}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-xl p-8 rounded-xl border border-slate-200 dark:border-white/10 relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <Quote className="w-12 h-12 text-primary/10 dark:text-primary/20 absolute top-6 right-6 group-hover:text-primary/20 dark:group-hover:text-primary/30 transition-colors z-0" fill="currentColor" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6 relative">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-primary/20 dark:border-white/10 shadow-md">
                    <img src={test.img} alt={test.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>

                <h4 className="font-bold text-xl text-foreground mb-1">{test.name}</h4>
                <p className="text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] text-xs font-bold uppercase tracking-wider mb-6">{test.role}</p>
                
                <p className="text-muted-text leading-relaxed text-sm italic mt-auto border-t border-slate-200 dark:border-white/10 pt-6">
                  "{test.content}"
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
      </div>
    </section>
  );
}
