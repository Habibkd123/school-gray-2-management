import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "../components/landing/Header";
import { Footer } from "../components/landing/Footer";
import { getLandingData } from "@/lib/landing/getLandingData";
import { resolveSchoolMeta } from "@/lib/themes/resolveSchool";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

// ─── Dynamic per-subdomain Metadata ───────────────────────────────────────────
// Each school subdomain gets its own title, description, canonical, and
// Google Search Console verification tag. No two subdomains share the same
// canonical URL — this prevents Google from treating them as duplicates.
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const school = await resolveSchoolMeta(headersList);

  // Determine the current host for this request
  const customDomain = headersList.get("x-custom-domain") ?? "";
  const subdomain    = headersList.get("x-subdomain") ?? "";
  const hostname     = headersList.get("host")?.split(":")[0] ?? "";

  // Resolve the canonical host: custom domain > subdomain host > root
  let canonicalHost: string;
  if (customDomain) {
    canonicalHost = customDomain;
  } else if (subdomain && subdomain !== "www") {
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost");
    canonicalHost = isLocalhost
      ? `${subdomain}.localhost`
      : `${subdomain}.${ROOT_DOMAIN}`;
  } else {
    canonicalHost = hostname || ROOT_DOMAIN;
  }

  // Detect protocol
  const proto = hostname === "localhost" || hostname?.endsWith(".localhost")
    ? "http"
    : "https";
  const siteUrl = `${proto}://${canonicalHost}`;

  // ── No school found for this subdomain (main domain or unregistered) ───────
  if (!school || !school.school_id) {
    return {
      metadataBase: new URL(`https://${ROOT_DOMAIN}`),
      title: "MySchoolLife - Best School Management Software & ERP in India",
      description:
        "MySchoolLife provides complete school management software, ERP, student portals, online fees, and exam management across India.",
      keywords: [
        "School Management Software India",
        "School ERP India",
        "Student Portal",
        "Online Fee Payment",
        "Exam Management System",
        "myschoollife",
      ],
      robots: { index: true, follow: true },
      alternates: { canonical: `https://${ROOT_DOMAIN}` },
      openGraph: {
        title: "MySchoolLife - Best School Management Software & ERP in India",
        description:
          "MySchoolLife provides complete school management software, ERP, student portals, online fees, and exam management across India.",
        url: `https://${ROOT_DOMAIN}`,
        siteName: "MySchoolLife",
        locale: "en_IN",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "MySchoolLife - Best School Management Software & ERP in India",
        description:
          "MySchoolLife provides complete school management software, ERP, student portals, online fees, and exam management across India.",
      },
      icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
      },
    };
  }

  // ── School found — build fully dynamic, subdomain-specific metadata ─────────
  const schoolName  = school.name;
  const title       = school.meta_title
    || `${schoolName} | Official Website & Admissions`;
  const description = school.meta_desc
    || `Welcome to ${schoolName}. Explore admissions, academics, news, gallery and more.`;
  const keywords    = school.meta_kw
    ? school.meta_kw.split(",").map((k) => k.trim()).filter(Boolean)
    : [schoolName, "school website", "admissions", "myschoollife"];

  // Canonical: school-specified override takes priority, else use computed host
  const canonical = school.canonical_url || siteUrl;
  const faviconUrl = school.favicon || "/favicon.ico";

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    alternates: {
      canonical,
    },
    // ── Google Search Console verification (school-specific token) ───────────
    ...(school.google_site_verification && {
      verification: {
        google: school.google_site_verification,
      },
    }),
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: schoolName,
      locale: "en_IN",
      type: "website",
      ...(school.og_image && {
        images: [
          {
            url: school.og_image,
            width: 1200,
            height: 630,
            alt: schoolName,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(school.og_image && { images: [school.og_image] }),
    },
    // ── Custom favicon per school ────────────────────────────────────────────
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  };
}

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, school] = await Promise.all([
    getLandingData(),
    resolveSchoolMeta(await headers()),
  ]);

  return (
    <div className="min-h-screen bg-white flex flex-col dark:bg-slate-900">
      <Header
        contact={data?.contact ?? null}
        admissions={data?.admissions ?? null}
        schoolName={school?.name ?? null}
        schoolSubtitle={school?.subtitle ?? null}
        logoUrl={school?.logo_url || school?.favicon || school?.og_image || null}
      />
      <div className="flex-grow">
        {children}
      </div>
      <Footer
        contact={data?.contact ?? null}
        about={data?.about ?? null}
        admissions={data?.admissions ?? null}
      />
    </div>
  );
}
