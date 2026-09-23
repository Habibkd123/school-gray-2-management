/**
 * Client-side subdomain resolution utilities.
 *
 * Single source of truth for detecting which school's subdomain
 * the browser is currently on — without relying on NEXT_PUBLIC_SCHOOL_ID.
 *
 * Priority:
 *  1. ?subdomain= query param (local dev testing)
 *  2. *.{ROOT_DOMAIN} production subdomain
 *  3. *.localhost local dev subdomain
 *  4. sm_subdomain cookie (set on login)
 *  5. sessionStorage cache (plain localhost dev)
 */

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

/** Returns the current school subdomain visible in the browser URL, or null. */
export function getClientSubdomain(): string | null {
  if (typeof window === "undefined") return null;

  // 1. ?subdomain= query param for local dev testing on plain localhost
  const params = new URLSearchParams(window.location.search);
  const devSubdomain = params.get("subdomain");
  if (devSubdomain) {
    try {
      sessionStorage.setItem("sm_active_subdomain", devSubdomain);
    } catch {}
    return devSubdomain;
  }

  const hostname = window.location.hostname;

  // 2. Production: bajrang.myschoollife.in → "bajrang"
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    if (sub && sub !== "www") return sub;
  }

  // 3. Local dev: bajrang.localhost → "bajrang"
  if (
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname.endsWith(".localhost")
  ) {
    const sub = hostname.slice(0, -".localhost".length);
    if (sub) return sub;
  }

  // 4. Standalone mode — main domain acts as a single school
  const standaloneSub = process.env.NEXT_PUBLIC_STANDALONE_SUBDOMAIN?.trim().toLowerCase();
  if (process.env.NEXT_PUBLIC_IS_STANDALONE === "true" && standaloneSub) {
    try {
      const cached = sessionStorage.getItem("sm_active_subdomain");
      if (cached && cached !== standaloneSub) {
        sessionStorage.removeItem("sm_active_subdomain");
      }
    } catch {}
    return standaloneSub;
  }

  // 5. sm_subdomain cookie (fallback for cookie-scoped session)
  try {
    const match = document.cookie.match(/(?:^|;\s*)sm_subdomain=([^;]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {}

  // 6. sessionStorage cache set during ?subdomain= dev session
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    try {
      const cached = sessionStorage.getItem("sm_active_subdomain");
      if (cached) return cached;
    } catch {}
  }

  return null;
}

/**
 * Fetches the school's MongoDB _id by subdomain slug.
 * Uses the public school-info API endpoint which is already subdomain-aware.
 */
export async function resolveSchoolIdBySubdomain(
  subdomain: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/public/school-info?subdomain=${encodeURIComponent(subdomain)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data?.id ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Returns the canonical host for a school subdomain.
 * Prevents duplicate domains like "myschoollife.myschoollife.in".
 *
 * Examples:
 * - "bajrang", isLocal=false -> "bajrang.myschoollife.in"
 * - "bajrang", isLocal=true  -> "bajrang.localhost"
 * - "myschoollife", isLocal=false -> "myschoollife.in"
 * - "myschoollife", isLocal=true  -> "localhost"
 */
export function getSubdomainHost(
  subdomain: string | null | undefined,
  isLocal = false
): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";
  const rootSlug = rootDomain.split(".")[0]?.toLowerCase();
  const standaloneSlug = process.env.NEXT_PUBLIC_STANDALONE_SUBDOMAIN?.trim().toLowerCase();

  const sub = subdomain?.trim().toLowerCase();

  if (
    !sub ||
    sub === "www" ||
    sub === rootSlug ||
    (process.env.NEXT_PUBLIC_IS_STANDALONE === "true" && sub === standaloneSlug)
  ) {
    return isLocal ? "localhost" : rootDomain;
  }

  return isLocal ? `${sub}.localhost` : `${sub}.${rootDomain}`;
}
