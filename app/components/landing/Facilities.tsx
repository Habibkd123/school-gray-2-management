import React from "react";
import * as LucideIcons from "lucide-react";

interface FacilityItem {
  icon: string;
  title: string;
}

interface FacilitiesProps {
  data?: {
    facilities?: FacilityItem[];
  } | null;
}

export function Facilities({ data }: FacilitiesProps) {
  const defaultFacilities = [
    { icon: "MonitorPlay", title: "Smart Computer Labs" },
    { icon: "TestTube2", title: "Physics/Chem/Bio Labs" },
    { icon: "Library", title: "Digital Library" },
    { icon: "Trophy", title: "Sports Complex" },
    { icon: "Bus", title: "GPS Transport" },
    { icon: "Mic2", title: "AC Auditorium" },
    { icon: "Music", title: "Performing Arts" },
    { icon: "Presentation", title: "Smart Classrooms" }
  ];

  const facilities = data?.facilities && data.facilities.length > 0
    ? data.facilities
    : defaultFacilities;

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-8 h-8" />;
    }
    return <LucideIcons.Star className="w-8 h-8" />;
  };

  return (
    <section id="facilities" className="py-24 bg-[#0F172A] text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-[#1E3A5F] font-bold tracking-widest uppercase text-[12px] mb-3">Campus Infrastructure</h2>
          <h3 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight">
            World-Class Facilities
          </h3>
          <p className="text-[15px] text-slate-400 leading-relaxed">
            Our campus is equipped with state-of-the-art infrastructure to support comprehensive academic and extracurricular development matching international standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-6">
          {facilities.map((fac, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-sm p-8 flex flex-col items-center justify-center text-center hover:bg-[#1E3A5F] transition-colors cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                {renderIcon(fac.icon)}
              </div>
              <h4 className="text-[15px] font-bold text-white tracking-wide">{fac.title}</h4>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
