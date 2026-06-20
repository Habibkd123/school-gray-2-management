"use client";

import React, { useState } from "react";
import { MapPin, Phone, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function Contact() {
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", grade: "Pre-Primary" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setStatus("error");
      setMessage("Name and Email are required.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
        setMessage("Your enquiry has been sent successfully!");
        setFormData({ name: "", phone: "", email: "", grade: "Pre-Primary" });
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to send enquiry.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An unexpected error occurred.");
    }
  };

  return (
    <section id="contact" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-[#F59E0B] font-bold tracking-widest uppercase text-[12px] mb-3">Get in Touch</h2>
          <h3 className="text-4xl md:text-5xl font-serif font-bold text-[#0F172A] leading-tight">
            Contact Admissions Office
          </h3>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* Left: Contact Info */}
          <div className="space-y-8">
            <p className="text-[15px] text-slate-600 leading-relaxed mb-10">
              We welcome prospective parents to visit our campus. Please contact our admissions desk to schedule a tour or for any queries regarding the admission process.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-sm border-l-4 border-[#0F172A]">
                <MapPin className="w-8 h-8 text-[#F59E0B] mb-4" />
                <h4 className="font-bold text-[#0F172A] mb-2 text-[15px]">Campus Address</h4>
                <p className="text-slate-600 text-[14px]">Sector 62, Knowledge Park,<br/>New Delhi, 110001, India</p>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-sm border-l-4 border-[#0F172A]">
                <Phone className="w-8 h-8 text-[#F59E0B] mb-4" />
                <h4 className="font-bold text-[#0F172A] mb-2 text-[15px]">Contact Numbers</h4>
                <p className="text-slate-600 text-[14px]">+91 98765 43210<br/>011-23456789</p>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-sm border-l-4 border-[#0F172A] sm:col-span-2">
                <Mail className="w-8 h-8 text-[#F59E0B] mb-4" />
                <h4 className="font-bold text-[#0F172A] mb-2 text-[15px]">Email Address</h4>
                <p className="text-slate-600 text-[14px]">admissions@MySchoolLife.edu.in<br/>principal@MySchoolLife.edu.in</p>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="bg-[#0F172A] p-10 rounded-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B] rounded-full blur-[100px] opacity-20 -z-0" />
            <div className="relative z-10">
              <h4 className="text-2xl font-serif font-bold text-white mb-6">Send an Enquiry</h4>
              
              {status === "success" && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-emerald-400 text-[14px] font-medium">{message}</p>
                </div>
              )}
              {status === "error" && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <p className="text-rose-400 text-[14px] font-medium">{message}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wide">Parent's Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B] transition-colors" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wide">Phone Number</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B] transition-colors" placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wide">Email Address</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B] transition-colors" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wide">Grade Applying For</label>
                  <select value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B] transition-colors appearance-none">
                    <option className="bg-[#0F172A]">Pre-Primary</option>
                    <option className="bg-[#0F172A]">Primary (I-V)</option>
                    <option className="bg-[#0F172A]">Middle (VI-VIII)</option>
                    <option className="bg-[#0F172A]">Secondary (IX-X)</option>
                    <option className="bg-[#0F172A]">Senior Secondary (XI-XII)</option>
                  </select>
                </div>
                <button type="submit" disabled={status === "loading"} className="w-full flex items-center justify-center gap-2 py-4 rounded-sm bg-[#F59E0B] text-white font-bold text-[15px] hover:bg-[#D97706] transition-all duration-300 shadow-lg shadow-[#F59E0B]/20 uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed">
                  {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Enquiry"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
