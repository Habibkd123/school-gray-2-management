"use client";

import React, { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  data?: {
    faqs?: FAQItem[];
  } | null;
}

export function FAQ({ data }: FAQProps) {
  const defaultFaqs = [
    { question: "What is the admission procedure for Class XI?", answer: "Admission to Class XI is based on the student's performance in the Class X board exams and an internal aptitude test. We offer Science (PCM/PCB), Commerce, and Humanities streams." },
    { question: "Does the school provide transport facilities?", answer: "Yes, we provide GPS-enabled, air-conditioned bus services covering a 20km radius around the school. All buses have a dedicated female attendant." },
    { question: "What is the student-teacher ratio?", answer: "We maintain a healthy student-teacher ratio of 25:1 to ensure personalized attention for every child in the classroom." },
    { question: "Are there any integrated coaching programs?", answer: "Yes, we offer integrated foundation coaching for IIT-JEE, NEET, and Olympiads starting from Class VIII, conducted by expert faculty during school hours." },
    { question: "What extracurricular activities are available?", answer: "We offer a wide range of activities including Cricket, Basketball, Swimming, Classical Music, Dance, Robotics, and Debate clubs." },
  ];

  const faqs = data?.faqs && data.faqs.length > 0
    ? data.faqs
    : defaultFaqs;

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--primary-hover)]/5 dark:bg-[var(--primary-hover)]/10 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 rounded-lg bg-primary/10 dark:bg-white/5 border border-primary/20 dark:border-white/10"
          >
            <span className="text-xs font-bold text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] uppercase tracking-widest flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Got Questions?
            </span>
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="page-title md:text-5xl mb-6 leading-tight"
          >
            Frequently Asked Questions
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-text"
          >
            Find quick answers to the most common admission and school life questions.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-col gap-4"
        >
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <motion.div 
                key={idx} 
                initial={false}
                animate={{ backgroundColor: isOpen ? "var(--background)" : "var(--section-alt)" }}
                className={`overflow-hidden rounded-xl border transition-all duration-300 backdrop-blur-xl dark:bg-slate-900/60 ${isOpen ? 'border-primary dark:border-[color-mix(in_srgb,var(--primary)_40%,white)] shadow-lg' : 'border-slate-200 dark:border-white/10 hover:border-primary/50'}`}
              >
                <button 
                  type="button"
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-6 text-left"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                >
                  <span className={`font-bold text-[16px] pr-8 transition-colors ${isOpen ? 'text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)]' : 'text-foreground'}`}>
                    {faq.question}
                  </span>
                  <motion.div
                    initial={false}
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOpen ? 'bg-primary/10 dark:bg-white/5' : 'bg-slate-100 dark:bg-white/5'}`}
                  >
                    <ChevronDown className={`w-5 h-5 ${isOpen ? 'text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)]' : 'text-slate-400'}`} />
                  </motion.div>
                </button>
                
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      variants={{
                        open: { opacity: 1, height: "auto" },
                        collapsed: { opacity: 0, height: 0 }
                      }}
                      transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="p-6 pt-0 text-muted-text leading-relaxed text-[15px]">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
