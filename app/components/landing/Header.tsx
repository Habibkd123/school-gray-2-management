"use client";

import React from "react";
import Link from "next/link";
import { Menu, X, Phone, Mail } from "lucide-react";
import { usePublicSchoolInfo } from "@/app/hooks/usePublicSchoolInfo";

// Inline SVG social icons (lucide-react version may not include these)
const FacebookIcon = () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
const TwitterIcon = () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>;
const InstagramIcon = () => <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
const YoutubeIcon = () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" /></svg>;


interface ContactData {
  phone?: string;
  email?: string;
}
interface AdmissionsData {
  admission_open?: boolean;
}
interface TopBarConfig {
  show: boolean;
  phone?: string;
  email?: string;
}
interface ButtonConfig {
  show: boolean;
  text: string;
  link?: string;
}
interface SocialIcons {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
}
interface EnabledPage {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  slug?: string;
  isCustom?: boolean;
}

interface HeaderProps {
  contact?: ContactData | null;
  admissions?: AdmissionsData | null;
  // Layout nav settings
  stickyHeader?: boolean;
  topBarConfig?: TopBarConfig | null;
  admissionBtn?: ButtonConfig | null;
  loginBtn?: ButtonConfig | null;
  socialIcons?: SocialIcons | null;
  layoutType?: string;
  enabledPages?: EnabledPage[] | null;
}

// Map page id → href
const PAGE_HREFS: Record<string, string> = {
  home: "/",
  about: "/about",
  "principal-msg": "/about#principal",
  "director-msg": "/about#director",
  "vice-principal-msg": "/about#vice-principal",
  academics: "/academics",
  curriculum: "/academics#curriculum",
  faculty: "/academics#faculty",
  infrastructure: "/about#infrastructure",
  admissions: "/admissions",
  "student-life": "/student-life",
  events: "/events",
  achievements: "/achievements",
  news: "/news",
  announcements: "/news",
  gallery: "/gallery",
  "video-gallery": "/gallery",
  testimonials: "/about#testimonials",
  notices: "/notices",
  downloads: "/downloads",
  "mandatory-disclosure": "/mandatory-disclosure",
  careers: "/careers",
  alumni: "/alumni",
  faq: "/faq",
  contact: "/contact",
  "privacy-policy": "/privacy-policy",
  terms: "/terms",
};

const DEFAULT_NAV = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "Student Life", href: "/student-life" },
  { label: "News", href: "/news" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export function Header({
  contact,
  admissions,
  stickyHeader = true,
  topBarConfig = { show: true },
  admissionBtn = { show: true, text: "Apply Now", link: "/admissions" },
  loginBtn = { show: true, text: "Portal Login", link: "/login" },
  socialIcons = {},
  enabledPages = null,
}: HeaderProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { schoolInfo } = usePublicSchoolInfo();

  const phone = topBarConfig?.phone?.trim() || contact?.phone?.trim();
  const email = topBarConfig?.email?.trim() || contact?.email?.trim();
  const admissionOpen = admissions?.admission_open;
  const showTopBar = topBarConfig?.show !== false && (phone || email || admissionOpen);

  // Build nav links from enabled pages (from layout), or use defaults
  const navLinks = React.useMemo(() => {
    if (!enabledPages?.length) return DEFAULT_NAV;
    return enabledPages
      .filter((p) => p.enabled && p.id !== "home" && PAGE_HREFS[p.id])
      .sort((a, b) => a.order - b.order)
      .map((p) => ({
        label: p.label,
        href: p.isCustom ? `/${p.slug || p.id}` : (PAGE_HREFS[p.id] || `/${p.id}`),
      }))
      .slice(0, 9); // cap at 9 to avoid overflow
  }, [enabledPages]);

  const navPosition = stickyHeader ? "sticky top-0" : "relative";

  return (
    <>
      {/* ── Top Info Bar ───────────────────────────────────────── */}
      {showTopBar && (
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
                  Admissions Open {new Date().getFullYear()}–{String(new Date().getFullYear() + 1).slice(2)}
                </span>
              </>
            )}
          </div>

          {/* Right side: Quick links & Social Icons */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white transition-colors">Pay Fees Online</a>
              <span className="text-[#5C5D5D]">|</span>
              <a href="#" className="hover:text-white transition-colors">Mandatory Disclosures</a>
              <span className="text-[#5C5D5D]">|</span>
              <a href="#" className="hover:text-white transition-colors">Alumni Network</a>
            </div>

            {(socialIcons?.facebook || socialIcons?.twitter || socialIcons?.instagram || socialIcons?.youtube) && (
              <>
                <span className="text-[#5C5D5D]">|</span>
                <div className="flex items-center gap-3">
                  {socialIcons.facebook && (
                    <a href={socialIcons.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                      <FacebookIcon />
                    </a>
                  )}
                  {socialIcons.twitter && (
                    <a href={socialIcons.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                      <TwitterIcon />
                    </a>
                  )}
                  {socialIcons.instagram && (
                    <a href={socialIcons.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                      <InstagramIcon />
                    </a>
                  )}
                  {socialIcons.youtube && (
                    <a href={socialIcons.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                      <YoutubeIcon />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main Nav ──────────────────────────────────────────── */}
      <nav className={`${navPosition} left-0 right-0 z-50 bg-[#FFFFFF] shadow-md border-b-4 border-[var(--primary)] transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">

          {/* Logo & Name Link to Home */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-md border-2 border-[var(--primary)] flex items-center justify-center">
              <img src="/logo.png" alt="School Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div className="flex flex-col">
              <span className="text-[22px] font-black tracking-tight text-[#0F172A] leading-none">
                {process.env.NEXT_PUBLIC_SCHOOL_NAME || "MySchoolLife"}
              </span>
              <span className="text-[10px] font-bold tracking-widest text-[#F59E0B] uppercase">Public School</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-0 font-bold text-[13px] uppercase tracking-wide">
            {navLinks.map((item) => (
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

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {admissionBtn?.show && (
              <Link
                href={admissionBtn.link || "/admissions"}
                className="px-4 py-2 rounded-sm border-2 border-[var(--primary)] text-[var(--primary)] font-bold text-[12px] hover:bg-[var(--primary)] hover:text-white transition-all duration-300 uppercase tracking-wider"
              >
                {admissionBtn.text || "Apply Now"}
              </Link>
            )}
            {loginBtn?.show && (
              <Link
                href={loginBtn.link || "/login"}
                className="px-5 py-2 rounded-sm bg-[var(--primary)] text-white font-bold text-[13px] shadow-md hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 transition-all duration-300 uppercase tracking-wider"
              >
                {loginBtn.text || "Portal Login"}
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden p-2 text-[#0F172A]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-[#FFFFFF] border-t-2 border-[var(--primary)] shadow-2xl p-4 flex flex-col gap-0 max-h-[80vh] overflow-y-auto">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="font-bold text-[#231F20] hover:text-[var(--primary)] uppercase text-sm border-b border-[#E0E0E0] py-3 transition-colors"
              >
                {item.label}
              </Link>
            ))}

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

            {loginBtn?.show && (
              <Link
                href={loginBtn.link || "/login"}
                onClick={() => setIsOpen(false)}
                className="mt-4 w-full py-3 rounded-sm bg-[var(--primary)] text-white font-bold text-center uppercase tracking-wider"
              >
                {loginBtn.text || "Portal Login"}
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
