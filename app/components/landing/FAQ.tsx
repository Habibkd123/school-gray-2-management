"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

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
    <section className="py-24 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <SectionHeading
          eyebrow="Got Questions?"
          title="Frequently Asked Questions"
          description="Find quick answers to the most common admission and school life questions."
          align="center"
        />

        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className={`border transition-all duration-300 ${openIdx === idx ? 'border-[#231F20] shadow-md' : 'border-[#E0E0E0] hover:border-[#CCCCCC]'}`}
            >
              <button 
                type="button"
                aria-expanded={openIdx === idx}
                className="w-full flex items-center justify-between p-6 text-left bg-white dark:bg-slate-900"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              >
                <span className={`font-bold text-[15px] pr-8 ${openIdx === idx ? 'text-[#231F20]' : 'text-[#5C5D5D]'}`}>
                  {faq.question}
                </span>
                <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-300 ${openIdx === idx ? 'rotate-180 text-primary' : 'text-[#CCCCCC]'}`} />
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIdx === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                aria-hidden={openIdx !== idx}
              >
                <div className="p-6 pt-0 text-slate-600 leading-relaxed text-[15px] border-t border-slate-100 mt-2 dark:text-slate-300 dark:border-slate-800/50">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
