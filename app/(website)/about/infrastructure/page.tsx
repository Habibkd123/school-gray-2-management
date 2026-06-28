import React from "react";
import { Building2 } from "lucide-react";

async function getAbout() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.about : null;
  } catch { return null; }
}

export default async function InfrastructurePage() {
  const about = await getAbout();
  const infrastructure = about?.infrastructure;

  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl  font-bold text-foreground mb-3">Infrastructure</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-10">Our Campus Facilities</p>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          {infrastructure ? (
            <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{infrastructure}</p>
          ) : (
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
              <p className="text-gray-500">Infrastructure details will be added here. Update it from the admin panel under <strong>Website → About</strong>.</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <img src={about?.infrastructure_image_url || "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=600&auto=format&fit=crop"} alt="Campus" className="w-full h-48 object-cover rounded-sm shadow-md" />
          <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" alt="Classrooms" className="w-full h-48 object-cover rounded-sm shadow-md mt-8" />
          <img src="https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=600&auto=format&fit=crop" alt="Lab" className="w-full h-48 object-cover rounded-sm shadow-md -mt-8" />
          <img src="https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=600&auto=format&fit=crop" alt="Sports" className="w-full h-48 object-cover rounded-sm shadow-md" />
        </div>
      </div>
    </main>
  );
}
