import School from "@/lib/models/School";
import connectDB from "@/lib/db";


interface CacheEntry {
  data: string | null;
  expiresAt: number;
}

// In-memory cache for slug -> school_id resolution (TTL: 10 minutes)
const SLUG_CACHE_TTL_MS = 10 * 60 * 1000;
const slugToIdCache = new Map<string, CacheEntry>();

/** Invalidate cached school ID for a specific slug or all slugs */
export function invalidateSchoolSlugCache(slug?: string): void {
  if (!slug) {
    slugToIdCache.clear();
    return;
  }
  slugToIdCache.delete(slug.trim().toLowerCase());
}

export async function resolveSchoolIdServer(
  headersList: { get: (name: string) => string | null },
  urlStr?: string
): Promise<string | null> {
  let schoolId: string | null = null;
  let schoolSlug: string | null = null;

  // 1. Parse URLSearchParams if urlStr is provided
  if (urlStr) {
    try {
      const url = new URL(urlStr, "http://localhost");
      schoolId = url.searchParams.get("school_id");
      schoolSlug = url.searchParams.get("school");
    } catch {
      // ignore
    }
  }

  // 2. Try to extract from Host header (subdomain)
  const host = headersList.get("host") || "";
  if (!schoolId && !schoolSlug && host) {
    const hostname = host.split(":")[0];
    const parts = hostname.split(".");
    // e.g. greenwood-academy.localhost:3000 -> ["greenwood-academy", "localhost"]
    if (parts.length > 1) {
      if (parts[parts.length - 1] === "localhost" && parts.length === 2) {
        schoolSlug = parts[0];
      } else if (parts.length >= 3) {
        schoolSlug = parts[0];
      }
    }
  }

  // 3. Try to extract from Referer header (subdomains or query params of the parent browser page)
  const referer = headersList.get("referer");
  if (!schoolId && !schoolSlug && referer) {
    try {
      const refUrl = new URL(referer);
      schoolId = refUrl.searchParams.get("school_id");
      schoolSlug = refUrl.searchParams.get("school");

      if (!schoolId && !schoolSlug) {
        const refHostname = refUrl.hostname;
        const parts = refHostname.split(".");
        if (parts.length > 1) {
          if (parts[parts.length - 1] === "localhost" && parts.length === 2) {
            schoolSlug = parts[0];
          } else if (parts.length >= 3) {
            schoolSlug = parts[0];
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Resolve slug to school_id
  if (schoolId) {
    return schoolId;
  }
  if (schoolSlug) {
    const slugKey = schoolSlug.trim().toLowerCase();
    const cached = slugToIdCache.get(slugKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    await connectDB();
    const school = await School.findOne({ slug: slugKey }).select("_id").lean();
    const resolvedId = school ? school._id.toString() : null;

    slugToIdCache.set(slugKey, {
      data: resolvedId,
      expiresAt: now + (resolvedId ? SLUG_CACHE_TTL_MS : 60 * 1000),
    });

    if (resolvedId) {
      return resolvedId;
    }
  }

  // 5. Fallback to environment variable
  return process.env.NEXT_PUBLIC_SCHOOL_ID || null;
}
