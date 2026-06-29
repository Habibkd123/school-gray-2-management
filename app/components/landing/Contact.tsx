"use client";

import React, { useState } from "react";
import { MapPin, Phone, Mail, Globe, Loader2, CheckCircle2, AlertCircle, ExternalLink, Share2, Video, Link2, MessageSquare, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

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

  const address = data?.address;
  const phone = data?.phone;
  const email = data?.email;
  const website = data?.website;
  const mapUrl = data?.map_embed_url;
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

  if (!address && !phone && !email && !website && !mapUrl && !social.facebook && !social.twitter && !social.instagram && !social.youtube) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-[var(--section-alt)]">
      
      {/* Background styling */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 rounded-lg bg-primary/10 dark:bg-white/5 border border-primary/20 dark:border-white/10"
          >
            <span className="text-xs font-bold text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Get in Touch
            </span>
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight"
          >
            Contact Admissions
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-text leading-relaxed font-light max-w-2xl mx-auto"
          >
            Our team is ready to answer your questions and guide you through the admissions process.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          
          {/* Left: Contact Info */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {address && (
              <motion.div variants={itemVariants} className="bg-white/60 dark:bg-white/5 backdrop-blur-xl p-8 rounded-xl border border-slate-200 dark:border-white/10 flex items-start gap-6 group hover:bg-white/85 transition-colors duration-300 shadow-md">
                <div className="w-14 h-14 rounded-lg bg-primary/10 dark:bg-white/5 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] flex items-center justify-center shrink-0 border border-primary/20 dark:border-white/10 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-2 text-lg">Campus Address</h4>
                  <p className="text-muted-text text-sm whitespace-pre-line leading-relaxed">{address}</p>
                </div>
              </motion.div>
            )}

            {phone && (
              <motion.div variants={itemVariants} className="bg-white/60 dark:bg-white/5 backdrop-blur-xl p-8 rounded-xl border border-slate-200 dark:border-white/10 flex items-start gap-6 group hover:bg-white/85 transition-colors duration-300 shadow-md">
                <div className="w-14 h-14 rounded-lg bg-primary/10 dark:bg-white/5 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] flex items-center justify-center shrink-0 border border-primary/20 dark:border-white/10 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-2 text-lg">Contact Numbers</h4>
                  <p className="text-muted-text text-sm">
                    <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">
                      {phone}
                    </a>
                  </p>
                </div>
              </motion.div>
            )}

            {email && (
              <motion.div variants={itemVariants} className="bg-white/60 dark:bg-white/5 backdrop-blur-xl p-8 rounded-xl border border-slate-200 dark:border-white/10 flex items-start gap-6 group hover:bg-white/85 transition-colors duration-300 shadow-md">
                <div className="w-14 h-14 rounded-lg bg-primary/10 dark:bg-white/5 text-primary dark:text-[color-mix(in_srgb,var(--primary)_40%,white)] flex items-center justify-center shrink-0 border border-primary/20 dark:border-white/10 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-2 text-lg">Email Address</h4>
                  <p className="text-muted-text text-sm mb-1">
                    <a href={`mailto:${email}`} className="hover:text-primary transition-colors">{email}</a>
                  </p>
                  {website && (
                    <p className="text-muted-text text-sm mt-2">
                      <a href={website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
                        <Globe className="w-4 h-4" /> {website}
                      </a>
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {(social.facebook || social.twitter || social.instagram || social.youtube) && (
              <motion.div variants={itemVariants} className="flex items-center gap-4 pt-4 px-2">
                <span className="text-xs font-bold text-muted-text/80 uppercase tracking-widest">Connect:</span>
                {social.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 dark:bg-white/5 text-foreground hover:bg-primary hover:text-white transition-colors border border-slate-200 dark:border-white/10">
                    <Share2 className="w-4 h-4" />
                  </a>
                )}
                {social.twitter && (
                  <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 dark:bg-white/5 text-foreground hover:bg-primary hover:text-white transition-colors border border-slate-200 dark:border-white/10">
                    <Link2 className="w-4 h-4" />
                  </a>
                )}
                {social.instagram && (
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 dark:bg-white/5 text-foreground hover:bg-primary hover:text-white transition-colors border border-slate-200 dark:border-white/10">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {social.youtube && (
                  <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 dark:bg-white/5 text-foreground hover:bg-primary hover:text-white transition-colors border border-slate-200 dark:border-white/10">
                    <Video className="w-4 h-4" />
                  </a>
                )}
              </motion.div>
            )}

            {mapUrl && (
              <motion.div variants={itemVariants} className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg h-56 mt-6">
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
              </motion.div>
            )}
          </motion.div>

          {/* Right: Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-white/80 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 p-10 lg:p-12 rounded-xl shadow-lg relative"
          >
            <h4 className="text-3xl font-bold text-foreground mb-8">Send an Enquiry</h4>

            {status === "success" && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{message}</p>
              </motion.div>
            )}
            {status === "error" && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{message}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-text/80 uppercase tracking-widest pl-1">Parent's Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-lg px-5 py-4 text-foreground placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-primary focus:bg-white transition-all" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-text/80 uppercase tracking-widest pl-1">Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-lg px-5 py-4 text-foreground placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-primary focus:bg-white transition-all" placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-text/80 uppercase tracking-widest pl-1">Email Address</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-lg px-5 py-4 text-foreground placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-primary focus:bg-white transition-all" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-text/80 uppercase tracking-widest pl-1">Grade Applying For</label>
                <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-lg px-5 py-4 text-foreground focus:outline-none focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer [&>option]:bg-white dark:[&>option]:bg-slate-950">
                  <option>Pre-Primary</option>
                  <option>Primary (I-V)</option>
                  <option>Middle (VI-VIII)</option>
                  <option>Secondary (IX-X)</option>
                  <option>Senior Secondary (XI-XII)</option>
                </select>
              </div>
              
              <button 
                type="submit" 
                disabled={status === "loading"} 
                className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-lg hover:shadow-[0_0_25px_var(--primary)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {status === "loading" ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    Submit Enquiry
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
