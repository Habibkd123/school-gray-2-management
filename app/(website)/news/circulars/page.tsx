import React from "react";
import { Calendar, ChevronRight, FileText } from "lucide-react";

async function getNews() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.news_notices ?? []).filter((n: any) => n.is_published && n.type === "circular");
  } catch { return []; }
}

const IMGS = [
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=600&auto=format&fit=crop",
];

export default async function CircularsPage() {
  const items = await getNews();
  return (
    <main className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Circulars</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-12">Official School Circulars</p>
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item: any, idx: number) => (
            <div key={item._id ?? idx} className="bg-white rounded-sm border border-slate-200 shadow-sm p-6 flex items-start gap-5 hover:shadow-md hover:border-primary/40 transition-all group dark:bg-slate-900 dark:border-slate-800">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-500 group-hover:border-blue-500 transition-all">
                <FileText className="w-5 h-5 text-blue-500 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-slate-400 text-[12px] font-bold mb-1 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.published_at ? new Date(item.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                </div>
                <h3 className="font-bold text-foreground text-[15px] mb-1 leading-snug group-hover:text-blue-600 transition-colors">{item.title}</h3>
                {item.content && <p className="text-slate-500 text-[13px] leading-relaxed dark:text-slate-400">{item.content}</p>}
              </div>
              {item.pdf_url && (
                <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1 text-[12px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-wider">
                  PDF <ChevronRight className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20"><FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-400">No circulars yet. Add them from <strong>Admin → Website → News</strong>.</p></div>
      )}
    </main>
  );
}
