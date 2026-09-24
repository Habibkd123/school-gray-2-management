import School from "@/lib/models/School";
import connectDB from "@/lib/db";

// ─── Cache Entry Types ────────────────────────────────────────────────────────
interface SchoolCacheEntry {
  school_id:  string | null;
  meta_title: string;
  meta_desc:  string;
  meta_kw:    string;
  og_image:   string;
  favicon:    string;
  name:       string;
  subtitle:   string;
  logo_url:   string;
  canonical_url: string;
  google_site_verification: string;
  google_analytics_id: string;
  expiresAt:  number;
}

// ─── In-memory cache: subdomain/slug → full school data (TTL: 2s dev, 10m prod) ────────
const CACHE_TTL_MS    = process.env.NODE_ENV === "development" ? 2000 : 10 * 60 * 1000;
const MISS_CACHE_MS   = process.env.NODE_ENV === "development" ? 1000 : 60 * 1000;

const schoolCache = new Map<string, SchoolCacheEntry>();

/** Invalidate cached entry for a specific subdomain/slug, or clear all */
export function invalidateSchoolSlugCache(slug?: string): void {
  // Always clear all cached entries so all variants (subdomain, slug, id, custom_domain)
  // are refreshed immediately without any stale cache mismatch.
  schoolCache.clear();
}

// ─── Core DB fetch (called only on cache miss) ────────────────────────────────
async function fetchSchoolBySlug(slugKey: string): Promise<SchoolCacheEntry> {
  await connectDB();

  const school = await School.findOne({
    $or: [
      { subdomain:     slugKey },
      { slug:          slugKey },
      { custom_domain: slugKey },
    ],
  })
    .select("_id name subtitle logo_url meta_config")
    .lean();

  const now = Date.now();

  if (!school) {
    const miss: SchoolCacheEntry = {
      school_id: null, name: "", subtitle: "", logo_url: "", meta_title: "", meta_desc: "",
      meta_kw: "", og_image: "", favicon: "", canonical_url: "",
      google_site_verification: "", google_analytics_id: "",
      expiresAt: now + MISS_CACHE_MS,
    };
    schoolCache.set(slugKey, miss);
    return miss;
  }

  const meta = (school as any).meta_config ?? {};
  const entry: SchoolCacheEntry = {
    school_id:  (school as any)._id.toString(),
    name:       (school as any).name     ?? "",
    subtitle:   (school as any).subtitle ?? "",
    logo_url:   (school as any).logo_url ?? "",
    meta_title: meta.meta_title       ?? "",
    meta_desc:  meta.meta_description ?? "",
    meta_kw:    meta.meta_keywords    ?? "",
    og_image:   meta.og_image         ?? "",
    favicon:    meta.favicon_url      ?? "",
    canonical_url: meta.canonical_url ?? "",
    google_site_verification: meta.google_site_verification ?? "",
    google_analytics_id: meta.google_analytics_id ?? "",
    expiresAt:  now + CACHE_TTL_MS,
  };
  schoolCache.set(slugKey, entry);
  return entry;
}

// ─── Get cached school (hit or refresh) ──────────────────────────────────────
async function getCachedSchool(slugKey: string): Promise<SchoolCacheEntry> {
  const cached = schoolCache.get(slugKey);
  if (cached && cached.expiresAt > Date.now()) return cached;
  return fetchSchoolBySlug(slugKey);
}

// ─── Extract slug from headers / URL ───────────────────────────────────
function extractSlug(
  headersList: { get: (name: string) => string | null },
  urlStr?: string
): { schoolId: string | null; slug: string | null } {
  // Priority 0: x-school-id — set by middleware when no subdomain (plain localhost)
  const directId = headersList.get("x-school-id");
  if (directId) return { schoolId: directId, slug: null };

  // Priority 1: x-subdomain / x-custom-domain set by middleware
  const headerSub    = headersList.get("x-subdomain");
  const headerDomain = headersList.get("x-custom-domain");
  if (headerSub)    return { schoolId: null, slug: headerSub.trim().toLowerCase() };
  if (headerDomain) return { schoolId: null, slug: headerDomain.trim().toLowerCase() };

  // Priority 2: ?school_id= or ?school= in URL
  if (urlStr) {
    try {
      const url = new URL(urlStr, "http://localhost");
      const id  = url.searchParams.get("school_id");
      const sl  = url.searchParams.get("school") || url.searchParams.get("subdomain");
      if (id) return { schoolId: id, slug: null };
      if (sl) return { schoolId: null, slug: sl.trim().toLowerCase() };
    } catch { /* ignore */ }
  }

  // Priority 3: Host header (e.g. bajrang.myschoollife.in)
  const host = (headersList.get("host") || "").split(":")[0];
  if (host) {
    const parts = host.split(".");
    const ROOT  = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";
    if (host.endsWith(`.${ROOT}`) && parts.length >= 2) {
      const sub = parts[0];
      if (sub && sub !== "www") return { schoolId: null, slug: sub };
    }
    // subdomain.localhost (local dev)
    if (parts.length === 2 && parts[1] === "localhost" && parts[0] !== "localhost") {
      return { schoolId: null, slug: parts[0] };
    }
  }

  // Priority 4: Standalone mode fallback
  const isStandalone = process.env.NEXT_PUBLIC_IS_STANDALONE === "true";
  const standaloneSub = process.env.NEXT_PUBLIC_STANDALONE_SUBDOMAIN?.trim().toLowerCase();
  if (isStandalone && standaloneSub) {
    return { schoolId: null, slug: standaloneSub };
  }

  return { schoolId: null, slug: null };
}

// ─── Public API: resolve school_id only ──────────────────────────────────────
export async function resolveSchoolIdServer(
  headersList: { get: (name: string) => string | null },
  urlStr?: string
): Promise<string | null> {
  const { schoolId, slug } = extractSlug(headersList, urlStr);
  if (schoolId) return schoolId;
  if (slug)     return (await getCachedSchool(slug)).school_id;
  // No subdomain/custom-domain → no school context on this domain
  return null;
}

// ─── Public API: resolve full school meta (for layout.tsx generateMetadata) ───
export async function resolveSchoolMeta(
  headersList: { get: (name: string) => string | null }
): Promise<SchoolCacheEntry | null> {
  const { schoolId, slug } = extractSlug(headersList, undefined);

  if (slug)     return getCachedSchool(slug);
  if (schoolId) {
    // school_id given directly (rare) — try to find by _id
    await connectDB();
    const school = await School.findById(schoolId).select("_id name subtitle logo_url subdomain meta_config").lean();
    if (!school) return null;
    const key  = (school as any).subdomain || (school as any)._id.toString();
    const meta = (school as any).meta_config ?? {};
    const entry: SchoolCacheEntry = {
      school_id:  (school as any)._id.toString(),
      name:       (school as any).name     ?? "",
      subtitle:   (school as any).subtitle ?? "",
      logo_url:   (school as any).logo_url ?? "",
      meta_title: meta.meta_title       ?? "",
      meta_desc:  meta.meta_description ?? "",
      meta_kw:    meta.meta_keywords    ?? "",
      og_image:   meta.og_image         ?? "",
      favicon:    meta.favicon_url      ?? "",
      canonical_url: meta.canonical_url ?? "",
      google_site_verification: meta.google_site_verification ?? "",
      google_analytics_id: meta.google_analytics_id ?? "",
      expiresAt:  Date.now() + CACHE_TTL_MS,
    };
    schoolCache.set(key, entry);
    return entry;
  }
  return null;
}
