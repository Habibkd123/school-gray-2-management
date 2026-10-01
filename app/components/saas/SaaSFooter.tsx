"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, Mail, Phone, MapPin, ArrowRight, ShieldCheck } from "lucide-react";

export function SaaSFooter() {
  return (
    <footer className="bg-[#06080E] text-slate-300 border-t border-slate-800/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 text-amber-400 flex items-center justify-center font-bold text-lg shadow-inner">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold tracking-tight text-white block leading-none">
                    MySchoolLife
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                    OS
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 tracking-wider font-medium uppercase mt-0.5 block">
                  Campus Cloud Platform
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              Purpose-built school operating system powering dedicated subdomains, digital admissions, automated CBSE/State board marksheets, instant UPI fee reconciliation, and parent communication.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-Tenant Cloud Isolation • Encrypted Student Data</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <a href="#features" className="hover:text-amber-400 transition-colors">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#preview" className="hover:text-amber-400 transition-colors">
                  Portal Mockup
                </a>
              </li>
              <li>
                <a href="#schools" className="hover:text-amber-400 transition-colors">
                  Partner Schools
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-amber-400 transition-colors">
                  ROI Calculator
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-amber-400 transition-colors">
                  Subscription Plans
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-amber-400 transition-colors">
                  School Staff Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Core Modules */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">
              Core Modules
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>Digital Paperless Admissions</li>
              <li>Smart Fee ERP &amp; UPI Receipts</li>
              <li>Class Routine &amp; Timetable</li>
              <li>30-Sec Classroom Attendance</li>
              <li>Automated Report Cards</li>
              <li>Parent WhatsApp / SMS Engine</li>
            </ul>
          </div>

          {/* Contact Support */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">
              Contact &amp; Onboarding
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="mailto:support@myschoollife.in" className="hover:text-white transition-colors">
                  support@myschoollife.in
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="tel:+919928194118" className="hover:text-white transition-colors">
                  +91 99281 94118
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Rajasthan, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 MySchoolLife Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Tenant SLA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
