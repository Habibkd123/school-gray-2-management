"use client";

import React, { useState } from "react";
import { MapPin, Phone, Mail, Globe, Loader2, CheckCircle2, AlertCircle, ExternalLink, Share2, Video, Link2 } from "lucide-react";

interface ContactData {
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  map_embed_url?: string;
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
}

export function Contact({ data }: { data?: ContactData | null }) {
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", grade: "Pre-Primary" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const address = data?.address || "Sector 62, Knowledge Park,\nNew Delhi, 110001, India";
  const phone = data?.phone || "+91 98765 43210";
  const email = data?.email || "admissions@school.edu.in";
  const website = data?.website || "";
  const mapUrl = data?.map_embed_url || "";
  const social = data?.social || {};

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
      const responseData = await res.json();
      if (res.ok && responseData.success) {
        setStatus("success");
        setMessage("Your enquiry has been sent successfully!");
        setFormData({ name: "", phone: "", email: "", grade: "Pre-Primary" });
      } else {
        setStatus("error");
        setMessage(responseData.message || "Failed to send enquiry.");
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred.");
    }
  };

  return (
    <section id="contact" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-primary font-bold tracking-widest uppercase text-[12px] mb-3">Get in Touch</h2>
          <h3 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
            Contact Admissions Office
          </h3>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* Left: Contact Info */}
          <div className="space-y-8">
            <p className="text-[15px] text-slate-600 leading-relaxed">
              We welcome prospective parents to visit our campus. Please contact our admissions desk to schedule a tour or for any queries regarding the admission process.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-sm border-l-4 border-primary">
                <MapPin className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-bold text-foreground mb-2 text-[15px]">Campus Address</h4>
                <p className="text-slate-600 text-[14px] whitespace-pre-line">{address}</p>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-sm border-l-4 border-primary">
                <Phone className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-bold text-foreground mb-2 text-[15px]">Contact Numbers</h4>
                <p className="text-slate-600 text-[14px]">
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">
                    {phone}
                  </a>
                </p>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-sm border-l-4 border-primary sm:col-span-2">
                <Mail className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-bold text-foreground mb-2 text-[15px]">Email Address</h4>
                <p className="text-slate-600 text-[14px]">
                  <a href={`mailto:${email}`} className="hover:text-primary transition-colors">{email}</a>
                </p>
                {website && (
                  <p className="text-slate-600 text-[14px] mt-1">
                    <a href={website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                      <Globe className="w-4 h-4" /> {website}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Social Links */}
            {(social.facebook || social.twitter || social.instagram || social.youtube) && (
              <div className="flex items-center gap-4 pt-2">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Follow us:</span>
                {social.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer" title="Facebook" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-all">
                    <Share2 className="w-5 h-5" />
                  </a>
                )}
                {social.twitter && (
                  <a href={social.twitter} target="_blank" rel="noopener noreferrer" title="Twitter / X" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-all">
                    <Link2 className="w-5 h-5" />
                  </a>
                )}
                {social.instagram && (
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer" title="Instagram" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-all">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
                {social.youtube && (
                  <a href={social.youtube} target="_blank" rel="noopener noreferrer" title="YouTube" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-all">
                    <Video className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}

            {/* Map Embed */}
            {mapUrl && (
              <div className="rounded-sm overflow-hidden border border-slate-200 shadow-md h-48 mt-4">
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="School Location Map"
                />
              </div>
            )}
          </div>

          {/* Right: Contact Form */}
          <div className="bg-[var(--sidebar-bg)] p-10 rounded-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-20 -z-0" />
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
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wide">Phone Number</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors" placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wide">Email Address</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wide">Grade Applying For</label>
                  <select value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full bg-white/5 border border-white/20 rounded-sm px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors appearance-none">
                    <option className="bg-[var(--sidebar-bg)]">Pre-Primary</option>
                    <option className="bg-[var(--sidebar-bg)]">Primary (I-V)</option>
                    <option className="bg-[var(--sidebar-bg)]">Middle (VI-VIII)</option>
                    <option className="bg-[var(--sidebar-bg)]">Secondary (IX-X)</option>
                    <option className="bg-[var(--sidebar-bg)]">Senior Secondary (XI-XII)</option>
                  </select>
                </div>
                <button type="submit" disabled={status === "loading"} className="w-full flex items-center justify-center gap-2 py-4 rounded-sm bg-primary text-white font-bold text-[15px] hover:bg-[var(--primary-hover)] transition-all duration-300 shadow-lg shadow-primary/20 uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed">
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
