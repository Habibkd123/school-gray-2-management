import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AppProvider } from "./context/store";
import { AuthProvider } from "./context/auth";
import { ThemeProvider } from "./providers";
import { RootThemeProvider } from "./components/RootThemeProvider";
import { ServerThemeStyles } from "./components/ServerThemeStyles";
import { resolveSchoolMeta } from "@/lib/themes/resolveSchool";
import { getSubdomainHost } from "@/lib/utils/subdomain";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL     || `https://www.${ROOT_DOMAIN}`;

// ─── Dynamic Metadata per Subdomain ──────────────────────────────────────────
// resolveSchoolMeta() uses a 10-min in-memory cache shared with resolveSchoolIdServer()
// → on cache HIT: zero DB queries. on cache MISS: ONE query, then cached for 10 min.
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const school      = await resolveSchoolMeta(headersList);

  if (!school || !school.school_id) {
    return {
      metadataBase: new URL(APP_URL),
      title: "Portal | My School Life",
      description:
        "A premium, unified dashboard for managing school operations, attendance, grading, billing, and scheduling.",
      keywords: ["school management", "ERP", "myschoollife", "school portal"],
      openGraph: {
        type: "website",
        url: APP_URL,
        siteName: "My School Life",
        title: "Portal | My School Life",
        description: "A premium, unified dashboard for managing school operations.",
      },
      icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
      },
    };
  }

  const sub     = headersList.get("x-subdomain")    ?? "";
  const custDom = headersList.get("x-custom-domain") ?? "";
  const host    = custDom || getSubdomainHost(sub, false);
  const siteUrl = `https://${host}`;

  const title       = school.meta_title || `${school.name} | Portal`;
  const description = school.meta_desc  || `Official ERP portal of ${school.name}.`;
  const keywords    = school.meta_kw
    ? school.meta_kw.split(",").map((k) => k.trim()).filter(Boolean)
    : [school.name, "school portal", "myschoollife"];

  const faviconUrl = school.favicon || "/favicon.ico";

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords,
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: school.name,
      title,
      description,
      ...(school.og_image && {
        images: [
          {
            url: school.og_image,
            width: 1200,
            height: 630,
            alt: school.name,
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
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  };
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const school      = await resolveSchoolMeta(headersList);
  const faviconUrl  = school?.favicon || "/favicon.ico";

  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Dynamic per-school favicon link directly in head for instant browser recognition */}
        <link rel="icon" href={faviconUrl} sizes="any" />
        <link rel="shortcut icon" href={faviconUrl} />
        <link rel="apple-touch-icon" href={faviconUrl} />
        {/* Theme CSS vars injected before any body content — zero FOUC */}
        <ServerThemeStyles />
        {/* Roboto font — loaded at runtime via CDN so build is not blocked */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* DNS prefetch for CDNs used for uploaded images / avatars */}
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <link rel="dns-prefetch" href="//ui-avatars.com" />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
          <RootThemeProvider>
            <AuthProvider>
              <AppProvider>{children}</AppProvider>
            </AuthProvider>
          </RootThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
