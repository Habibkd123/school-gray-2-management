import React from "react";

async function getAdmissions() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/landing`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data?.admissions : null;
  } catch { return null; }
}

export default async function FeeStructurePage() {
  const admissions = await getAdmissions();
  const fees = admissions?.fee_structure ?? [];
  return (
    <main className="py-20 px-4 md:px-8 max-w-5xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Fee Structure</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-10">Annual & Monthly Fee Details</p>
      {fees.length > 0 ? (
        <div className="overflow-x-auto rounded-sm border border-slate-200 shadow-md">
          <table className="w-full text-[14px]">
            <thead className="bg-[var(--sidebar-bg)] text-white">
              <tr>
                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-[12px]">Class</th>
                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[12px]">Annual Fee (₹)</th>
                <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[12px]">Monthly Fee (₹)</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f: any, i: number) => (
                <tr key={f._id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-6 py-4 font-medium text-foreground">{f.class_name}</td>
                  <td className="px-6 py-4 text-right text-slate-700">₹{f.annual_fee?.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4 text-right text-slate-700">₹{f.monthly_fee?.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500">Fee structure will appear here. Add it from <strong>Admin → Website → Admissions</strong>.</p>
        </div>
      )}
    </main>
  );
}
