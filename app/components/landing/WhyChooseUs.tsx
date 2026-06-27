import React from "react";
import * as LucideIcons from "lucide-react";

interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

interface WhyChooseUsProps {
  data?: {
    why_choose_us?: FeatureItem[];
  } | null;
}

export function WhyChooseUs({ data }: WhyChooseUsProps) {
  const defaultReasons = [
    { icon: "Monitor", title: "Smart Classrooms", desc: "Interactive digital boards and modern learning tools in every class." },
    { icon: "Users", title: "Expert Faculty", desc: "Highly qualified educators dedicated to personalized student success." },
    { icon: "FlaskConical", title: "Integrated Coaching", desc: "In-house foundation programs for IIT-JEE, NEET, and Olympiads." },
    { icon: "Trophy", title: "Sports Excellence", desc: "World-class sports infrastructure and professional coaching." },
    { icon: "Laptop", title: "Digital Learning", desc: "Comprehensive e-learning portal and digital library access." },
    { icon: "ShieldCheck", title: "Safe Campus", desc: "24/7 CCTV surveillance and strict campus security measures." },
  ];

  const reasons = data?.why_choose_us && data.why_choose_us.length > 0
    ? data.why_choose_us
    : defaultReasons;

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-8 h-8 text-[#1E3A5F]" />;
    }
    return <LucideIcons.Sparkles className="w-8 h-8 text-[#1E3A5F]" />;
  };

  return (
    <section className="py-20 bg-[#F0F4F9] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-block mb-3">
            <span className="text-[12px] font-bold text-[#1E3A5F] uppercase tracking-[0.15em]">Core Features</span>
            <div className="h-0.5 bg-[#1E3A5F] mt-1 w-full" />
          </div>
          <h3 className="text-4xl font-black text-[#231F20] mb-4 leading-tight">
            Why Parents Choose Us
          </h3>
          <p className="text-[14px] text-[#666666] leading-relaxed">
            We provide a comprehensive educational ecosystem that empowers students to discover their passions and reach their full potential.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((item, idx) => (
            <div key={idx} className="bg-[#FFFFFF] p-7 border border-[#E0E0E0] border-l-4 border-l-transparent hover:border-l-[#1E3A5F] hover:shadow-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-sm bg-[#EFEFEF] flex items-center justify-center mb-5 group-hover:bg-[#1E3A5F] transition-colors duration-300">
                <span className="group-hover:text-white transition-colors">{renderIcon(item.icon)}</span>
              </div>
              <h4 className="text-[16px] font-black text-[#231F20] mb-2">{item.title}</h4>
              <p className="text-[#828283] leading-relaxed text-[13px]">{item.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
