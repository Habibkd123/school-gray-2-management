import React from "react";

const DEFAULT_IMGS = [
  { src: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=800&auto=format&fit=crop", label: "School Campus" },
  { src: "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=800&auto=format&fit=crop", label: "Annual Day" },
  { src: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=800&auto=format&fit=crop", label: "Computer Lab" },
  // { src: "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=800&auto=format&fit=crop", label: "Sports Meet" },
  { src: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop", label: "Science Exhibition" },
  { src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop", label: "Smart Classrooms" },
  { src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop", label: "Library" },
  { src: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop", label: "Students" },
  { src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop", label: "Classrooms" },
];

async function getLanding() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export default async function GalleryPage() {
  const data = await getLanding();
  const photos = data?.gallery?.photos ?? [];
  const videos = data?.gallery?.videos ?? [];
  const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Our School";

  const displayPhotos = photos.length > 0
    ? photos.map((p: any) => ({ src: p.url, label: p.caption || p.album || "Photo" }))
    : DEFAULT_IMGS;

  const albums = photos.length > 0
    ? [...new Set(photos.map((p: any) => p.album).filter(Boolean))] as string[]
    : [];

  return (
    <main className="w-full">
      {/* Hero */}
      <section className="relative py-28 bg-[#0F172A]">
        <div className="absolute inset-0">
          <img src={data?.gallery?.hero_image_url || displayPhotos[0]?.src} alt="Gallery" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 to-[#0F172A]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 bg-[#1E3A5F]/20 border border-[#1E3A5F]/30 text-[#FCA5A5] text-[12px] font-bold uppercase tracking-widest rounded-sm mb-6">Campus Life</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">Photo Gallery</h1>
          <p className="text-slate-400 mt-4">{displayPhotos.length} photos</p>
        </div>
      </section>

      {/* Photos Grid */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayPhotos.map((img: any, idx: number) => (
              <div key={idx} className="relative aspect-square rounded-sm overflow-hidden group cursor-pointer border-2 border-transparent hover:border-[#1E3A5F] transition-colors">
                <img src={img.src} alt={img.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white font-bold text-[13px]">{img.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Videos */}
      {videos.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-[#1E3A5F] font-bold tracking-widest uppercase text-[12px] mb-3">Videos</h2>
            <h3 className="text-3xl font-serif font-bold text-[#0F172A] mb-10">Campus Videos</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((v: any, i: number) => {
                if (!v.url) return null;
                const ytMatch = v.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                const embedId = ytMatch?.[1];
                return (
                  <div key={i} className="rounded-sm overflow-hidden border border-slate-200 shadow-md">
                    {embedId ? (
                      <iframe src={`https://www.youtube.com/embed/${embedId}`} title={v.title || "Video"} className="w-full h-52" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    ) : (
                      <video src={v.url} controls className="w-full h-52 bg-black object-cover" />
                    )}
                    {v.title && <p className="text-[13px] font-bold text-slate-600 px-4 py-3 bg-slate-50 border-t border-slate-100">{v.title}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
