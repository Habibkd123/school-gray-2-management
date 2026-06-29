"use client";

import React from "react";
import Link from "next/link";
import { Menu, X, Phone, Mail } from "lucide-react";
import { usePublicSchoolInfo } from "@/app/hooks/usePublicSchoolInfo";

interface ContactData {
  phone?: string;
  email?: string;
}

interface AdmissionsData {
  admission_open?: boolean;
}

interface HeaderProps {
  contact?: ContactData | null;
  admissions?: AdmissionsData | null;
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "Student Life", href: "/student-life" },
  { label: "News", href: "/news" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export function Header({ contact, admissions }: HeaderProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { schoolInfo } = usePublicSchoolInfo();

  const phone = contact?.phone?.trim();
  const email = contact?.email?.trim();
  const admissionOpen = admissions?.admission_open;

  const hasTopBar = phone || email || admissionOpen;

  return (
    <>
      {/* ── Top Info Bar — only if contact/admission info exists ─────────────────── */}
      {hasTopBar && (
        <div className="hidden lg:flex bg-[#231F20] text-[#CCCCCC] py-2 px-6 text-[12px] font-medium justify-between items-center border-b border-[#5C5D5D]">
          <div className="flex items-center gap-6">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-3 h-3 text-[var(--primary)]" />
                {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Mail className="w-3 h-3 text-[var(--primary)]" />
                {email}
              </a>
            )}
            {admissionOpen && (
              <>
                {(phone || email) && <span className="text-[#5C5D5D]">|</span>}
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1FC16B]" />
                  Admissions Open {new Date().getFullYear()}-{String(new Date().getFullYear() + 1).slice(2)}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main Nav ─────────────────────────────────────── */}
      <nav className="sticky top-0 left-0 right-0 z-50 bg-[#FFFFFF] shadow-md border-b-4 border-[var(--primary)] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-md border-2 border-[var(--primary)] flex items-center justify-center dark:bg-slate-900">
              <img src="/logo.png" alt="School Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-black tracking-tight text-[#231F20] leading-none">
                {schoolInfo.school_name}
              </span>
              <span className="text-[10px] font-bold tracking-widest text-[var(--primary)] uppercase">
                {schoolInfo.school_subtitle}
              </span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-0 font-bold text-[13px] uppercase tracking-wide">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-3 py-2 text-[#231F20] hover:text-[var(--primary)] transition-colors duration-200 group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--primary)] group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-sm bg-[var(--primary)] text-white font-bold text-[13px] shadow-md hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 transition-all duration-300 uppercase tracking-wider"
            >
              Login Portal
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-[#231F20] hover:text-[var(--primary)] transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-[#FFFFFF] border-t-2 border-[var(--primary)] shadow-2xl p-4 flex flex-col gap-0 max-h-[80vh] overflow-y-auto">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="font-bold text-[#231F20] hover:text-[var(--primary)] uppercase text-sm border-b border-[#E0E0E0] py-3 transition-colors"
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile contact info */}
            {(phone || email) && (
              <div className="pt-3 flex flex-col gap-2">
                <span className="text-[10px] font-black text-[#999999] uppercase tracking-widest">Contact</span>
                {phone && (
                  <a href={`tel:${phone}`} className="text-[#0088CC] font-medium text-sm hover:underline flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />{phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="text-[#0088CC] font-medium text-sm hover:underline flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />{email}
                  </a>
                )}
              </div>
            )}

            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="mt-4 w-full py-3 rounded-sm bg-[var(--primary)] text-white font-bold text-center uppercase tracking-wider"
            >
              Login Portal
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
