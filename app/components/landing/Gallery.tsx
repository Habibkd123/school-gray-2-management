import React from "react";
import { ChevronRight } from "lucide-react";

interface GalleryPhoto {
  _id?: string;
  url: string;
  caption: string;
  album: string;
}

interface GalleryData {
  photos?: GalleryPhoto[];
  videos?: Array<{ url: string; title: string }>;
}

const DEFAULT_IMAGES = [
  { src: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=800&auto=format&fit=crop", label: "School Campus" },
  { src: "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=800&auto=format&fit=crop", label: "Annual Day Function" },
  { src: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=800&auto=format&fit=crop", label: "Computer Lab" },
  { src: "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=800&auto=format&fit=crop", label: "Sports Meet" },
  { src: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop", label: "Science Exhibition" },
  { src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop", label: "Smart Classrooms" },
];

export function Gallery({ data }: { data?: GalleryData | null }) {
  const photos = data?.photos?.length
    ? data.photos.slice(0, 6).map((p) => ({ src: p.url, label: p.caption || p.album || "Gallery" }))
    : DEFAULT_IMAGES;

  const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Our School";

  return (
    <section id="gallery" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Campus Life</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
              Life at {schoolName}
            </h3>
          </div>
          <a href="/gallery" className="hidden md:flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors uppercase tracking-wider text-[13px]">
            View All Photos <ChevronRight className="w-5 h-5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((img, idx) => (
            <div key={idx} className="relative h-72 rounded-sm overflow-hidden group cursor-pointer border-2 border-transparent hover:border-primary transition-colors">
              <img 
                src={img.src} 
                alt={img.label} 
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--sidebar-bg)]/90 via-[var(--sidebar-bg)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <span className="text-white font-bold text-lg tracking-wide">{img.label}</span>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
