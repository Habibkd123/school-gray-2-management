/**
 * Website Sitemap — served at /sitemap.xml for each school subdomain.
 *
 * Covers only the public-facing website routes under /(website).
 * Dashboard routes are excluded — they live in the root sitemap.ts.
 */
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

// ── Fallback static route list ──────────────────────────────────────
const WEBSITE_ROUTES = [
  { route: "/",                           changeFreq: "weekly",  priority: 1.0 },
  { route: "/about",                      changeFreq: "monthly", priority: 0.8 },
  { route: "/about/history",              changeFreq: "monthly", priority: 0.6 },
  { route: "/about/infrastructure",       changeFreq: "monthly", priority: 0.6 },
  { route: "/about/management",           changeFreq: "monthly", priority: 0.6 },
  { route: "/about/vision-mission",       changeFreq: "monthly", priority: 0.6 },
  { route: "/academics",                  changeFreq: "monthly", priority: 0.8 },
  { route: "/academics/calendar",         changeFreq: "monthly", priority: 0.6 },
  { route: "/academics/class-structure",  changeFreq: "monthly", priority: 0.6 },
  { route: "/academics/curriculum",       changeFreq: "monthly", priority: 0.6 },
  { route: "/academics/faculty",          changeFreq: "monthly", priority: 0.6 },
  { route: "/admissions",                 changeFreq: "weekly",  priority: 0.9 },
  { route: "/admissions/apply",           changeFreq: "weekly",  priority: 0.8 },
  { route: "/admissions/documents",       changeFreq: "monthly", priority: 0.6 },
  { route: "/admissions/fee-structure",   changeFreq: "monthly", priority: 0.7 },
  { route: "/admissions/online-form",     changeFreq: "weekly",  priority: 0.8 },
  { route: "/contact",                    changeFreq: "monthly", priority: 0.7 },
  { route: "/gallery",                    changeFreq: "weekly",  priority: 0.7 },
  { route: "/gallery/photos",             changeFreq: "weekly",  priority: 0.6 },
  { route: "/gallery/videos",             changeFreq: "weekly",  priority: 0.6 },
  { route: "/news",                       changeFreq: "daily",   priority: 0.8 },
  { route: "/news/announcements",         changeFreq: "daily",   priority: 0.7 },
  { route: "/news/circulars",             changeFreq: "weekly",  priority: 0.6 },
  { route: "/news/results",               changeFreq: "weekly",  priority: 0.7 },
  { route: "/student-life",               changeFreq: "monthly", priority: 0.7 },
  { route: "/student-life/achievements",  changeFreq: "monthly", priority: 0.6 },
  { route: "/student-life/clubs",         changeFreq: "monthly", priority: 0.6 },
  { route: "/student-life/cultural",      changeFreq: "monthly", priority: 0.6 },
  { route: "/student-life/sports",        changeFreq: "monthly", priority: 0.6 },
] as const;

interface DiscoveredRoute { route: string; lastModified: Date; }

function discoverRoutes(dir: string, base = ""): DiscoveredRoute[] {
  const result: DiscoveredRoute[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        result.push(...discoverRoutes(path.join(dir, entry.name), `${base}/${entry.name}`));
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        const stat = fs.statSync(path.join(dir, entry.name));
        result.push({ route: base === "" ? "/" : base, lastModified: stat.mtime });
      }
    }
  } catch { /* filesystem not accessible */ }
  return result;
}

async function resolveBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const customDomain = h.get("x-custom-domain") ?? "";
    const subdomain    = h.get("x-subdomain") ?? "";
    const hostname     = h.get("host")?.split(":")[0] ?? "";
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
    const proto   = isLocal ? "http" : "https";
    if (customDomain) return `${proto}://${customDomain}`;
    if (subdomain && subdomain !== "www") {
      return `${proto}://${isLocal ? `${subdomain}.localhost` : `${subdomain}.${ROOT_DOMAIN}`}`;
    }
    if (hostname) return `${proto}://${hostname}`;
  } catch { /* outside request context */ }
  return `https://${ROOT_DOMAIN}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await resolveBaseUrl();
  const now = new Date();
  const websiteDir = path.join(process.cwd(), "app", "(website)");
  const discovered = discoverRoutes(websiteDir);

  const routeMap = new Map<string, { lastModified: Date; changeFreq: string; priority: number }>();

  if (discovered.length > 0) {
    for (const { route, lastModified } of discovered) {
      const meta = WEBSITE_ROUTES.find((r) => r.route === route);
      routeMap.set(route, { lastModified, changeFreq: meta?.changeFreq ?? "monthly", priority: meta?.priority ?? 0.5 });
    }
  } else {
    for (const { route, changeFreq, priority } of WEBSITE_ROUTES) {
      routeMap.set(route, { lastModified: now, changeFreq, priority });
    }
  }

  const sorted = Array.from(routeMap.entries()).sort(([a], [b]) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });

  return sorted.map(([route, { lastModified, changeFreq, priority }]) => ({
    url: route === "/" ? baseUrl : `${baseUrl}${route}`,
    lastModified,
    changeFrequency: changeFreq as MetadataRoute.Sitemap[0]["changeFrequency"],
    priority,
  }));
}