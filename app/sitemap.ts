import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

interface DiscoveredRoute {
  route: string;
  lastModified: Date;
}

// Fallback list of verified public routes in case filesystem is restricted at runtime
const VERIFIED_PUBLIC_ROUTES = [
  "/",
  "/about",
  "/about/history",
  "/about/infrastructure",
  "/about/management",
  "/about/vision-mission",
  "/academics",
  "/academics/calendar",
  "/academics/class-structure",
  "/academics/curriculum",
  "/academics/faculty",
  "/admissions",
  "/admissions/apply",
  "/admissions/documents",
  "/admissions/fee-structure",
  "/admissions/online-form",
  "/contact",
  "/gallery",
  "/gallery/photos",
  "/gallery/videos",
  "/news",
  "/news/announcements",
  "/news/circulars",
  "/news/results",
  "/student-life",
  "/student-life/achievements",
  "/student-life/clubs",
  "/student-life/cultural",
  "/student-life/sports",
];

function discoverWebsiteRoutes(dir: string, baseRoute = ""): DiscoveredRoute[] {
  let routes: DiscoveredRoute[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        routes = routes.concat(
          discoverWebsiteRoutes(
            path.join(dir, entry.name),
            `${baseRoute}/${entry.name}`,
          ),
        );
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        const routePath = baseRoute === "" ? "/" : baseRoute;
        const filePath = path.join(dir, entry.name);
        const stat = fs.statSync(filePath);
        routes.push({
          route: routePath,
          lastModified: stat.mtime,
        });
      }
    }
  } catch {
    return [];
  }
  return routes;
}

function getRouteMetadata(route: string): {
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
} {
  if (route === "/") {
    return { changeFrequency: "weekly", priority: 1.0 };
  }
  if (["/admissions", "/news", "/contact"].includes(route)) {
    return { changeFrequency: "weekly", priority: 0.8 };
  }
  if (["/about", "/academics", "/gallery", "/student-life"].includes(route)) {
    return { changeFrequency: "monthly", priority: 0.8 };
  }
  if (route.startsWith("/news/") || route.startsWith("/admissions/")) {
    return { changeFrequency: "weekly", priority: 0.7 };
  }
  return { changeFrequency: "monthly", priority: 0.7 };
}

// Resolve the base URL dynamically from the incoming request host.
// This ensures bajrang.myschoollife.in/sitemap.xml contains
// https://bajrang.myschoollife.in/... URLs — not hardcoded main domain URLs.
async function resolveBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const customDomain = headersList.get("x-custom-domain") ?? "";
    const subdomain    = headersList.get("x-subdomain") ?? "";
    const hostname     = headersList.get("host")?.split(":")[0] ?? "";

    // Detect localhost / dev environment
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

    // Fallback: use the host header directly (production root or localhost)
    if (hostname) return `${proto}://${hostname}`;
  } catch {
    // headers() throws outside a request context (e.g., static export)
  }

  return `https://${ROOT_DOMAIN}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await resolveBaseUrl();

  const websiteDir = path.join(process.cwd(), "app", "(website)");
  const discovered = discoverWebsiteRoutes(websiteDir);

  // Use discovered routes if found; fallback to verified list
  const routesToUse: DiscoveredRoute[] =
    discovered.length > 0
      ? discovered
      : VERIFIED_PUBLIC_ROUTES.map((route) => ({
          route,
          lastModified: new Date(),
        }));

  // Ensure unique routes and sort with root first
  const uniqueMap = new Map<string, Date>();
  for (const item of routesToUse) {
    if (!uniqueMap.has(item.route)) {
      uniqueMap.set(item.route, item.lastModified);
    }
  }

  const sortedRoutes = Array.from(uniqueMap.entries()).sort(([a], [b]) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });

  return sortedRoutes.map(([route, lastModified]) => {
    const meta = getRouteMetadata(route);
    const cleanUrl = route === "/" ? baseUrl : `${baseUrl}${route}`;

    return {
      url: cleanUrl,
      lastModified,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });
}
