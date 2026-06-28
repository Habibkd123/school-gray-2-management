import React from "react";
import { Users } from "lucide-react";

async function getAbout() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.about : null;
  } catch { return null; }
}

export default async function ManagementPage() {
  const about = await getAbout();
  const team = about?.management_team ?? [];

  return (
    <main className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl  font-bold text-foreground mb-3">Management Team</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-12">Our Leadership</p>

      {team.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map((member: any, idx: number) => (
            <div key={member._id ?? idx} className="bg-white rounded-sm border border-slate-200 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-64 overflow-hidden bg-slate-100 relative">
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" style={{ filter: "blur(3px)", transform: "scale(1.05)" }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-16 h-16 text-slate-300" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#F59E0B]" />
              </div>
              <div className="p-6">
                <h2 className="text-lg font-bold text-[#0F172A]">{member.name}</h2>
                <p className="text-[#F59E0B] text-[12px] font-bold uppercase tracking-widest mb-3">{member.position}</p>
                {member.bio && <p className="text-slate-500 text-[13px] leading-relaxed">{member.bio}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500">Management team members will be listed here. Add them from the admin panel under <strong>Website → About</strong>.</p>
        </div>
      )}
    </main>
  );
}
