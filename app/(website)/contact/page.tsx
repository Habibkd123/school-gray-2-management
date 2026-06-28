import React from "react";
import { Contact } from "../../components/landing/Contact";

async function getLanding() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export default async function ContactPage() {
  const data = await getLanding();
  return (
    <main className="w-full">
      {/* Hero */}
<<<<<<< Updated upstream
      <section className="relative py-28 bg-[#0F172A]">
=======
      <section className="relative py-28 bg-white">
>>>>>>> Stashed changes
        <div className="absolute inset-0">
          <img src={data?.contact?.hero_image_url || "https://images.unsplash.com/photo-1523966211575-eb4a01e7dd51?q=80&w=1920&auto=format&fit=crop"} alt="Contact Us" className="w-full h-full object-cover" style={{ filter: "blur(3px)", transform: "scale(1.05)" }} />
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundColor: "color-mix(in oklab, #ffffff6b 90%, transparent)" }} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
<<<<<<< Updated upstream
          <span className="inline-block px-4 py-1.5 bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#FDBA74] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Get in Touch</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight font-display">Contact Us</h1>
=======
          <span className="inline-block px-4 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Get in Touch</span>
          <h1 className="text-5xl md:text-6xl  font-bold text-[#231F20] font-sans font-black leading-tight font-display">Contact Us</h1>
>>>>>>> Stashed changes
        </div>
      </section>
      <Contact data={data?.contact} />
    </main>
  );
}
