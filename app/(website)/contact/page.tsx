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
      <section className="relative py-28 bg-[var(--sidebar-bg)]">
        <div className="absolute inset-0">
          <img src={data?.contact?.hero_image_url || "https://images.unsplash.com/photo-1523966211575-eb4a01e7dd51?q=80&w=1920&auto=format&fit=crop"} alt="Contact Us" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 to-[#0F172A]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-primary/20 border border-primary/30 text-[#FCA5A5] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Get in Touch</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight font-display">Contact Us</h1>
        </div>
      </section>
      <Contact data={data?.contact} />
    </main>
  );
}
