import React from "react";
import { Eye, Target } from "lucide-react";

async function getAbout() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.about : null;
  } catch { return null; }
}

export default async function VisionMissionPage() {
  const about = await getAbout();
  const vision = about?.vision;
  const mission = about?.mission;

  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl  font-bold text-foreground mb-3">Vision & Mission</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-12">Our Purpose & Goals</p>

      {(vision || mission) ? (
        <div className="grid md:grid-cols-2 gap-10">
          {vision && (
            <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-md border-t-4 border-t-[#F59E0B]">
              <div className="w-14 h-14 bg-[#F59E0B]/10 rounded-full flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-[#F59E0B]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#0F172A] mb-4">Our Vision</h2>
              <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{vision}</p>
            </div>
          )}
          {mission && (
            <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-md border-t-4 border-t-[#0F172A]">
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-foreground" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#0F172A] mb-4">Our Mission</h2>
              <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{mission}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500">Vision & Mission content will be added here soon. Add it from the admin panel under <strong>Website → About</strong>.</p>
        </div>
      )}
    </main>
  );
}
