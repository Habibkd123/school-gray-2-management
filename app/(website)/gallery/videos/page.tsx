import React from "react";
import { Video } from "lucide-react";

async function getVideos() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.gallery?.videos ?? [];
  } catch { return []; }
}

export default async function VideosPage() {
  const videos = await getVideos();
  return (
    <main className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Campus Videos</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-12">Video Gallery</p>
      {videos.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v: any, i: number) => {
            if (!v.url) return null;
            const ytMatch = v.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            const embedId = ytMatch?.[1];
            return (
              <div key={i} className="rounded-sm overflow-hidden border border-slate-200 shadow-md dark:border-slate-800">
                {embedId ? (
                  <iframe src={`https://www.youtube.com/embed/${embedId}`} title={v.title || "Video"} className="w-full h-56" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                ) : (
                  <video src={v.url} controls className="w-full h-56 bg-black object-cover" />
                )}
                {v.title && <p className="text-[13px] font-bold text-slate-600 px-4 py-3 bg-slate-50 border-t border-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-800/50">{v.title}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <Video className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400">No videos yet. Add YouTube video links from <strong>Admin → Website → Gallery</strong>.</p>
        </div>
      )}
    </main>
  );
}
