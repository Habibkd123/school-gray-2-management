import React from "react";

interface HighlightItem {
  value: string;
  label: string;
  icon: string;
}

interface LandingData {
  about?: {
    founded_year?: number;
  };
  highlights?: HighlightItem[];
}

export function Highlights({ data }: { data?: LandingData | null }) {
  const foundedYear = data?.about?.founded_year;
  const yearsLegacy = foundedYear ? `${new Date().getFullYear() - foundedYear}+` : "25+";

  const defaultHighlights = [
    { value: "2500+", label: "Happy Students", icon: "🎓" },
    { value: "150+", label: "Expert Faculty", icon: "👨‍🏫" },
    { value: "100%", label: "CBSE Board Pass Rate", icon: "📈" },
    { value: yearsLegacy, label: "Years of Legacy", icon: "🏆" },
  ];

  const highlights = data?.highlights && data.highlights.length > 0
    ? data.highlights
    : defaultHighlights;

  return (
    <section className="py-10 bg-[var(--section-alt)] border-y border-[#E0E0E0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[#D9D9D9]">
          {highlights.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center text-center px-6 py-6 group hover:bg-white transition-colors duration-300">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="text-3xl lg:text-4xl font-black text-primary tracking-tight mb-1">{item.value}</h3>
              <p className="font-bold text-[#5C5D5D] uppercase tracking-wider text-[11px]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
