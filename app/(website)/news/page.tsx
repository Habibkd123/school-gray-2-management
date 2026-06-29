import React from "react";
import { Calendar, FileText, Bell, Award, ChevronRight } from "lucide-react";
import Link from "next/link";

async function getLanding() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  announcement: { label: "Announcement", color: "text-primary", bg: "bg-primary" },
  circular: { label: "Circular", color: "text-blue-500", bg: "bg-blue-500" },
  result: { label: "Result", color: "text-emerald-500", bg: "bg-emerald-500" },
};

const PLACEHOLDER_IMGS = [
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=600&auto=format&fit=crop",
];

export default async function NewsPage() {
  const data = await getLanding();
  const all = (data?.news_notices ?? []).filter((n: any) => n.is_published);

  return (
    <main className="w-full">
      {/* Hero */}
      <section className="relative py-28 bg-[var(--sidebar-bg)]">
        <div className="absolute inset-0">
          <img src={data?.news?.hero_image_url || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1920&auto=format&fit=crop"} alt="News" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 to-[#0F172A]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-primary/20 border border-primary/30 text-[#FCA5A5] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Notice Board</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">News & Circulars</h1>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="py-6 bg-white border-b border-slate-200 sticky top-20 z-40 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-4 overflow-x-auto">
          {[
            { href: "/news", label: "All" },
            { href: "/news/announcements", label: "Announcements" },
            { href: "/news/circulars", label: "Circulars" },
            { href: "/news/results", label: "Results" },
          ].map(t => (
            <Link key={t.href} href={t.href} className="px-5 py-2 text-[13px] font-bold uppercase tracking-wide rounded-sm whitespace-nowrap border border-slate-200 hover:bg-primary hover:text-white hover:border-primary transition-all dark:border-slate-800">
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      {/* All News */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {all.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {all.map((item: any, idx: number) => {
                const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.announcement;
                const dateStr = item.published_at ? new Date(item.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
                return (
                  <div key={item._id ?? idx} className="bg-white rounded-sm shadow-md border border-slate-200 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 dark:bg-slate-900 dark:border-slate-800">
                    <div className="h-52 overflow-hidden relative">
                      <img src={PLACEHOLDER_IMGS[idx % PLACEHOLDER_IMGS.length]} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className={`absolute top-4 left-4 ${cfg.bg} text-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-sm`}>{cfg.label}</div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-slate-400 text-[12px] font-bold mb-2 uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />{dateStr}
                      </div>
                      <h3 className="font-bold text-foreground text-[16px] mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">{item.title}</h3>
                      {item.content && <p className="text-slate-500 text-[13px] leading-relaxed mb-4 line-clamp-2">{item.content}</p>}
                      {item.pdf_url && (
                        <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-bold text-primary hover:text-[var(--primary-hover)] uppercase tracking-wider">
                          Download PDF <ChevronRight className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <Bell className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 text-[15px]">No news or circulars yet. Add them from <strong>Admin → Website → News</strong>.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
