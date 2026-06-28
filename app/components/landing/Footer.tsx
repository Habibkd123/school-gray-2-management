import React from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { usePublicSchoolInfo } from "@/app/hooks/usePublicSchoolInfo";

interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
}

interface ContactData {
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  map_embed_url?: string;
  social?: SocialLinks;
}

interface AboutData {
  affiliation_name?: string;
  affiliation_number?: string;
  school_code?: string;
  admission_year_label?: string;
}

interface AdmissionsData {
  admission_open?: boolean;
  apply_url?: string;
}

interface FooterProps {
  contact?: ContactData | null;
  about?: AboutData | null;
  admissions?: AdmissionsData | null;
  // Layout config footer settings (optional)
  footerConfig?: {
    copyrightText?: string;
    showNewsletter?: boolean;
    showMap?: boolean;
    layoutType?: string;
  } | null;
  // Social icons from layout config (supplement contact.social)
  socialIcons?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  } | null;
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
];
const FOOTER_LINKS = [

  { label: "Infrastructure", href: "/about/infrastructure" },
  { label: "News & Notices", href: "/news" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export function Footer({ contact, about, admissions, footerConfig, socialIcons: layoutSocialIcons }: FooterProps) {
  const { schoolInfo } = usePublicSchoolInfo();

  const address = contact?.address?.trim();
  const phone = contact?.phone?.trim();
  const email = contact?.email?.trim();
  const mapUrl = contact?.map_embed_url?.trim();

  // Merge social icons: prefer landing contact.social, supplement with layout config socialIcons
  const social = {
    facebook: contact?.social?.facebook || layoutSocialIcons?.facebook || '',
    twitter: contact?.social?.twitter || layoutSocialIcons?.twitter || '',
    instagram: contact?.social?.instagram || layoutSocialIcons?.instagram || '',
    youtube: contact?.social?.youtube || layoutSocialIcons?.youtube || '',
  };

  const copyrightText = footerConfig?.copyrightText || null;

  const affiliationName = about?.affiliation_name?.trim();
  const affiliationNumber = about?.affiliation_number?.trim();
  const schoolCode = about?.school_code?.trim();
  const admissionYearLabel = about?.admission_year_label?.trim();

  const admissionOpen = admissions?.admission_open;
  const applyUrl = admissions?.apply_url?.trim() || "#admissions";

  const hasSocial = social && (social.facebook || social.twitter || social.instagram || social.youtube);
  const hasAffiliation = affiliationName || affiliationNumber || schoolCode;
  const hasContact = address || phone || email || mapUrl;
  const showAdmissionCTA = admissionOpen;

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

            {/* Affiliation info — only if filled */}
            {hasAffiliation && (
              <p className="leading-relaxed mb-5 text-[13px] text-[#999999]">
                {affiliationName && <>Affiliated to {affiliationName}.<br /></>}
                {affiliationNumber && <>Affiliation No: {affiliationNumber}<br /></>}
                {schoolCode && <>School Code: {schoolCode}</>}
              </p>
            )}

            {/* Social Icons — only those filled */}
            {hasSocial && (
              <div className="flex items-center gap-3">
                {social?.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-sm bg-[#07070A] border border-[#5C5D5D] flex items-center justify-center hover:bg-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                  </a>
                )}
                {social?.twitter && (
                  <a href={social.twitter} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-sm bg-[#07070A] border border-[#5C5D5D] flex items-center justify-center hover:bg-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
                  </a>
                )}
                {social?.instagram && (
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-sm bg-[#07070A] border border-[#5C5D5D] flex items-center justify-center hover:bg-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                  </a>
                )}
                {social?.youtube && (
                  <a href={social.youtube} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-sm bg-[#07070A] border border-[#5C5D5D] flex items-center justify-center hover:bg-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" /></svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-black text-white mb-5 text-[14px] uppercase tracking-wider flex items-center gap-2">
              <span className="w-4 h-0.5 bg-[var(--primary)] inline-block" />
              Site Links
            </h4>
            <ul className="space-y-2.5 text-[13px]">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex items-center gap-2 text-[#999999] hover:text-[var(--primary)] transition-colors group">
                    <span className="w-1 h-1 rounded-full bg-[var(--primary)] group-hover:w-2 transition-all" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-black text-white mb-5 text-[14px] uppercase tracking-wider flex items-center gap-2">
              <span className="w-4 h-0.5 bg-[var(--primary)] inline-block" />
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-[13px]">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex items-center gap-2 text-[#999999] hover:text-[var(--primary)] transition-colors group">
                    <span className="w-1 h-1 rounded-full bg-[var(--primary)] group-hover:w-2 transition-all" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info — only if contact data filled */}
          {hasContact && (
            <div>
              <h4 className="font-black text-white mb-5 text-[14px] uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-0.5 bg-[var(--primary)] inline-block" />
                Contact Us
              </h4>
              <ul className="space-y-4 text-[13px]">
                {address && (
                  <li className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                    <span className="text-[#999999] leading-relaxed">{address}</span>
                  </li>
                )}
                {phone && (
                  <li className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[var(--primary)] shrink-0" />
                    <a href={`tel:${phone}`} className="text-[#999999] hover:text-[#0088CC] transition-colors">{phone}</a>
                  </li>
                )}
                {email && (
                  <li className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[var(--primary)] shrink-0" />
                    <a href={`mailto:${email}`} className="text-[#999999] hover:text-[#0088CC] transition-colors">{email}</a>
                  </li>
                )}
                {mapUrl && (
                  <li>
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#0088CC] hover:underline text-[13px] font-semibold">
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on Google Maps
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ── Bottom Bar ─────────────────────────────────── */}
        <div className="pt-6 border-t border-[#5C5D5D]/50 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px]">
          <p className="text-[#828283]">
            Copyright © {new Date().getFullYear()} {schoolInfo.school_name}
            {schoolInfo.school_subtitle ? ` ${schoolInfo.school_subtitle}` : ""}.
            {copyrightText ? ` ${copyrightText}` : " All rights reserved."}
          </p>
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
