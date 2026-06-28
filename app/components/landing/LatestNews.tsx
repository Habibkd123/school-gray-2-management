import React from "react";
import { Calendar, ChevronRight, FileText, Bell, Award } from "lucide-react";

interface NewsItem {
  _id?: string;
  type: "announcement" | "circular" | "result";
  title: string;
  content: string;
  pdf_url: string;
  published_at: string | Date;
  is_published: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  announcement: { label: "Announcement", color: "bg-primary", icon: Bell },
  circular: { label: "Circular", color: "bg-blue-500", icon: FileText },
  result: { label: "Result", color: "bg-emerald-500", icon: Award },
};

const DEFAULT_NEWS = [
  { tag: "Circular", date: "Oct 15, 2024", title: "CBSE Class X & XII Pre-Board Examination Schedule Released", img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop", color: "bg-blue-500" },
  { tag: "Event", date: "Oct 20, 2024", title: "Annual Inter-School Cultural Fest Registration Open", img: "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=600&auto=format&fit=crop", color: "bg-primary" },
  { tag: "Holiday", date: "Oct 31, 2024", title: "School Closed on Account of Diwali Festival", img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop", color: "bg-emerald-500" },
];

const PLACEHOLDER_IMGS = [
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop",
];

export function LatestNews({ data }: { data?: NewsItem[] | null }) {
  const published = data?.filter((n) => n.is_published) ?? [];
  const news = published.slice(0, 3);
  const hasRealData = news.length > 0;

  return (
    <section className="py-24 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Notice Board</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
              Latest News & Circulars
            </h3>
          </div>
          <a href="/news" className="hidden md:flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors uppercase tracking-wider text-[13px]">
            View All Updates <ChevronRight className="w-5 h-5" />
          </a>
        </div>

        {hasRealData ? (
          <div className="grid md:grid-cols-3 gap-8">
            {news.map((item, idx) => {
              const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.announcement;
              const dateStr = item.published_at
                ? new Date(item.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "";
              const img = PLACEHOLDER_IMGS[idx % PLACEHOLDER_IMGS.length];
              return (
                <div key={item._id ?? idx} className="bg-white rounded-sm shadow-md border border-slate-200 overflow-hidden group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                  <div className="h-56 overflow-hidden relative">
                    <img 
                      src={img} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className={`absolute top-4 left-4 ${cfg.color} text-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-sm`}>
                      {cfg.label}
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="flex items-center gap-2 text-slate-500 text-[12px] font-bold mb-3 uppercase tracking-wider">
                      <Calendar className="w-4 h-4" />
                      {dateStr}
                    </div>
                    <h4 className="text-[17px] font-bold text-foreground mb-4 leading-snug group-hover:text-[#231F20] transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    {item.content && (
                      <p className="text-slate-500 text-[13px] mb-4 line-clamp-2">{item.content}</p>
                    )}
                    {item.pdf_url ? (
                      <a
                        href={item.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0088CC] hover:text-[#005F8F] uppercase tracking-wider"
                      >
                        Download PDF <ChevronRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <a href="#" className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0088CC] hover:text-[#005F8F] uppercase tracking-wider">
                        Read Full Notice <ChevronRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {DEFAULT_NEWS.map((item, idx) => (
              <div key={idx} className="bg-white rounded-sm shadow-md border border-slate-200 overflow-hidden group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className="h-56 overflow-hidden relative">
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                  <div className={`absolute top-4 left-4 ${item.color} text-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-sm`}>
                    {item.tag}
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-2 text-slate-500 text-[12px] font-bold mb-3 uppercase tracking-wider">
                    <Calendar className="w-4 h-4" />
                    {item.date}
                  </div>
                  <h4 className="text-[17px] font-bold text-foreground mb-4 leading-snug group-hover:text-[#231F20] transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  <a href="#" className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0088CC] hover:text-[#005F8F] uppercase tracking-wider">
                    Read Full Notice <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </section>
  );
}
