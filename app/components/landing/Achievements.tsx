import React from "react";
import { Star, Trophy, Medal, Award } from "lucide-react";

interface StudentLifeData {
  sports?: string;
  cultural_activities?: string;
  clubs_societies?: string;
  achievements?: Array<{
    _id?: string;
    title: string;
    year: number;
    description: string;
  }>;
}

const DEFAULT_ACHIEVEMENTS = [
  { number: "Top 1%", label: "CBSE National Rankers", color: "text-primary" },
  { number: "50+", label: "IIT-JEE / NEET Selections", color: "text-foreground" },
  { number: "120+", label: "State Level Sports Medals", color: "text-primary" },
  { number: "No. 1", label: "Ranked School in District", color: "text-foreground" },
];

const ICONS = [Trophy, Star, Medal, Award];

export function Achievements({ data }: { data?: StudentLifeData | null }) {
  const apiAchievements = data?.achievements ?? [];
  const hasReal = apiAchievements.length > 0;

  return (
    <section className="py-24 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Our Pride</h2>
          <h3 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
            Milestones & Achievements
          </h3>
          <p className="text-[15px] text-slate-600 leading-relaxed">
            {data?.sports || data?.cultural_activities ||
              "Consistently producing academic toppers and sports champions at the state and national levels."}
          </p>
        </div>

        {hasReal ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {apiAchievements.slice(0, 6).map((item, idx) => {
              const IconComp = ICONS[idx % ICONS.length];
              const altColors = idx % 2 === 0 ? "text-primary" : "text-foreground";
              return (
                <div key={item._id ?? idx} className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-sm border border-slate-200 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center mb-6 border-4 border-slate-100">
                    <IconComp className={`w-8 h-8 ${altColors}`} />
                  </div>
                  <h4 className={`text-2xl font-black ${altColors} mb-2`}>{item.year}</h4>
                  <h5 className="font-bold text-foreground text-[15px] mb-2">{item.title}</h5>
                  {item.description && (
                    <p className="text-slate-500 text-[13px] leading-relaxed">{item.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {DEFAULT_ACHIEVEMENTS.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-sm border border-slate-200 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center mb-6 border-4 border-slate-100">
                  <Star className={`w-8 h-8 ${item.color}`} fill="currentColor" />
                </div>
                <h4 className={`text-3xl font-black ${item.color} mb-2`}>{item.number}</h4>
                <p className="text-slate-700 font-bold text-[13px] uppercase tracking-wide">{item.label}</p>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </section>
  );
}
