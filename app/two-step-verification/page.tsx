"use client";

import React, { useState, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const newsItems = [
  {
    title: "Summer Vacation Holiday Homework",
    desc: "The school will remain closed from April 20th to June..."
  },
  {
    title: "New Academic Session Admission Start(2024-25)",
    desc: "An academic term is a portion of an academic year, the time ...."
  },
  {
    title: "Date sheet Final Exam Nursery to Sr.Kg",
    desc: "Dear Parents, As the final examination for the session 2024-25 is ..."
  },
  {
    title: "Annual Day Function",
    desc: "Annual functions provide a platform for students to showcase their..."
  },
  {
    title: "Summer Vacation Holiday Homework",
    desc: "The school will remain closed from April 20th to June 15th for summer..."
  }
];

export default function TwoStepVerificationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    // Take only the last character if they pasted multiple or typed fast
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs[index - 1].current?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-900 font-sans">
      
      {/* Left Side - Image & News (Hidden on mobile) */}
      <div 
        className="hidden lg:flex flex-1 relative flex-col justify-center items-center p-12 bg-cover bg-center"
        style={{ backgroundImage: `url('https://preskool.dreamstechnologies.com/html/assets/img/authentication/authentication-01.jpg')` }}
      >
        {/* Blue Tint Overlay */}
        <div className="absolute inset-0 bg-primary/80 dark:bg-slate-900/80 backdrop-blur-[2px]" />

        {/* Glassmorphism Card */}
        <div className="relative z-10 w-full max-w-full sm:w-[500px] bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">What's New on MySchoolLife !!!</h2>
          
          <div className="space-y-3">
            {newsItems.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-lg p-4 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight">{item.title}</h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-full sm:w-[320px]">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-900 h-screen overflow-y-auto">
        
        {/* Header Logo */}
        <div className="w-full flex justify-center pt-10 pb-6 lg:pt-20 lg:pb-12 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow-sm shrink-0 dark:bg-slate-900">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
            <span className="text-[24px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">MySchool<span className="text-primary">Life</span></span>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="flex-1 flex flex-col justify-start items-center px-6 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-full sm:w-[420px] bg-white dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            
            <div className="mb-8">
              <h1 className="text-[22px] font-bold text-[#202c4b] dark:text-slate-100 mb-2">Login with your Email Address</h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                We sent a verification code to your email. Enter the code from the email in the field below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* OTP Inputs */}
              <div className="flex justify-between gap-3">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-14 h-14 text-center text-xl font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-primary transition-colors"
                  />
                ))}
              </div>

              {/* Timer Badge */}
              <div className="flex justify-center">
                <span className="inline-block px-3 py-1 bg-red-100 text-red-500 text-[10px] font-bold rounded-full">
                  Otp Will Expire In 09:59
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-2.5 bg-primary hover:bg-[#4b58ce] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Verify My Account"
                )}
              </button>
            </form>

          </div>
          
          {/* Footer Copyright */}
          <div className="mt-auto pt-8 text-center shrink-0 w-full mb-8">
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">Copyright © 2024 - MySchoolLife</p>
          </div>
        </div>
      </div>
    </div>
  );
}
