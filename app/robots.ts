import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

// Resolve the base URL from the incoming request host so each subdomain
// gets its own robots.txt with the correct sitemap URL.
async function resolveBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const customDomain = headersList.get("x-custom-domain") ?? "";
    const subdomain    = headersList.get("x-subdomain") ?? "";
    const hostname     = headersList.get("host")?.split(":")[0] ?? "";

    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost");
    const proto = isLocalhost ? "http" : "https";

    if (customDomain) return `${proto}://${customDomain}`;

    if (subdomain && subdomain !== "www") {
      const host = isLocalhost
        ? `${subdomain}.localhost`
        : `${subdomain}.${ROOT_DOMAIN}`;
      return `${proto}://${host}`;
    }

    if (hostname) return `${proto}://${hostname}`;
  } catch {
    // Outside request context (static export)
  }

  return `https://${ROOT_DOMAIN}`;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await resolveBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/login/",
          "/register/",
          "/reset-password/",
          "/forget-password/",
          "/email-verification/",
          "/two-step-verification/",
          "/student/",
          "/salary/",
          "/super-admin/",
          "/documents/",
          "/fees/",
          "/attendance/",
          "/examination/",
          "/reports/",
          "/academic/",
          "/leave/",
          "/maintenance/",
          "/error-500/",
        ],
      },
    ],
    // Each subdomain's robots.txt points to its own sitemap
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
