import React from "react";
import { MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#020617] pt-20 pb-10 border-t border-slate-800 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          <div className="col-span-1 lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center p-1 border-2 border-slate-700">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-[22px] font-black tracking-tight text-white leading-none">
                  MySchoolLife
                </span>
                <span className="text-[10px] font-bold tracking-widest text-[#F59E0B] uppercase">Public School</span>
              </div>
            </div>
            <p className="leading-relaxed mb-6 text-[14px]">
              Affiliated to CBSE, New Delhi.<br/>Affiliation No: 1234567<br/>School Code: 98765
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#F59E0B] hover:text-white transition-colors"><FacebookIcon className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#F59E0B] hover:text-white transition-colors"><TwitterIcon className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#F59E0B] hover:text-white transition-colors"><InstagramIcon className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#F59E0B] hover:text-white transition-colors"><LinkedinIcon className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 text-[16px] uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3 font-medium text-[14px]">
              <li><a href="#about" className="hover:text-[#F59E0B] transition-colors">About Management</a></li>
              <li><a href="#admissions" className="hover:text-[#F59E0B] transition-colors">Admission Enquiry</a></li>
              <li><a href="#" className="hover:text-[#F59E0B] transition-colors">Fee Structure 2024-25</a></li>
              <li><a href="#" className="hover:text-[#F59E0B] transition-colors">CBSE Mandatory Public Disclosures</a></li>
              <li><a href="#" className="hover:text-[#F59E0B] transition-colors">Transfer Certificate (TC) List</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 text-[16px] uppercase tracking-wider">Academics</h4>
            <ul className="space-y-3 font-medium text-[14px]">
              <li><a href="#" className="hover:text-[#F59E0B] transition-colors">Pre-Primary Wing</a></li>
              <li><a href="#" className="hover:text-[#F59E0B] transition-colors">Primary Wing</a></li>
              <li><a href="#" className="hover:text-[#F59E0B] transition-colors">Middle Wing</a></li>
              <li><a href="#" className="hover:text-[#F59E0B] transition-colors">Secondary Wing</a></li>
              <li><a href="#" className="hover:text-[#F59E0B] transition-colors">Senior Secondary Wing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 text-[16px] uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-4 font-medium text-[14px]">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                <span>Sector 62, Knowledge Park,<br />New Delhi, 110001, India</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#F59E0B] shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#F59E0B] shrink-0" />
                <span>info@MySchoolLife.edu.in</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] font-medium">
          <p>Copyright © 2024 MySchoolLife Public School. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#F59E0B] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#F59E0B] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#F59E0B] transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FacebookIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  );
}

function TwitterIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
    </svg>
  );
}

function InstagramIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

function LinkedinIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
}
