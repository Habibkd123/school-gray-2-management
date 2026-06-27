"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Wrench, AlertTriangle, Monitor } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-white dark:bg-slate-900 font-sans">
      
      {/* Header Logo */}
      <div className="w-full flex justify-center pt-12 pb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <span className="text-[22px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">MySchool<span className="text-[#1E3A5F]">Life</span></span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 max-w-full sm:w-[600px] text-center">
        
        {/* Maintenance Illustration Placeholder */}
        <div className="relative w-64 h-48 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-center overflow-hidden">
            <Monitor className="w-40 h-40 text-slate-200 absolute bottom-[-20px]" strokeWidth={1} />
            <div className="absolute flex items-center justify-center z-10">
              <AlertTriangle className="w-16 h-16 text-[#1E3A5F]" fill="#1E3A5F" stroke="white" strokeWidth={2} />
              <div className="absolute text-white font-bold text-xl pb-1">!</div>
            </div>
            <div className="absolute top-8 left-8 animate-[spin_4s_linear_infinite]">
              <Settings className="w-10 h-10 text-slate-300" />
            </div>
            <div className="absolute bottom-12 right-10 animate-[spin_5s_linear_infinite_reverse]">
              <Settings className="w-12 h-12 text-slate-200" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-4 bg-white dark:bg-slate-900 p-3 rounded-full shadow-lg border border-slate-100 dark:border-slate-800/50">
            <Wrench className="w-8 h-8 text-slate-600 dark:text-slate-300" />
          </div>
        </div>

        <h1 className="text-[28px] font-bold text-[#202c4b] dark:text-slate-100 mb-4">
          We Are Under Maintenance
        </h1>
        
        <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-8 max-w-full sm:w-[400px] leading-relaxed mx-auto">
          Please check back later, We are working hard to get everything just right.
        </p>

        <Link 
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 py-2.5 px-6 bg-[#1E3A5F] hover:bg-[#4b58ce] text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Footer Copyright */}
      <div className="w-full pb-8 pt-4 text-center">
        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">Copyright © 2024 - MySchoolLife</p>
      </div>

    </div>
  );
}
