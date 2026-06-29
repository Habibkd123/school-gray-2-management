import React from "react";
import { Calendar, ChevronRight, Award } from "lucide-react";

async function getNews() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.news_notices ?? []).filter((n: any) => n.is_published && n.type === "result");
  } catch { return []; }
}

export default async function ResultsPage() {
  const items = await getNews();
  return (
    <main className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Results</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-12">Examination Results & Merit Lists</p>
      {items.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any, idx: number) => (
            <div key={item._id ?? idx} className="bg-white rounded-sm border border-slate-200 shadow-md p-6 hover:shadow-xl hover:-translate-y-1 transition-all group border-t-4 border-t-emerald-500 dark:bg-slate-900 dark:border-slate-800">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                <Award className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[12px] font-bold mb-2 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                {item.published_at ? new Date(item.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
              </div>
              <h3 className="font-bold text-foreground text-[15px] mb-2 leading-snug group-hover:text-emerald-600 transition-colors">{item.title}</h3>
              {item.content && <p className="text-slate-500 text-[13px] leading-relaxed mb-4">{item.content}</p>}
              {item.pdf_url && <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-500 uppercase tracking-wider">View Results <ChevronRight className="w-4 h-4" /></a>}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20"><Award className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-400">No results published yet. Add them from <strong>Admin → Website → News</strong>.</p></div>
      )}
    </main>
  );
}
