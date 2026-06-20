"use client";

import React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function Header() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      {/* Top Bar for Affiliation & Quick Links */}
      <div className="hidden lg:flex bg-[#0F172A] text-white/80 py-2 px-6 text-[12px] font-medium justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Admissions Open 2024-25</span>
          <span className="text-white/30">|</span>
          <span>Affiliated to CBSE, New Delhi (Affiliation No. 1234567)</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-[#F59E0B] transition-colors">Pay Fees Online</a>
          <a href="#" className="hover:text-[#F59E0B] transition-colors">Mandatory Disclosures</a>
          <a href="#" className="hover:text-[#F59E0B] transition-colors">Alumni Network</a>
        </div>
      </div>

      <nav className="sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-md border-2 border-[#0F172A] flex items-center justify-center">
              <img src="/logo.png" alt="MySchoolLife Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div className="flex flex-col">
              <span className="text-[22px] font-black tracking-tight text-[#0F172A] leading-none">
                MySchoolLife
              </span>
              <span className="text-[10px] font-bold tracking-widest text-[#F59E0B] uppercase">Public School</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6 font-bold text-[13px] uppercase tracking-wide">
            <Link href="/" className="text-slate-800 hover:text-[#F59E0B] transition-colors">Home</Link>
            <Link href="/about" className="text-slate-800 hover:text-[#F59E0B] transition-colors">About Us</Link>
            <Link href="/academics" className="text-slate-800 hover:text-[#F59E0B] transition-colors">Academics</Link>
            <Link href="/admissions" className="text-slate-800 hover:text-[#F59E0B] transition-colors">Admissions</Link>
            <Link href="/student-life" className="text-slate-800 hover:text-[#F59E0B] transition-colors">Student Life</Link>
            <Link href="/news" className="text-slate-800 hover:text-[#F59E0B] transition-colors">News</Link>
            <Link href="/gallery" className="text-slate-800 hover:text-[#F59E0B] transition-colors">Gallery</Link>
            <Link href="/contact" className="text-slate-800 hover:text-[#F59E0B] transition-colors">Contact</Link>
          </div>

          {/* Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            {/* <button className="px-6 py-2.5 rounded-sm border-2 border-[#0F172A] text-[#0F172A] font-bold text-[14px] hover:bg-[#0F172A] hover:text-white transition-all duration-300">
              Apply Now
            </button> */}
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-sm bg-[#F59E0B] text-white font-bold text-[14px] shadow-lg shadow-[#F59E0B]/30 hover:bg-[#D97706] hover:-translate-y-0.5 transition-all duration-300"
            >
              Login
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-[#0F172A]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-2xl p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <Link href="/" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] uppercase text-sm border-b border-slate-100 pb-2">Home</Link>
            <Link href="/about" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] uppercase text-sm border-b border-slate-100 pb-2">About Us</Link>
            <Link href="/academics" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] uppercase text-sm border-b border-slate-100 pb-2">Academics</Link>
            <Link href="/admissions" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] uppercase text-sm border-b border-slate-100 pb-2">Admissions</Link>
            <Link href="/student-life" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] uppercase text-sm border-b border-slate-100 pb-2">Student Life</Link>
            <Link href="/news" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] uppercase text-sm border-b border-slate-100 pb-2">News</Link>
            <Link href="/gallery" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] uppercase text-sm border-b border-slate-100 pb-2">Gallery</Link>
            <Link href="/contact" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] uppercase text-sm border-b border-slate-100 pb-2">Contact</Link>

            {/* Quick Links for Mobile */}
            <div className="pt-2 flex flex-col gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Links</span>
              <a href="#" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] text-sm">Pay Fees Online</a>
              <a href="#" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] text-sm">Mandatory Disclosures</a>
              <a href="#" onClick={() => setIsOpen(false)} className="font-bold text-[#0F172A] text-sm">Alumni Network</a>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              {/* <button className="w-full py-3 rounded-sm border-2 border-[#0F172A] text-[#0F172A] font-bold">Apply Now</button> */}
              <Link href="/login" onClick={() => setIsOpen(false)} className="w-full py-3 rounded-sm bg-[#F59E0B] text-white font-bold text-center"> Login</Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
