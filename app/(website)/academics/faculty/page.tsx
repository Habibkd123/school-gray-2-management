import React from "react";
import { Users } from "lucide-react";

async function getAcademics() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.academics : null;
  } catch { return null; }
}

export default async function FacultyPage() {
  const academics = await getAcademics();
  const faculty = academics?.faculty ?? [];
  return (
    <main className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl  font-bold text-foreground mb-3">Our Faculty</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-12">Expert Educators</p>
      {faculty.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {faculty.map((m: any, i: number) => (
            <div key={m._id ?? i} className="bg-white rounded-sm border border-slate-200 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-56 bg-slate-100 overflow-hidden">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" style={{ filter: "blur(3px)", transform: "scale(1.05)" }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Users className="w-14 h-14 text-slate-300" /></div>
                )}
              </div>
              <div className="p-5 border-t-4 border-t-primary">
                <h3 className="font-bold text-foreground text-[16px]">{m.name}</h3>
                <p className="text-primary text-[12px] font-bold uppercase tracking-wide mt-1">{m.subject}</p>
                {m.qualification && <p className="text-slate-600 text-[12px] mt-1">{m.qualification}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500">Faculty members will appear here. Add them from <strong>Admin → Website → Academics</strong>.</p>
        </div>
      )}
    </main>
  );
}
