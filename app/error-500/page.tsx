"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ServerCrash } from "lucide-react";

export default function Error500Page() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-white dark:bg-slate-900 font-sans text-foreground relative">
      <div className="flex-1 flex flex-col justify-center items-center p-8 text-center max-w-md mx-auto">
        
        {/* Illustration Placeholder */}
        <div className="mb-8 w-64 h-64 bg-red-50/50 rounded-full flex items-center justify-center relative">
          <ServerCrash className="w-24 h-24 text-danger opacity-80" />
          <div className="absolute top-10 right-0 bg-white dark:bg-slate-900 shadow-lg border border-gray-100 rounded-xl px-4 py-2 rotate-12">
            <span className="text-xl font-bold text-gray-900 dark:text-white">500</span>
          </div>
          <div className="absolute bottom-4 -left-4 font-black text-4xl text-danger drop-shadow-md bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-danger/20">
            Error
          </div>
        </div>

        <h1 className="text-[20px] font-bold text-gray-900 mb-2 dark:text-white">
          Oops, something went wrong
        </h1>
        
        <p className="text-[13px] text-gray-500 mb-8 leading-relaxed max-w-full sm:w-[300px]">
          Server Error 500. We apologise and are fixing the problem Please try again at a later stage
        </p>

        <Link 
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2.5 px-6 rounded-lg text-[13px] font-semibold transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

      </div>

      <div className="py-6 text-center text-[12px] text-gray-400">
        Copyright © 2024 - MySchoolLife
      </div>
    </div>
  );
}
