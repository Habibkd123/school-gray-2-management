"use client";

import React from "react";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { usePublicSchoolInfo } from "@/app/hooks/usePublicSchoolInfo";

export function Footer() {
  const { schoolInfo } = usePublicSchoolInfo();
  return (
    <footer className="bg-[#231F20] text-[#CCCCCC]">
      
      {/* ── Red Top Bar ─────────────────────────────────── */}
      <div className="w-full h-1 bg-[var(--primary)]" />

      {/* ── Pre-Footer CTA Strip ─────────────────────────── */}
      <div className="bg-[var(--primary)] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1">
              New Academic Year 2026-27
            </div>
            <div className="text-[22px] font-black text-white">
              Admissions are now open — Apply Today!
            </div>
          </div>
          <a
            href="#admissions"
            className="flex-shrink-0 px-8 py-3 rounded-sm bg-[#231F20] text-white font-bold text-[14px] hover:bg-[#07070A] transition-colors uppercase tracking-wider border border-white/20"
          >
            Apply Now →
          </a>
        </div>
      </div>

      {/* ── Main Footer ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand Column */}
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center p-1 border-2 border-[var(--primary)]">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-[20px] font-black tracking-tight text-white leading-none">
                  {schoolInfo.school_name}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-[var(--primary)] uppercase">
                  {schoolInfo.school_subtitle}
                </span>
              </div>
            </div>
            <p className="leading-relaxed mb-5 text-[13px] text-[#999999]">
              Affiliated to CBSE, New Delhi.<br />
              Affiliation No: 1234567<br />
              School Code: 98765
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {[FacebookIcon, TwitterIcon, InstagramIcon, LinkedinIcon].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-sm bg-[#07070A] border border-[#5C5D5D] flex items-center justify-center hover:bg-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-black text-white mb-5 text-[14px] uppercase tracking-wider flex items-center gap-2">
              <span className="w-4 h-0.5 bg-[var(--primary)] inline-block" />
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-[13px]">
              {[
                "About Management", "Admission Enquiry",
                "Fee Structure 2025-26", "CBSE Mandatory Disclosures",
                "Transfer Certificate List", "Student Login",
              ].map((link) => (
                <li key={link}>
                  <a href="#" className="flex items-center gap-2 text-[#999999] hover:text-[var(--primary)] transition-colors group">
                    <span className="w-1 h-1 rounded-full bg-[var(--primary)] group-hover:w-2 transition-all" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Academics */}
          <div>
            <h4 className="font-black text-white mb-5 text-[14px] uppercase tracking-wider flex items-center gap-2">
              <span className="w-4 h-0.5 bg-[var(--primary)] inline-block" />
              Academics
            </h4>
            <ul className="space-y-2.5 text-[13px]">
              {[
                "Pre-Primary Wing", "Primary Wing",
                "Middle Wing", "Secondary Wing",
                "Senior Secondary Wing", "Sports & Co-curricular",
              ].map((link) => (
                <li key={link}>
                  <a href="#" className="flex items-center gap-2 text-[#999999] hover:text-[var(--primary)] transition-colors group">
                    <span className="w-1 h-1 rounded-full bg-[var(--primary)] group-hover:w-2 transition-all" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-black text-white mb-5 text-[14px] uppercase tracking-wider flex items-center gap-2">
              <span className="w-4 h-0.5 bg-[var(--primary)] inline-block" />
              Contact Us
            </h4>
            <ul className="space-y-4 text-[13px]">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                <span className="text-[#999999]">Sector 62, Knowledge Park,<br />New Delhi, 110001, India</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <a href="tel:+919876543210" className="text-[#999999] hover:text-[#0088CC] transition-colors">+91 98765 43210</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <a href="mailto:info@myschoollife.edu.in" className="text-[#999999] hover:text-[#0088CC] transition-colors">info@myschoollife.edu.in</a>
              </li>
              <li>
                <a href="#" className="inline-flex items-center gap-1.5 text-[#0088CC] hover:underline text-[13px] font-semibold">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on Google Maps
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Bottom Bar ─────────────────────────────────── */}
        <div className="pt-6 border-t border-[#5C5D5D]/50 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px]">
          <p className="text-[#828283]">Copyright © {new Date().getFullYear()} {schoolInfo.school_name} {schoolInfo.school_subtitle}. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[#828283]">
            {["Privacy Policy", "Terms of Service", "Sitemap"].map((item, i, arr) => (
              <React.Fragment key={item}>
                <a href="#" className="hover:text-[var(--primary)] transition-colors">{item}</a>
                {i < arr.length - 1 && <span className="text-[#5C5D5D]">·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  );
}
function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
    </svg>
  );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}
function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
}
