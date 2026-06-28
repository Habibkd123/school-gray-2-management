import React from "react";

async function getGallery() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return { photos: [], videos: [] };
    const json = await res.json();
    return json.data?.gallery ?? { photos: [], videos: [] };
  } catch { return { photos: [], videos: [] }; }
}

const DEFAULT_IMGS = [
  { src: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=800", label: "School Campus" },
  { src: "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=800", label: "Annual Day" },
  { src: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=800", label: "Computer Lab" },
  // { src: "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=800", label: "Sports" },
  { src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800", label: "Classrooms" },
  { src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800", label: "Library" },
];

export default async function PhotosPage() {
  const gallery = await getGallery();
  const photos = gallery.photos?.length
    ? gallery.photos.map((p: any) => ({ src: p.url, label: p.caption || p.album || "Photo" }))
    : DEFAULT_IMGS;
  return (
    <main className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl  font-bold text-foreground mb-3">Photo Gallery</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-12">{photos.length} Photos</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((img: any, idx: number) => (
          <div key={idx} className="relative aspect-square rounded-sm overflow-hidden group border-2 border-transparent hover:border-[#F59E0B] transition-colors">
            <img src={img.src} alt={img.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <span className="text-white font-bold text-[13px]">{img.label}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
