import React from "react";
import { Calendar, ChevronRight, Bell } from "lucide-react";

async function getNews() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.news_notices ?? []).filter((n: any) => n.is_published && n.type === "announcement");
  } catch { return []; }
}

const IMGS = [
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop",
];

export default async function AnnouncementsPage() {
  const items = await getNews();
  return (
    <main className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Announcements</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-12">Latest School Announcements</p>
      {items.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item: any, idx: number) => (
            <div key={item._id ?? idx} className="bg-white rounded-sm shadow-md border border-slate-200 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 dark:bg-slate-900 dark:border-slate-800">
              <div className="h-48 overflow-hidden relative">
                <img src={IMGS[idx % IMGS.length]} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-sm">Announcement</div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-slate-400 text-[12px] font-bold mb-2 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.published_at ? new Date(item.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                </div>
                <h3 className="font-bold text-foreground text-[16px] mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">{item.title}</h3>
                {item.content && <p className="text-slate-500 text-[13px] leading-relaxed mb-4 line-clamp-3 dark:text-slate-400">{item.content}</p>}
                {item.pdf_url && <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-bold text-primary uppercase tracking-wider">Download PDF <ChevronRight className="w-4 h-4" /></a>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20"><Bell className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-400">No announcements yet. Add them from <strong>Admin → Website → News</strong>.</p></div>
      )}
    </main>
  );
}
