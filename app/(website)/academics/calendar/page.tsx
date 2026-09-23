import React from "react";
import { Calendar } from "lucide-react";
import { getLandingData } from "@/lib/landing/getLandingData";

export default async function AcademicCalendarPage() {
  const data = await getLandingData();
  const academics = data?.academics;
  const cal = academics?.academic_calendar;
  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="page-title font-serif mb-3">Academic Calendar</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-10">Important Dates & Events</p>
      {cal ? (
        <div className="bg-white border border-slate-200 rounded-sm shadow-md p-8 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-start gap-4 mb-6">
            <Calendar className="w-8 h-8 text-primary shrink-0 mt-1" />
            <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line dark:text-slate-300">{cal}</p>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl dark:bg-slate-800/50 dark:border-slate-800">
          <p className="text-gray-500">Academic calendar will appear here. Add it from <strong>Admin → Website → Academics</strong>.</p>
        </div>
      )}
    </main>
  );
}
