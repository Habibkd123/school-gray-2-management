import React from "react";

async function getAbout() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.about : null;
  } catch { return null; }
}

export default async function AboutHistoryPage() {
  const about = await getAbout();
  const history = about?.history;
  const foundedYear = about?.founded_year;

  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-[#0F172A] mb-3">Our History</h1>
      {foundedYear && (
        <p className="text-[#1E3A5F] font-bold uppercase tracking-widest text-[12px] mb-8">
          Established {foundedYear} · {new Date().getFullYear() - foundedYear}+ Years of Excellence
        </p>
      )}
      {history ? (
        <div className="grid lg:grid-cols-2 gap-12 items-start mt-8">
          <div className="prose prose-slate max-w-none text-[15px] leading-relaxed text-slate-600 whitespace-pre-line">
            {history}
          </div>
          <div>
            <img
              src={about?.history_image_url || "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop"}
              alt="Our History"
              className="w-full h-80 object-cover rounded-sm shadow-md"
            />
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500">History content will be added here soon. Add it from the admin panel under <strong>Website → About</strong>.</p>
        </div>
      )}
    </main>
  );
}
