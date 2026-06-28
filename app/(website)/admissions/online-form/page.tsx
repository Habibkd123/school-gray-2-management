"use client";
import React, { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function OnlineFormPage() {
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", grade: "Pre-Primary", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) { setStatus("error"); setMsg("Name and Email are required."); return; }
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (res.ok && data.success) { setStatus("success"); setMsg("Your enquiry has been sent!"); setFormData({ name: "", phone: "", email: "", grade: "Pre-Primary", message: "" }); }
      else { setStatus("error"); setMsg(data.message || "Failed to send enquiry."); }
    } catch { setStatus("error"); setMsg("Unexpected error."); }
  };

  return (
    <main className="py-20 px-4 md:px-8 max-w-3xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl  font-bold text-foreground mb-3">Online Admission Enquiry</h1>
      <p className="text-primary font-bold uppercase tracking-widest text-[12px] mb-10">Fill in your details and we will get back to you</p>
      <div className="bg-white p-10 rounded-sm shadow-2xl">
        {status === "success" && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /><p className="text-emerald-400 text-[14px]">{msg}</p></div>}
        {status === "error" && <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center gap-3"><AlertCircle className="w-5 h-5 text-rose-400 shrink-0" /><p className="text-rose-400 text-[14px]">{msg}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-slate-300 uppercase tracking-wide">Parent&apos;s Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B] transition-colors" placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-slate-300 uppercase tracking-wide">Phone Number</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B] transition-colors" placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-300 uppercase tracking-wide">Email Address *</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B] transition-colors" placeholder="john@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-300 uppercase tracking-wide">Grade Applying For</label>
            <select value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none">
              <option className="bg-white">Pre-Primary</option>
              <option className="bg-white">Primary (I-V)</option>
              <option className="bg-white">Middle (VI-VIII)</option>
              <option className="bg-white">Secondary (IX-X)</option>
              <option className="bg-white">Senior Secondary (XI-XII)</option>
            </select>
          </div>
          <button type="submit" disabled={status === "loading"} className="w-full flex items-center justify-center gap-2 py-4 rounded-sm bg-[#F59E0B] text-white font-bold hover:bg-[#D97706] transition-all uppercase tracking-wide disabled:opacity-70">
            {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Enquiry"}
          </button>
        </form>
      </div>
    </main>
  );
}
